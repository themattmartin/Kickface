/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.rulesEngine.states", ['platypus.jsonviewer'])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var main = {
		name: 'auth.rulesEngine',
		abstract: true,
		url: '/rulesEngine',
		templateUrl: 'rulesEngine/templates/rulesEngine.tpl.html',
		controller: 'rulesEngineCtrl'
	};		

	var newRule = {
		name: 'auth.rulesEngineNewRule',
		url: '/rulesEngine/newRule', 
		templateUrl: 'rulesEngine/templates/newRule.tpl.html', 
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		controller: 'rulesEngineNewCtrl',
		data: {
			title: 'Rules Engine'
		}
	};

	$stateProvider
		.state(main)
		.state(newRule)
	;

}])


/**
 * Controller
 */
.controller('rulesEngineNewCtrl', ['$scope', '$stateParams', '$state', '$modal', '$popover', '$tooltip', '$rootScope','Perms', '$http','omniNavSettings', 'DataModels', "FirebaseRootRef", "alarmFormatter", "Settings", "es", "$window", function($scope, $stateParams, $state, $modal, $popover, $tooltip, $rootScope, Perms, $http, omniNavSettings, DataModels, FirebaseRootRef, alarmFormatter, Settings, es, $window) {
	$scope.updateModelRule = null;
	$scope.showExpressions = false;

	$scope.mapInfo = false;
	$scope.relationsInfo = false;
	$scope.rulesInfo = false;

	$scope.showMapInfo = function(){
		$scope.mapInfo = true;
	};

	$scope.hideMapInfo = function(){
		$scope.mapInfo = false;
	};

	$scope.showRelationsInfo = function(){
		$scope.relationsInfo = true;
	};

	$scope.hideRelationsInfo = function(){
		$scope.relationsInfo = false;
	};

	$scope.showRulesInfo = function(){
		$scope.rulesInfo = true;
	};

	$scope.hideRulesInfo = function(){
		$scope.rulesInfo = false;
	};

	$scope.addNewRule = function() {
		var modalScope = $scope.$new();
		modalScope.modelNames = DataModels.getAllModelNames().$asObject();
		modalScope.showModelTypes = false;
		modalScope.showModelItems = false;
		modalScope.showConfirm = false;
		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/startNewRule.tpl.html'
		});

		modalScope.loadModelTypes = function(modelName) {
			if (modelName) { 
				modalScope.modelName = modelName;
				modalScope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
				modalScope.showModelTypes = true;
			}
		};

		modalScope.getItem = function(modelName, modelType){

			var queryObj = {};
			if (modelType) { queryObj[modelName+'Type'] = modelType; }
			if (modelName === 'Point' && $rootScope.userSites) {
				queryObj['Site'] = Object.keys($rootScope.userSites);
			}

			DataModels.fetchFilteredDate(modelName,queryObj).then(function (searchResults){
				if (modelName === 'Site' && $rootScope.userSites) {
					var filteredItems=[];
					angular.forEach(searchResults,function(item) {
						if ($rootScope.userSites[item._id]) {
							filteredItems.push(item);
						}
					});
					searchResults = filteredItems;
				}
				modalScope.modelItems = searchResults;
				modalScope.showModelItems = true;
			});
		};

		modalScope.selectItem = function(modelItem){

			modalScope.selectedModelItem = modalScope.modelItems[modelItem];
			modalScope.showConfirm = true;
		};

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		modalScope.confirm = function(modelType) {
			// https://publicdata-transit.firebaseio.com/sf-muni/.json?print=pretty&format=export&download=publicdata-transit-sf-muni-export.json
			modalScope.ruleRef = DataModels.getModelItemRef(modalScope.modelName+'Type', modalScope.selectedModelItem[modalScope.modelName+'Type']);
			modalScope.ruleRef.once('value', function(dataSnap){
				if( dataSnap.val().import ){
					$scope.importObject = dataSnap.val().import;
				} else {
					$scope.importObject = {};
					$scope.importObject.map = {};
					$scope.importObject.relations = {};
					$scope.importObject.rules = {};
				}
				$scope.updateModelRule = {model: modalScope.modelName+'Type', item: modalScope.selectedModelItem[modalScope.modelName+'Type']};
				$scope.getJSON(modalScope.selectedModelItem.IP);
				modalScope.closeDialog();
			});
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};	
	$scope.addNewRule();

	$scope.save = function(){
		// do something with the data 
		//CLEANUP data
		var cleanRule = angular.copy( $scope.importObject);
		var ruleRef = DataModels.getModelItemRef($scope.updateModelRule.model, $scope.updateModelRule.item);
		var importRef = ruleRef.child('import');
		importRef.update(cleanRule);

		var user = $rootScope.loginService.getCurrentUser();
		if( user) {
			ruleRef.update({ lastModified: Firebase.ServerValue.TIMESTAMP, User: user.uid });
		}

	};

	$scope.removeRule = function(key1,key2,key3,key4){
		$scope.importObject.rules[key1][key2].splice(key3);
	};
	$scope.removeRelation = function(key1){
		delete $scope.importObject.relations[key1];
		//$scope.importObject.rules[key1][key2].splice(key3);
	};

	$scope.getJSON = function(url){
		$http({method: 'GET', url: '/fetchJSON?url=' + url}).
		success(function(processedData, status, headers, config) {
			$scope.pData = processedData;
			$scope.jsonData = JSON.stringify(processedData);
			if( Object.keys( $scope.importObject.rules ).length <= 0 ){
				$scope.topLevelKeys = Object.keys(processedData);
				angular.forEach( $scope.topLevelKeys, function(val,id){
					$scope.importObject.rules[val] = {};
				});
			}
		}).
		error(function(data, status, headers, config) {
			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;
		});
	};

	$scope.addRule = function(ruleName,ruleType) {
		var modalScope = $scope.$new();
		modalScope.ruleName = ruleName;
		modalScope.ruleType = ruleType;
		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/modalAddRule.tpl.html'
		});

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		modalScope.confirm = function(ruleKey,ruleExp) {
			var obj = {};
			obj[ruleKey] = ruleExp;

			$scope.importObject.rules[modalScope.ruleName][modalScope.ruleType].push( obj );
			modalScope.closeDialog();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};

	$scope.addType = function(ruleKey) {
		var modalScope = $scope.$new();
		modalScope.ruleKey = ruleKey;

		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/modalAddType.tpl.html'
		});

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		modalScope.confirm = function(ruleType) {
			$scope.importObject.rules[modalScope.ruleKey][ruleType] = [];
			modalScope.closeDialog();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};	

	$scope.addMap = function() {
		var modalScope = $scope.$new();

		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/modalAddMap.tpl.html'
		});

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		modalScope.confirm = function(mapKey,mapExp) {
			var obj = {};
			obj[mapKey] = mapExp;
			$scope.importObject.map = obj;
			modalScope.closeDialog();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};	

	$scope.addRelationType = function() {
		var modalScope = $scope.$new();

		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/modalAddRelationType.tpl.html'
		});

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		modalScope.confirm = function(relationName) {
			$scope.importObject.relations[relationName] = {};
			modalScope.closeDialog();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};	

	$scope.addRelations = function(relation) {
		var modalScope = $scope.$new();
		modalScope.relation = relation;
		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/modalAddRelations.tpl.html'
		});

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		modalScope.confirm = function(ruleKey,ruleExp) {
			var obj = {};
			obj[ruleKey] = ruleExp;

			$scope.importObject.relations[modalScope.relation] = obj;
			modalScope.closeDialog();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};

	$scope.createExpression = function(ruleId,type,rule,ruleKey,ruleExp) {
		var modalScope = $scope.$new();
		modalScope.ruleId = ruleId;
		modalScope.type = type;
		modalScope.rule = rule;
		modalScope.ruleKey = ruleKey;
		modalScope.ruleExp = ruleExp;
		modalScope.possibleMatches = null;
		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'rulesEngine/templates/regExBuilder.tpl.html'
		});

		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};

		//strText = "Tyler Bowler";
		modalScope.checkForMatch = function(str,reg){
			var re = new RegExp(reg, "g");
			var t;
			if( re.test(str) ){
				t = true;
			} else {
				t = false;
			}
			return t;
		};

		modalScope.addChr = function(){		
			modalScope.regularExpression.push( modalScope.expressionTypes.char );
		};

		modalScope.addSpace = function(){		
			modalScope.regularExpression.push( modalScope.expressionTypes.space );
		};

		modalScope.addWord = function(){	
			modalScope.regularExpression.push( modalScope.expressionTypes.word );
		};

		modalScope.regularExpression = [];
		modalScope.expressionTypes = {
			"exact": '',
			"char" : '(\\D)',
			"word" : '((?:[a-z][a-z]+))',
			"space": '(\\s+)',
			"one number": '((?:\\d))',
			"any numbers": '^(\\d+)$'
		};

		modalScope.getValidExpressions = function(str){
			modalScope.expressionTypes.exact = str;

			var returnObj = { searches: {}, matches: {} };
			angular.forEach(modalScope.expressionTypes, function(val, id){
				if( modalScope.checkForMatch(str, val) ) {
					var reg = '/'+val+'/m';
					returnObj.searches[id] = val;
					returnObj.matches[id] = str.split(reg);
				}
			});
			modalScope.possibleMatches = returnObj;
			modalScope.allWords = str.split(' ');
		};

		modalScope.confirm = function() {
			// do something with the data
			$scope.importObject.rules[modalScope.ruleId][modalScope.type][modalScope.rule][modalScope.ruleKey] = modalScope.regularExpression.join('.');
			modalScope.closeDialog();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			modalScope.closeDialog();
		});
	};

	//scope.validExpressions = getValidExpressions(scope.stringToTest);


}])

.controller('rulesEngineCtrl', ['$scope', '$stateParams', '$state', '$modal', '$rootScope','Perms', '$http','omniNavSettings', 'DataModels', "FirebaseRootRef", "alarmFormatter", "Settings", "es", "$window", function($scope, $stateParams, $state, $modal, $rootScope, Perms, $http, omniNavSettings, DataModels, FirebaseRootRef, alarmFormatter, Settings, es, $window) {
	
}])
;