angular.module('omniboard.donut', ['adf.provider', 'highcharts-ng'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('donut', {
		title: 'Donut',
		description: 'Displays a donut',
		controller: 'donutCtrl',
		templateUrl: 'donut/donut.tpl.html',
		edit: {
			templateUrl: 'donut/edit.tpl.html',
			reload: false,
			controller: 'donutEditCtrl'
		}
	});
})

.controller('donutCtrl', ['$scope', 'config', 'es', 'DataModels', '$rootScope', '$filter', 'pageLevelData', '$interval', function($scope, config, es, DataModels, $rootScope, $filter, pageLevelData, $interval){
	$scope.dataLoaded = false;
	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this donut";
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

	var getData = function(rawData) {
		var val = $scope.getValue(rawData, config.valueProp);
		$scope.donutGraphConfig.yAxis.title.text = $scope.getValue(rawData, config.labelProp);	
		config.fractionSize = 1;
		return +$scope.formatData(val);
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

	var check = $interval(function() {
		var data = pageLevelData.get($scope.key);
		if (typeof data != 'undefined') {
			$interval.cancel(check);
			check = undefined;

			angular.forEach(data, function(fbRef,id){
				fbRef.$loaded().then(function(refData){

					if (refData) {
						$scope.returnedData = $scope.getValue(refData, config.labelProp);

						fbRef.$watch(function(evt){
							if (refData !== undefined && refData.$id == evt.key) {
								refData.$PointStatus = $scope.allPointStatus[refData.PointStatus];
								refData.$PointStatus.$id = refData.PointStatus;
								refData.$PointType = $scope.allPointType[refData.PointType];
								refData.$PointType.$id = refData.PointType;
								$scope.returnedData = $scope.getValue(refData, config.labelProp);
								console.log("ret", $scope.returnedData);
							}
						});


						//highcharts-ng watches for [series] and redraws chart if changed
						$scope.donutGraphConfig.series[0].data[0] = getData(refData);

						$scope.dataLoaded = true;
						$scope.dataLoadedError = false;
					} else {
						$scope.dataLoadedError = true;
						$scope.dataLoaded = true;
					}

				});
			});
		}else{
			$scope.dataLoadedError = true;
		}
	}, 750, 80);

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
      $scope.dataLoaded = false;
      $scope.dataLoadedError = false;
    });      

	$scope.getValue = function(data, prop) {
		if (data && prop){
			var val = data;
			var keys = prop.split(".");
			var key = keys.shift();

			while (key && val) {
				val = val[key];
				key = keys.shift();
			}
			return val;
		}else{
			return null;
		}
	};

	$scope.donutGraphConfig = {
		options: {
			chart: {
				type: 'solidgauge'
			},
			title: null,
			pane: {
				center: ['50%', '85%'],
				size: '160%',
				startAngle: -90,
				endAngle: 90,
				background: {
					backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || '#eee',
					innerRadius: '60%',
					outerRadius: '100%',
					shape: 'arc'
				}
			},
			tooltip: {
				enabled: false
			},
			plotOptions: {
				solidgauge: {
					dataLabels: {
						y: 7,
						borderWidth: 0,
						useHTML: true
					}
				}
			},
			exporting: {
				enabled: false
			}
		},
		yAxis: {
			min: 0,
			max: +config.maxValue,
			stops: [
				[0.1, '#55BF3B'], // green
				[0.5, '#DDDF0D'], // yellow
				[0.9, '#DF5353'] // red
			],
			lineWidth: 0,
			minorTickInterval: null,
			tickPixelInterval: 400,
			tickWidth: 0,
			title: { 
				y: 55 
			},
			labels: {
				y: 16
			}
		},
		series: [{
			data: [], //value should come here
			dataLabels: {
				y: 24,
				format: '<div style="text-align:center;font-size:' + config.myValueSize + ';color:' +
						((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y}' +
						'<div style="min-height:14px;font-size:12px;color:#888;">' + config.units + '</div></div>'
			}
		}]
    };

}])

.controller('donutEditCtrl', ['$scope', 'es', '$rootScope', 'DataModels', function($scope, es, $rootScope, DataModels){
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

	$scope.loadModelTypes = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
		$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
	};

	if(!$scope.config.modelName){
		$scope.config.modelName = "Point";
	}

	if(!$scope.config.valueProp){
		$scope.config.valueProp = "Value";
	}

	if(!$scope.config.labelProp){
		$scope.config.labelProp = "Name";
	}

	if(!$scope.config.maxValue){
		$scope.config.maxValue = "500";
	}

	if($scope.config.showLabel === undefined){
		$scope.config.showLabel = true;
	}

	if($scope.config.showValue === undefined){
		$scope.config.showValue = true;
	}

	if(!$scope.config.titleText){
		$scope.config.titleText = "slick";
	}

	if(!$scope.config.myLabelColor){
		$scope.config.myLabelColor = "text-muted";
	}

	if(!$scope.config.myValueSize){
		$scope.config.myValueSize = "1.5em";
	}

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = "5";
	}

	if(!$scope.config.units){
		$scope.config.units = "";
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
}]);
