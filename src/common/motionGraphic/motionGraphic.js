angular.module('omniboard.motionGraphic', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('motionGraphic', {
		title: 'Motion Graphic',
		description: 'Displays the value of any model property',
		controller: 'motionGraphicCtrl',
		templateUrl: 'motionGraphic/motionGraphic.tpl.html',
		edit: {
			templateUrl: 'motionGraphic/edit.tpl.html',
			reload: false,
			controller: 'motionGraphicEditCtrl'
		}
	});
})

.controller('motionGraphicCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $stateParams, $filter, formatter, pageLevelData, $interval){
	$scope.dataLoaded = false;
	$scope.config = config;
	$scope.exFanOn = false;
	$scope.supFanOn = false;
	$scope.compressOn = false;




	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this motionGraphic";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}

	$scope.config.noDataImg = config.noDataImg ? config.noDataImg : "fa-exclamation-triangle";

	$scope.formatData = function( data ){
		if ( !isNaN(parseFloat(data))) {
			return $filter('number')(data, config.fractionSize);
		} else {
			return data;
		}
	};

	$scope.dataKey = config.modelType;



	//console.log("$scope.dataKey", $scope.dataKey);

	if (config.useScope) {
		$scope.returnedData = [];

		if ($scope.scopeModel && $scope.scopeId) {
			var allPointData = DataModels.getItem($scope.scopeModel, $scope.scopeId);
			//$scope.returnedData.push(allPointData);
			//var siteData = DataModels.getItem('Site',allPointData.Site);
			var siteData = DataModels.getItem($stateParams.modelName,$stateParams.scopeID);

			allPointData['SiteData'] = siteData;
			$scope.returnedData = allPointData;
			
			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;
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

		var updateModel = function(data, event){
			console.log('update event', event);
			if($scope.config.modelType0 == data.PointType){
				$scope.exFanOn = !!data.Value;
			}

			if($scope.config.modelType1 == data.PointType){
				$scope.supFanOn = !!data.Value;
			}

			if($scope.config.modelType2 == data.PointType){
				$scope.compressOn = !!data.Value;
			}
		};

		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);

			if( typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;

				angular.forEach(data, function(fbRef, idx){
					fbRef.$loaded().then(function(refData){
						updateModel(refData, 'onload');
						$scope['retData'+idx] = refData;
					});

					fbRef.$watch(function(evt){
						[$scope.retData0, $scope.retData1, $scope.retData2].forEach(function(refData){
							if (refData !== undefined && refData.$id == evt.key) {
								updateModel(refData, 'onwatch');
							}
						});
					});
				});

				$rootScope.$on('timeLoaded',function(evt,data){
					var offset = data.isDST ? data.dstOffset : data.gmtOffset,
						lastModified = angular.isArray($scope.retData0) ? $scope.retData0[$scope.retData0.length-1].data : $scope.retData0.lastModified;
					$scope.localUpdatedTime = formatter.filterDateString(lastModified, offset);
				});

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
			}
		}, 750, 80);

	}

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
      $scope.dataLoaded = false;
      $scope.dataLoadedError = false;
    });

	$scope.getDisplayValue = function(model, valueProp) {
        if (valueProp === 'History') {
            valueProp += '.' + config.historyProp;
        }
        if (valueProp === 'Uptime') {
            valueProp += '.' + config.uptimeProp;
        }

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

.controller('motionGraphicEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams, Dashboards){
	$scope.dashboards = Dashboards.list();
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName0, properties: {} };
	$scope.config.query[1] = { modelName: $scope.config.modelName1, properties: {} };
	$scope.config.query[2] = { modelName: $scope.config.modelName2, properties: {} };

	$scope.getPropertyValue = function(prop) {
		if (prop.component == "select") {
			return "$" + prop.label + ".Name";
		} else {
			return prop.label;
		}
	};

	$scope.loadModelValues = function(modelName) {
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.linkValueProps = DataModels.getModelForm(modelName).$asObject();
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

	if(!$scope.config.modelName0){
		if ($scope.config.useScope) {
			$scope.config.modelName0 = $scope.scopeModel;
		} else {
			$scope.config.modelName0 = "Point";
		}
	}

	if(!$scope.config.modelName1){
		if ($scope.config.useScope) {
			$scope.config.modelName1 = $scope.scopeModel;
		} else {
			$scope.config.modelName1 = "Point";
		}
	}

	if(!$scope.config.modelName2){
		if ($scope.config.useScope) {
			$scope.config.modelName2 = $scope.scopeModel;
		} else {
			$scope.config.modelName2 = "Point";
		}
	}

	if(!$scope.config.valueProp0){
		$scope.config.valueProp0 = "Value";
	}

	if(!$scope.config.valueProp1){
		$scope.config.valueProp1 = "Value";
	}

	if(!$scope.config.valueProp2){
		$scope.config.valueProp2 = "Value";
	}

	if(!$scope.config.labelProp0){
		$scope.config.labelProp0 = "Name";
	}

	if(!$scope.config.labelProp1){
		$scope.config.labelProp1 = "Name";
	}

	if(!$scope.config.labelProp2){
		$scope.config.labelProp2 = "Name";
	}

    if(!$scope.config.historyProp){
		$scope.config.historyProp = "last.last1";
	}

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

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = "5";
	}

	if(!$scope.config.textTitleValue){
		$scope.config.textTitleValue = "slick";
	}

	$scope.loadModelTypes = function(qNum, modelName, useScope) {
		if (!modelName && useScope) {
			modelName = $stateParams.modelName;
		} else {
			modelName = $scope.config['modelName'+qNum];
		}

		if (modelName) {
			$scope.config.query[qNum].modelName = modelName;
			$scope['modelTypes'+qNum] = DataModels.getAllModelTypes(modelName).$asObject();
			//$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
			//$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
		}
	};

	$scope.setModelType = function(qNum, modelName, modelType) {
		$scope.config.query[qNum].properties[modelName + "Type"] = modelType;
	};

	[0,1,2].forEach(function(idx) {
		if ($scope.config['modelName'+idx]) {
			$scope.loadModelTypes(idx, $scope.config['modelName'+idx]);
		}

		if ($scope.config['modelName'+idx] && $scope.config.modelType) {
			$scope.setModelType(idx, $scope.config['modelName'+idx], $scope.config.modelType);
		}
	});
});
