angular.module('omniboard.Expressions.states', [ 'ui.codemirror' ])
.factory('expressionData', function(){
	return {
		data: null,
		setData: function(name){
			var savedAt = new Date();
			this.data = {Name: name, time: savedAt};
		},
		getData: function(){
			return this.data;
		},
		clearData: function(){
			this.data = null;
		}
	};
})
.config(['$stateProvider', function($stateProvider) {
	var expressionEdit = {
		name: 'auth.expressionEdit',
		url: '/expressions/edit/:name',
		templateUrl: 'Expressions/templates/index.tpl.html',
		controller: 'ExpressionsCtrl',
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}],
			locks: ['Locks', function(Locks) {
				return Locks.verify();
			}]
		},
		data: {
			dataModelName: "default",
			title: 'Expression Edit',
			displayGroup: "Expressions",
			displayName: "Expression Edit",
			description: "Edit expression rules.",
			subHeading: "Edit Expression"
		}
	};

	var expressionList = {
		name: 'auth.expressionList',
		url: '/expressions',
		templateUrl: 'Expressions/templates/list.tpl.html',
		controller: 'ExpressionListCtrl',
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			dataModelName: "default",
			title: 'Expressions',
			displayGroup: "Expressions",
			displayName: "Expressions",
			description: "List available expressions.",
			subHeading: "List Expressions"
		}
	};	

	$stateProvider
		.state(expressionEdit)
		.state(expressionList)
	;
}])

.directive('queryCollection', [function () {
	return {
		restrict: "E",
		replace: true,
		scope: {
			queryCollection: '='
		},
		template: "<ul class='fa-ul'><query ng-repeat='query in queryCollection' parent-queries='queryCollection' query='query'></query></ul>"
	};
}])

.directive('query', ['$compile', function ($compile) {
	return {
		restrict: "E",
		replace: true,
		scope: {
			query: '=',
			parentQueries: '='
		},
		templateUrl: "Expressions/templates/query.tpl.html",
		link: function (scope, element, attrs) {
			var queryCollectionSt = '<query-collection query-collection="query.queries"></query-collection>';
			scope.$watch('query.queries', function(oldValue, newValue) {
				if (angular.isArray(scope.query.queries)) {  
					$compile(queryCollectionSt)(scope, function(cloned, scope) {
						element.append(cloned); 
					});
				}				
			});
		},
		controller: ["$scope", "$element", "$attrs", "DataModels", "$rootScope", function($scope, $element, $attrs, DataModels, $rootScope) {
			$scope.models = DataModels.names().$asObject();
			$scope.newQuery = { query: {} };

			$scope.loadModelTypes = function(modelName) {
				if ($scope.query && !$scope.query.query) { $scope.query.query = {}; }
				$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
				$scope.modelProps = DataModels.getModelForm(modelName).$asObject();
			};	

			// Never used. May be someone left it so ...
			$scope.setModelType = function(modelName, modelType) {

			};

			$scope.addQuery = function() {
				if ($scope.query && $scope.newQuery) {
					if (Object.keys($scope.newQuery.query).length > 0) {
						$scope.newQuery.modelTypeName = $scope.modelTypes[$scope.newQuery.query[$scope.newQuery.modelName + "Type"]].Name;
					}

					if (!$scope.query.queries) { $scope.query.queries = []; }			

					if ($scope.newQuery.valueProp) {
						var s = [];
						var hexDigits = "0123456789abcdef";
						for (var i = 0; i < 36; i++) {
							s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
						}
						s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
						s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
						s[8] = s[13] = s[18] = s[23] = "-";
						$scope.newQuery.operandKey = s.join("");
						$rootScope.$broadcast("expression:operand", $scope.newQuery);
					} 

					$scope.query.queries.push($scope.newQuery);
				}

				//Reset Form		
				$scope.newQuery = { query: {} };
				$scope.modelTypes = {};
				$scope.modelProps = {};		
			};

			$scope.removeQuery = function() {
				$scope.parentQueries.splice($scope.parentQueries.indexOf($scope.query), 1);
			};

			$scope.addOperandToExpression = function() {
				$rootScope.$broadcast("expression:operand:insert", $scope.query);
			};		
		}]		
	};
}])

.controller('ExpressionListCtrl', ['$scope', 'Expressions', '$state', 'expressionData', 'omniNavSettings', function($scope, Expressions, $state, expressionData, omniNavSettings) {

	$scope.expressions = Expressions.getExpressionNames().$asObject();
	$scope.savedData = angular.copy( expressionData.getData() );
	expressionData.clearData();
	$scope.goToExpression = function(name) {
		$state.go("auth.expressionEdit", { name: name});
	};
}])

