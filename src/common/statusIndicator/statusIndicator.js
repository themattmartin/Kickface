angular.module('omniboard.statusIndicator', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('', {
		title: 'Status Indicator',
		description: 'Displays the status of any model property',
		controller: 'statusIndicatorCtrl',
		templateUrl: 'statusIndicator/statusIndicator.tpl.html',
		edit: {
			templateUrl: 'statusIndicator/edit.tpl.html',
			reload: false,
			controller: 'statusIndicatorEditCtrl'
		}
	});
}).controller('statusIndicatorCtrl', function($scope, config, es, $rootScope, DataModels, $interval, pageLevelData, formatter){

	$scope.types = DataModels.getAllModelTypes($scope.config.modelName).$asObject();

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
	
	
	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}
	$scope.dataKey = config.modelType;


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
				/*
				if( data.length === 0){
					$scope.returnedData = data[0];
				} else {
					$scope.returnedData = data;
				}
				*/

				config.showMin= false;
				config.showMax= false;

				angular.forEach(data, function(fbRef){
					fbRef.$loaded().then(function(refData){
						if( $scope.widgetKeys.length === 1){
							$scope.returnedData = refData;
							
						} else {
							if( refData[$scope.widgetKeys[1]] == $scope.widgetKeys[2]){
								$scope.returnedData = refData;
								
							}
						}

						fbRef.$watch(function(evt){
							if (refData !== undefined && refData.$id == evt.key) {
								refData.$PointStatus = $scope.allPointStatus[refData.PointStatus];
								refData.$PointStatus.$id = refData.PointStatus;
								refData.$PointType = $scope.allPointType[refData.PointType];
								refData.$PointType.$id = refData.PointType;
								$scope.returnedData = refData;
							}
						});

					});
				});

				$rootScope.$on('timeLoaded',function(evt,data){
					var offset = data.isDST ? data.dstOffset : data.gmtOffset,
						lastModified = angular.isArray($scope.returnedData) ? $scope.returnedData[$scope.returnedData.length-1].data : $scope.returnedData.lastModified;
					$scope.localUpdatedTime = formatter.filterDateString(lastModified, offset);
				});

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;

			}
		}, 750, 80);

}).controller('statusIndicatorEditCtrl', function($scope, es, $rootScope, DataModels, $interval, pageLevelData, formatter){
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

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

	$scope.getPropertyValue = function(prop) {
		if (prop.component == "select") {
			return "$" + prop.label + ".Name";
		} else {
			return prop.label;
		}
	};

	$scope.loadModelTypes = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
		$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
	};

	if(!$scope.config.modelName){
		$scope.config.modelName = "Point";
	}

	if(!$scope.config.titleTextLabel){
		$scope.config.titleTextLabel = "slick";
	}

	$scope.setModelType = function(modelName, modelType) {
		$scope.config.query[0].properties[modelName + "Type"] = modelType;
	};

	if ($scope.config.modelName) {
		$scope.loadModelTypes($scope.config.modelName);
	}

	if ($scope.config.modelName && $scope.config.modelType) {
		$scope.setModelType($scope.config.modelName, $scope.config.modelType);
	}

	if( $scope.config.key.toString().indexOf(':') !== 0){
			var originalKey = angular.copy($scope.config.key.toString());
			$scope.widgetKeys = originalKey.split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}

		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);
			if( typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;
				/*
				if( data.length === 0){
					$scope.returnedData = data[0];
				} else {
					$scope.returnedData = data;
				}
				*/

				//config.showMin= false;
				//config.showMax= false;

				angular.forEach(data, function(fbRef){
					fbRef.$loaded().then(function(refData){
						if( $scope.widgetKeys.length === 1){
							$scope.returnedData = refData;

						} else {
							if( refData[$scope.widgetKeys[1]] == $scope.widgetKeys[2]){
								$scope.returnedData = refData;
								
							}
						}

						fbRef.$watch(function(evt){
							if (refData !== undefined && refData.$id == evt.key) {
								refData.$PointStatus = $scope.allPointStatus[refData.PointStatus];
								refData.$PointStatus.$id = refData.PointStatus;
								refData.$PointType = $scope.allPointType[refData.PointType];
								refData.$PointType.$id = refData.PointType;
								$scope.returnedData = refData;
							}
						});
						
					});
				});

				$rootScope.$on('timeLoaded',function(evt,data){
					var offset = data.isDST ? data.dstOffset : data.gmtOffset,
						lastModified = angular.isArray($scope.returnedData) ? $scope.returnedData[$scope.returnedData.length-1].data : $scope.returnedData.lastModified;
					$scope.localUpdatedTime = formatter.filterDateString(lastModified, offset);
				});

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;

			}
		}, 750);

});
