angular.module('omniboard.expression-widget', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('expression', {
		title: 'Expression',
		description: 'Displays the value of all expressions',
		controller: 'expressionCtrl',
		templateUrl: 'expression-widget/expression.tpl.html',
		edit: {
			templateUrl: 'expression-widget/edit.tpl.html',
			reload: false,
			controller: 'expressionEditCtrl'
		}
	});
})

.controller('expressionCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $stateParams, $filter, formatter){
	$scope.dataLoaded = false;
	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}

	$scope.formatData = function( data ){
		if ( !isNaN(parseFloat(data))) {
			return $filter('number')(data, config.fractionSize);
		} else {
			return data;
		}
	};


	$scope.dataKey = config.modelType;

	if (config.useScope) {
		$scope.returnedData = [];
		if ($scope.scopeModel && $scope.scopeId) { 
			var allPointData = DataModels.getItem($scope.scopeModel, $scope.scopeId);

			allPointData.$loaded().then(function(){
				$scope.returnedData.push(allPointData);
			});

			config.showMin= false;
			config.showMax= false;

			$scope.$watch("returnedData[0].expressions.values.cv.Performance", function(newVal, oldVal){

				if(newVal !== undefined && newVal[config.expressionProp] !== undefined && newVal[config.expressionProp].Value !== undefined){

					if(newVal[config.expressionProp].Value <= config.minValue){
						$scope.config.showMin = true;
						$scope.config.showMax = false;
						$scope.config.showValue = false;
					}else if (newVal && newVal[config.expressionProp].Value >=  config.maxValue ){
						$scope.config.showMax = true;
						$scope.config.showValue = false;
						$scope.config.showMin = false;
					}else{
						$scope.config.showValue = true;
						$scope.config.showMax = false;
						$scope.config.showMin = false;
					}
				}
			});

			allPointData.$relationsPromise.then(
				function(ok){
					$scope.dataLoaded = true;
					$scope.dataLoadedError = false;
				},
				function(err){
					$scope.dataLoadedError = true;
					$scope.dataLoaded = true;
				}
			);
		} else {
			$scope.dataLoaded = true;
			$scope.dataLoadedError = true;
		}
	} else {
		$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
			if( data ){
				$scope.returnedData = data[0];
				$scope.returnedData.$loaded().then(function(){
					config.showMin= false;
					config.showMax= false;

					$scope.$watch("returnedData.Value", function(newVal, oldVal){
						if(parseFloat(newVal) <= config.minValue){
							$scope.config.showMin = true;
							$scope.config.showMax = false;
							$scope.config.showValue = false;
						}else if(parseFloat(newVal) >=  config.maxValue ){
							$scope.config.showMax = true;
							$scope.config.showValue = false;
							$scope.config.showMin = false;
						}else{
							$scope.config.showValue = true;
							$scope.config.showMax = false;
							$scope.config.showMin = false;
						}
					});

					$rootScope.$on('timeLoaded',function(evt,data){
						var offset = data.isDST ? data.dstOffset : data.gmtOffset,
							lastModified = angular.isArray($scope.returnedData) ? $scope.returnedData[$scope.returnedData.length-1].data : $scope.returnedData.lastModified;
						$scope.localUpdatedTime = formatter.filterDateString(lastModified, offset);
					});

					$scope.dataLoaded = true;
					$scope.dataLoadedError = false;
				});
			} else {
				$scope.dataLoadedError = true;
				$scope.dataLoaded = true;
			}
		});
	}

	$rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
	}); 

	$scope.getDisplayValue = function(model, valueProp) {
		var value = $scope.getValue(model, valueProp);
		if(config.displayValues && config.displayValues[value]){
			return config.displayValues[value];
		}else{
			return value;
		}
	};

	$scope.getValue = function(data, prop) {
		var val = data;
		var keys = prop.split(".");
		var key = keys.shift();

		while (key && val) {
			val = val[key];
			key = keys.shift();
		}
		return val;
	};
})

.controller('expressionEditCtrl', function($scope, es, $rootScope, DataModels, Expressions, $stateParams){
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

	$scope.getPropertyValue = function(prop) {
		if (prop.component == "select") {
			return "$" + prop.label + ".Name";
		} else {
			return prop.label;
		}
	};

	$scope.getValue = function(data, prop) {
		var val = data;
		var keys = prop.split(".");
		var key = keys.shift();

		while (key && val) {
			val = val[key];
			key = keys.shift();
		}
		return val;
	};	


	if(!$scope.config.displayValues){
		$scope.config.displayValues = {};
	}

	$scope.deleteDisplayValue = function(key) {
		delete $scope.config.displayValues[key];
	};

	$scope.addDisplayValue = function(key, value) {
		$scope.config.displayValues[key] = value;
	};
	if(!$scope.config.useScope){
		$scope.config.useScope = true;
	}

	if(!$scope.config.modelName){
		$scope.config.modelName = "Point";
	}

	if(!$scope.config.valueProp){
		$scope.config.valueProp = "Value";
	}

	if(!$scope.config.labelProp){
		$scope.config.labelProp = "Name";
	}

	if($scope.config.showLabel === undefined){
		$scope.config.showLabel = true;
	}

	if($scope.config.showValue === undefined){
		$scope.config.showValue = true;
	}

	if($scope.config.showModel === undefined){
		$scope.config.showModel = true;
	}

	if(!$scope.config.myLabelSize){
		$scope.config.myLabelSize = "1em";
	}

	if(!$scope.config.myLabelColor){
		$scope.config.myLabelColor = "text-muted";
	}

	if(!$scope.config.textTitleLabel){
		$scope.config.textTitleLabel = "slick";
	}

	if(!$scope.config.myValueSize){
		$scope.config.myValueSize = "1.5em";
	}

	if(!$scope.config.myValueColor){
		$scope.config.myValueColor = "text-primary";
	}

	if(!$scope.config.textTitleValue){
		$scope.config.textTitleValue = "slick";
	}

	if(!$scope.config.myModelColor){
		$scope.config.myModelColor = "text-info";
	}

	if(!$scope.config.textTitleValue){
		$scope.config.textTitleValue = "slick";
	}

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = "5";
	}

	$scope.loadModelTypes = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.expressionNames = Expressions.getExpressionNames().$asObject();
		//$scope.labelProps = DataModels.getModelForm(modelName);
		//$scope.valueProps = DataModels.getModelForm(modelName);
	};

	$scope.setModelType = function(modelName, modelType) {
		$scope.config.query[0].properties[modelName + "Type"] = modelType;
	};

	if ($scope.config.modelName) {
		$scope.loadModelTypes($scope.config.modelName);
	}

	if ($scope.config.modelName && $scope.config.modelType) {
		$scope.setModelType($scope.config.modelName, $scope.config.modelType);
	}
});
