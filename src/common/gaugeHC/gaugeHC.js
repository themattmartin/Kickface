angular.module('omniboard.gaugeHC', ['adf.provider', 'highcharts-ng'])

.filter('range', function() {
	return function(input, total) {
		total = parseInt(total,10);
		for (var i=0; i<total; i++){
			input.push(i);
		}
		return input;
	};
})

.config(function(dashboardProvider){
	dashboardProvider
	.widget('gaugeHC', {
		title: 'Speedometer',
		description: 'Displays a Gauge',
		controller: 'gaugeHCCtrl',
		templateUrl: 'gaugeHC/gaugeWidget.tpl.html',
		edit: {
			templateUrl: 'gaugeHC/edit.tpl.html',
			reload: false,
			controller: 'gaugeHCEditCtrl'
		}
	});
})

.controller('gaugeHCCtrl', function($scope, config, $rootScope, DataModels, $state, $interval, pageLevelData){

	var diff = 0;
	if (typeof config.minValue === 'undefined') { config.minValue = 0; }
	if (typeof config.maxValue === 'undefined') { config.maxValue = 200; }
	if (typeof config.dangerPercentage === 'undefined') { config.dangerPercentage = 0.9; }
	if (typeof config.warningPercentage === 'undefined') { config.warningPercentage = 0.6; }
	if (typeof config.unitOfMeasure === 'undefined') { config.unitOfMeasure = 'Unit'; }
	if (typeof config.maxValue !== 'undefined' && typeof config.minValue !== 'undefined') { diff = config.maxValue - config.minValue; }

	if (config.gaugeType === 'solidgauge') {
		$scope.gaugeConfig = {
			options: {
				chart: {
					type: 'solidgauge',
					backgroundColor: 'rgba(0,0,0,0)',
					width: (config.widgetWidth ? config.widgetWidth : 300),
					height: (config.widgetHeight ? config.widgetHeight : 300)
				},
				pane: {
					center: ['50%', '50%'],
					size: '60%',
					startAngle: -90,
					endAngle: 90,
					background: {
						backgroundColor:'#EEE',
						innerRadius: '60%',
						outerRadius: '100%',
						shape: 'arc'
					}
				},
				exporting: {
					enabled: false
				},
				solidgauge: {
					dataLabels: {
						y: -30,
						borderWidth: 0,
						useHTML: true
					}
				}
			},
			series: [{
				name:  config.unitOfMeasure,
				data: [0],
				dataLabels: {
					format: '<div style="text-align:center"><span style="font-size:15px;color:black">{y}</span><br/>' +
						'<span style="font-size:10px;color:silver">' + config.unitOfMeasure + '</span></div>'
				}
			}],
			title: {
				text: 'Solid Gauge',
				y: 10
			},
			yAxis: {
				currentMin: config.minValue,
				currentMax: config.maxValue,
				title: {
					y: 140
				},
				stops: [
					[0.0, '#55BF3B'], // green
					[config.warningPercentage, '#DDDF0D'], // yellow
					[config.dangerPercentage, '#DF5353'] // red
				],
				lineWidth: 0,
				tickInterval: 20,
				tickPixelInterval: 400,
				tickWidth: 0,
				labels: {
					y: 15
				}
			},
			loading: false
		};
	} else {

		var width = 300 * config.size;
		var height = 300 * config.size;

		$scope.gaugeConfig = {
			options: {
				chart: {
					type: 'gauge',
					backgroundColor: 'rgba(0,0,0,0)',
					plotBackgroundColor: null,
					plotBackgroundImage: null,
					plotShadow: false,

					width: width,
					height: height

				},
				pane: {
					startAngle: -150,
					endAngle: 150,
					background: [{
						backgroundColor: {
							stops: [
								[0, '#FFF'],
								[1, '#333']
							]
						},
						borderWidth: 0,
						outerRadius: '109%'
					}, {
						backgroundColor: {
							stops: [
								[0, '#333'],
								[1, '#FFF']
							]
						},
						borderWidth: 1,
						outerRadius: '107%'
					}, {
						// default background
					}, {
						backgroundColor: '#DDD',
						borderWidth: 0,
						outerRadius: '105%',
						innerRadius: '103%'
					}]
				},
				exporting: {
					enabled: false
				},
				solidgauge: {
					dataLabels: {
						y: -30,
						borderWidth: 0,
						useHTML: true
					}
				}
			},
			series: [{
				name: config.unitOfMeasure,
				data: [0],
				tooltip: {
					valueSuffix: ' ' + config.unitOfMeasure
				}
			}],
			title: {
				text: 'Gauge',
				y: 50
			},
			yAxis: {
				min: config.minValue,
				max: config.maxValue,

				minorTickInterval: 'auto',
				minorTickWidth: 1,
				minorTickLength: 10,
				minorTickPosition: 'inside',
				minorTickColor: '#444',

				tickPixelInterval: 30,
				tickWidth: 2,
				tickPosition: 'inside',
				tickLength: 10,
				tickColor: '#111',
				labels: {
					step: 2,
					rotation: 'auto'
				},
				title: {
					text: config.unitOfMeasure
				},
				plotBands: [{
					from: config.minValue,
					to: ((diff * config.warningPercentage) - 1),
					color: '#55BF3B' // green
				}, {
					from: (diff * config.warningPercentage),
					to: ((diff * config.dangerPercentage) - 1),
					color: '#DDDF0D' // yellow
				}, {
					from: (diff * config.dangerPercentage),
					to: config.maxValue,
					color: '#DF5353' // red
				}]
			},
			loading: false
		};
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

	$scope.dataLoaded = false;
	$scope.config = config;
	$scope.key = config.key;

	if ($scope.config.modelType) {
		DataModels.getNameAttr('PointType', $scope.config.modelType).then(function(ok){
			$scope.gaugeConfig.title.text = null;
			$scope.gaugeTitle = ok;
		});
	}

	var check;
	check = $interval(function() {
		var data = pageLevelData.get($scope.key);
		if (typeof data != 'undefined') {
			$interval.cancel(check);
			check = undefined;
			angular.forEach(data, function (fbRef, id) {
				fbRef.$loaded().then(function (refData) {
					$scope.returnedData = refData;
					
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
			$rootScope.$on('timeLoaded', function (evt, data) {
				$scope.gaugeConfig.series[0].data[0] = +$scope.returnedData.Value.toFixed(config.fractionSize);
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			});
		} else {
			$scope.dataLoadedError = true;
		}
	}, 750, 80);

}).controller('gaugeHCEditCtrl', function($scope, config, DataModels, Dashboards){

	$scope.dashboards = Dashboards.list();
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

	if (!config.gaugeType) { config.gaugeType = 'gauge'; }
	if (typeof config.minValue === 'undefined') { config.minValue = 0; }
	if (typeof config.maxValue === 'undefined') { config.maxValue = 200; }
	if (config.gaugeType === 'solidgauge' && !config.widgetHeight && !config.widgetWidth) {
		config.widgetHeight = 400;
		config.widgetWidth = 400;
	}
	if (config.gaugeType === 'gauge' && !config.size) {
		config.size = 1;
	}

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

	$scope.loadModelTypes = function(modelName, useScope) {
		if (!modelName && useScope) {
			modelName = $stateParams.modelName;
		}

		if (modelName) {
			$scope.config.query[0].modelName = modelName;
			$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
			$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
			$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
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

})

;