.controller('ExpressionsCtrl', ['$scope', 'DataModels', '$q', 'Expressions', '$rootScope', '$state', '$stateParams', '$timeout', 'locks', 'expressionData', function($scope, DataModels, $q, Expressions, $rootScope, $state, $stateParams, $timeout, locks, expressionData) {

	// Get Predefined Expressions
	$scope.predefinedSaved = false;
	$scope.predefinedExpressions = Expressions.getPredefinedExpressions().$asObject();

	$scope.loadPreDefined = function(fn){
		$scope.fn.fnStr = $scope.fn.fnStr + '\n' + $scope.predefinedExpressions[fn].function;
	};
	
	$scope.savePredefined = function(){
		Expressions.savePredefinedExpressions($scope.expressionName, $scope.fn.fnStr);
		$scope.predefinedSaved = true;
	};

	$scope.lockData = locks;

	// Objects to Populate Form Selects
	$scope.models = DataModels.names().$asObject();
	$scope.modelTypes = {};
	$scope.modelProps = {};
	$scope.operands = {};
	$scope.editorReady = false;
	$scope.alerts = [];
	$scope.base = {};

	// Object for Form
	$scope.sq = { query: {} };

	if ($stateParams.name) {
		$scope.expressionName = $stateParams.name;
		$scope.isEdit = true;
		var fbExpression = Expressions.getExpression($stateParams.name).$asObject();
		fbExpression.$loaded().then( 
			function(data) {
				$scope.pane = 1;
				if(data.type){
					$scope.expressionType = data.type;
					$scope.loadExpressionTypeCategories($scope.expressionType);
					
					if(data.category){
						$scope.expressionTypeCategory = data.category;
						$scope.notificationProfile = Expressions.getNoficationProfile(data.type, data.category);
					}
				}
				
				if(data.query){
					$scope.base['modelName'] = data.query.modelName;
					$scope.loadModelTypes(data.query.modelName, $scope.base);
					$scope.query = data.query;
					$scope.base.query = {};
					
					angular.forEach($scope.modelTypes, function(snapshot, id){
						if(snapshot.Name == data.query.modelTypeName){
							$scope.base.query[data.query.modelName + 'Type'] = id;
						}
					});
				}
				
				$scope.fn = {
					fnStr: data.fn
				};

				if (data.operands && Object.keys(data.operands).length > 0) {
					$scope.operands = data.operands;
					
					$timeout(function() { 
						$scope.markCode("this.val =", "return", "label label-success", true);
						angular.forEach(data.operands, function(label, operandKey) {
							var operand = " this.operands['" + operandKey + "'].value ";
							$scope.markCode(operand, label, "label label-info", false);
						});
					}, 250);
				}
			}
		);

	} else {
		$scope.isEdit = false;
		$scope.query = null;		
		$scope.fn = {
			fnStr: 'this.val = true;'
		};		
	}

	// Never used. May be someone left it so ...
	$rootScope.$on("expression:operand", function(event, q) {

	});

	$rootScope.$on("expression:operand:insert",	function(event, query) {
		$scope.cm.focus();

		var from = $scope.cm.getCursor();
		var label = query.modelName + "(" + query.modelTypeName + ")." + query.valueProp;
		var operand = " this.operands['" + query.operandKey + "'].value ";

		if (!$scope.operands[query.operandKey]) { 
			$scope.operands[query.operandKey] = label;
		}

		$scope.cm.replaceRange(operand, from);
		var marker = $scope.markCode(operand, label, "label label-info");
	});

	$scope.markCode = function(findText, replaceText, className, readOnly) {
		var cm = $scope.cm;
		var lastMarker;

		var elt = cm.state.placeholder = document.createElement("span");
		elt.className = className;
		elt.appendChild(document.createTextNode(replaceText));

		cm.eachLine(function(lineHandle) {
			var startIndex = 0;
			var lineText = lineHandle.text;
			var lineLen = lineText.length;
			var lineNum = cm.getLineNumber(lineHandle);
			var index;
			var indices = [];

			while ((index = lineText.indexOf(findText, startIndex)) > -1) {
				indices.push(index);
				startIndex = index + lineLen;
			}

			angular.forEach(indices, function(ch) {
				var from = { line: lineNum, ch: ch };
				var to = { line: lineNum, ch: ch + findText.length };
				lastMarker = cm.markText(from, to, {
					replacedWith: elt,
					atomic: true,
					clearWhenEmpty: false,
					readOnly: readOnly
				});				
			});
		});

		return lastMarker;		
	};

	// Configure CodeMirror Plugin
	$scope.editorOptions = {
		lineWrapping : false,
		lineNumbers: true,
		mode: 'javascript',
		theme: 'midnight',
		onLoad : function(cm){
			$scope.cm = cm;
		}
	};

	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);
	};	

	$scope.savedNofication = false;

	$scope.saveNotification = function(){
		if($scope.notificationProfile){
			if(!$scope.notificationProfile.Email && !$scope.notificationProfile.SMS){
				$scope.alerts.push({type:"warning", msg: "Please enter email and phone number."});
			}else if(!$scope.notificationProfile.Email){
				$scope.alerts.push({type:"warning", msg: "Please enter email."});
			}else if(!$scope.notificationProfile.SMS){
				$scope.alerts.push({type:"warning", msg: "Please enter phone number."});
			}else{
				$scope.notificationProfile.update({Email: $scope.notificationProfile.Email, SMS: $scope.notificationProfile.SMS},
					function(error) {
						if(error){
							$scope.alerts.push({type:"danger", msg: "Your notification profile could not be saved."});
						}else{
							$scope.savedNofication = true;
							$scope.alerts.push({type:"success", msg: "Your settings have been applied."});
						}
					}
				);
			}
		}else{
			if(!$scope.expressionType && !$scope.expressionTypeCategory){
				$scope.alerts.push({type:"warning", msg: "Please set expression type and expression category."});
			}else if(!$scope.expressionType){
				$scope.alerts.push({type:"warning", msg: "Please set expression type."});
			}else if(!$scope.expressionTypeCategory){
				$scope.alerts.push({type:"warning", msg: "Please set expression category."});
			}
		}
	};

	$scope.save = function() {
		$scope.alerts = [];
		$scope.saving = true;

		Expressions.updateKey();

		if($scope.fn.fnStr){
			$scope.fn.fnStr = $scope.fn.fnStr + " ";
		}

		// No need to validate below function parameters because save button is disabled until they are set.
		Expressions.saveExpression($scope.expressionName, $scope.expressionType, $scope.expressionTypeCategory, angular.copy($scope.query), $scope.fn.fnStr, angular.copy($scope.operands), $scope.isEdit).
		then(
			function() {
				$scope.saving = false;

				expressionData.setData($scope.expressionName);

				$scope.alerts.push({type:"success", msg: "Expression '" + $scope.expressionName + "' has been saved."});
				$state.go('auth.expressionList');
			},
			function(err) {
				$scope.saving = false;
				$scope.alerts.push({type:"danger", msg: err});
			}
		);
	};

	$scope.loadModelTypes = function(modelName, base) {
		if (base && !base.query) { base.query = {}; }
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.modelProps = DataModels.getModelForm(modelName);
	};	

	// Never used. May be someone left it so ...
	$scope.setModelType = function(modelName, modelType) {
	};

	$scope.loadExpressionTypeCategories = function(type) {
		if (type) {
			$scope.expressionTypeCategories = Expressions.getExpressionTypeCategories(type).$asObject();
		}
	};

	$scope.pane = 0;

	$scope.nextPane = function(){
		if($scope.pane < 3){
			$scope.pane++;
		}
	};

	$scope.previousPane = function(){
		if($scope.pane > 0){
			$scope.pane--;
		}
	};

	// No validation has been added to this function since the button is hidden until all the models are set.
	$scope.setBaseModel = function(sq, expressionName, expressionType, expressionTypeCategory) {
		$scope.expressionName = expressionName;
		$scope.expressionType = expressionType;
		$scope.expressionTypeCategory = expressionTypeCategory;

		$scope.query = angular.copy(sq);

		if(expressionType && expressionTypeCategory){
			$scope.notificationProfile = Expressions.getNoficationProfile(expressionType, expressionTypeCategory);
		}
		
		if(!$scope.query){
			return;
		}

		if (!$scope.query.query) { $scope.query.query = {}; }

		if ((Object.keys($scope.query.query).length > 0) && $scope.modelTypes[sq.query[sq.modelName + 'Type']] && $scope.modelTypes[sq.query[sq.modelName + 'Type']].Name) {
			$scope.query.modelTypeName = $scope.modelTypes[sq.query[sq.modelName + "Type"]].Name;
		}		

		if(sq.modelName){
			if($scope.query.modelTypeName){
				$scope.alerts.push({type:"success", msg: sq.modelName + " of type " + $scope.query.modelTypeName + " has been set as base model."});
			}else{
				$scope.alerts.push({type:"success", msg: sq.modelName + " has been set as base model."});
			}
		}else{
			$scope.alerts.push({type:"success", msg: "No base model set."});
		}

		$scope.nextPane();

		//Reset Form
		/*
		$scope.sq = { query: {} };
		$scope.modelTypes = {};
		$scope.modelProps = {};
		*/
	};
	
	// Never used. May be someone left it so ...
	$scope.addQuery = function(sq, query, popover) {
		if (query && sq) {
			if (Object.keys(sq.query).length > 0) {
				sq.modelTypeName = $scope.modelTypes[sq.query[sq.modelName + "Type"]].Name;
			}

			if (!query.queries) { query.queries = []; }			

			query.queries.push(sq);
		}

		if (popover) {
			popover.$hide();
		}

		//Reset Form		
		$scope.sq = { query: {} };
		$scope.modelTypes = {};
		$scope.modelProps = {};		
	};

	$scope.process = function() {
		$scope.working = true;
		$scope.processQuery($scope.query, null, "", $scope.fn, null).then(
			function(data) {
				$scope.working = false;
				$scope.processedData = data;
			},
			function(err) {
				$scope.working = false;				
			}
		);
	};
}])
;
