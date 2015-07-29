angular.module('omniboard.lennoxEC', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('lennoxEC', {
		title: 'Lennox Error',
		description: 'Displays lennox error code value',
		controller: 'lennoxECCtrl',
		templateUrl: 'lennoxEC/lennoxEC.tpl.html',
		edit: {
			templateUrl: 'lennoxEC/edit.tpl.html',
			reload: false,
			controller: 'lennoxECEditCtrl'
		}
	});
})

.controller('lennoxECCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $stateParams, formatter, pageLevelData, $interval, FirebaseRootRef, initialFirebaseChild){
	$scope.dataLoaded = false;
	$scope.config = config;

	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}

	if(!$scope.config.modelType){
		$scope.allPointTypes = DataModels.getPointTypes().$asObject();
		$scope.allPointTypes.$loaded().then(function(dataSnap) {
			angular.forEach(dataSnap, function(val,id){
				if(val.Name == 'Error Code'){
					$scope.config.modelType = id;
				}
			});
		});
	}

	$scope.dataKey = config.modelType;
	if( $scope.key.toString().indexOf(':') !== 0){
		var originalKey = angular.copy($scope.key.toString());
		$scope.widgetKeys = originalKey.split(':');
		$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
	}

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

	var errorCodesRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('errorCodes/lennox');
	errorCodesRef.once('value', function (dataSnap) {
		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);
			if(typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;
				angular.forEach(data, function(fbRef,id){
					fbRef.$loaded().then(function(refData){
						if( $scope.widgetKeys.length === 1){
							$scope.returnedData = refData;
							$scope.returnedDataVal = $scope.getValue(refData, config.labelProp);
						} else {
							if( refData[$scope.widgetKeys[1]] == $scope.widgetKeys[2]){
								$scope.returnedData = refData;
								$scope.returnedDataVal = $scope.getValue(refData, config.labelProp);
							}
						}
						if(typeof $scope.returnedData != 'undefined'){
							angular.forEach(dataSnap.val(), function (errorMessage, errorCode) {
								if (typeof $scope.returnedData.Value != 'undefined' && errorCode == $scope.returnedData.Value.toString()) {
									$scope.lennoxErrorMessage = errorMessage.label;
									$scope.dataLoaded = true;
									$scope.dataLoadedError = false;
								}
							});
						}

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

				$rootScope.$on('timeLoaded',function(evt,data){
					var offset = data.isDST ? data.dstOffset : data.gmtOffset,
						//sometimes array[6] may come
						lastModified = $scope.returnedData.lastModified ? $scope.returnedData.lastModified : $scope.returnedData[6].data;
					$scope.localUpdatedTime = formatter.filterDateString(lastModified, offset);
				});

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
			}
		}, 750, 80);
	}, function (err) {
		$scope.dataLoadedError = true;
	});

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
      $scope.dataLoaded = false;
      $scope.dataLoadedError = false;
    });

	$scope.getValue = function(data, prop) {
		var val = data;
		var keys = prop.split(".");
		var key = keys.shift();

		while (key && val) {
			val = val[key];
			key = keys.shift();
		}

		if(!val){
			$scope.dataLoadedError = true;
			return;
		}
	};
})

.controller('lennoxECEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams, Dashboards){
	$scope.config.query = [];
	$scope.config.modelName = "Point";
	$scope.config.valueProp = "Value";
	$scope.config.labelProp = "Name";
	$scope.modelConfigured = false;
	$scope.allPointTypes = DataModels.getPointTypes().$asObject();
	$scope.allPointTypes.$loaded().then(function(dataSnap) {
		angular.forEach(dataSnap, function(val,id){
			if(val.Name == 'Error Code'){
				$scope.config.modelType = id;
				$scope.config.query[0] = { modelName: $scope.config.modelName, properties: { "PointType" : $scope.config.modelType } };
				$scope.modelConfigured = true;
			}
		});
		$scope.modelConfigured = true;
	});

	if(!$scope.config.displayValues){
		$scope.config.displayValues = {};
	}

	$scope.deleteDisplayValue = function(key) {
		delete $scope.config.displayValues[key];
	};

	$scope.addDisplayValue = function(key, value) {
		$scope.config.displayValues[key] = value;
	};

	if($scope.config.showLabel === undefined){
		$scope.config.showLabel = true;
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

});
