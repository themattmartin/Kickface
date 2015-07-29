angular.module('omniboard.badge', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('badge', {
		title: 'Badge',
		description: 'Displays the value of any model property',
		controller: 'badgeCtrl',
		templateUrl: 'badge/badge.tpl.html',
		edit: {
			templateUrl: 'badge/edit.tpl.html',
			reload: false,
			controller: 'badgeEditCtrl'
		}
	});
})

.controller('badgeCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $filter, $stateParams, $interval, pageLevelData){
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

	//PointStatus
	var pointStatus = DataModels.getModelItemsRef('PointStatus');
	pointStatus.once('value',function(dataSnap){
		$scope.allPointStatus = dataSnap.val();
	});
	//PointType
	var pointType = DataModels.getModelItemsRef('PointType');
	pointType.once('value',function(dataSnap){
		$scope.allPointType = dataSnap.val();
	});
	

	$scope.dataKey = config.modelType;

	if (config.useScope) {
		$scope.returnedData = [];

		if ($scope.scopeModel && $scope.scopeId) { 
			var allPointData = DataModels.getItem($scope.scopeModel, $scope.scopeId);
			//$scope.returnedData.push(allPointData);
			$scope.returnedData = $scope.formatData( $scope.getDisplayValue(allPointData, config.valueProp ) );
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
		if( $scope.key.toString().indexOf(':') !== 0){
			var originalKey = angular.copy($scope.key.toString());
			$scope.widgetKeys = originalKey.split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}

		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);
			if( typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;

				angular.forEach(data, function(fbRef,id){
					fbRef.$loaded().then(function(refData){
						if( $scope.widgetKeys.length === 1){
							fbData = refData;
						} else {
							if( refData.Gateway == $scope.widgetKeys[2]){
								fbData = refData;
							}
						}

						$scope.returnedData = fbData;
						$scope.returnedDataVal = $scope.getValue(fbData, config.labelProp);	
						$scope.dataLoaded = true;
						$scope.dataLoadedError = false;

						fbRef.$watch(function(evt){
							if (refData !== undefined && refData.$id == evt.key) {
								refData.$PointStatus = $scope.allPointStatus[refData.PointStatus];
								refData.$PointStatus.$id = refData.PointStatus;
								refData.$PointType = $scope.allPointType[refData.PointType];
								refData.$PointType.$id = refData.PointType;
								$scope.returnedData = refData;
								$scope.returnedDataVal = $scope.getValue(refData, config.labelProp);
							}
						});

					});

				});

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
			}
		}, 750, 80);

		/*
		$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
			if( data ){
				$scope.returnedData = data[0];
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
				$scope.dataLoaded = true;
			}
		});
*/
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

.controller('badgeEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams){
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

	if(!$scope.config.modelName){
		if ($scope.config.useScope) {
			$scope.config.modelName = $scope.scopeModel;
		} else { 
			$scope.config.modelName = "Point";
		}
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

	$scope.loadModelTypes = function(modelName, useScope) {
		if (!modelName && useScope) {
			modelName = $stateParams.modelName;
		}

		if (modelName) { 
			$scope.config.query[0].modelName = modelName;
			$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
			$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
			$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
			console.log("$scope.valueProps", $scope.valueProps);
		}
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
