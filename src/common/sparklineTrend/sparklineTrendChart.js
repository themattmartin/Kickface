angular.module('omniboard.sparklineTrend', ['adf.provider', 'highcharts-ng'])

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
	.widget('sparklineTrend', {
		title: 'Sparkline Graph',
		description: 'Displays a sparkline trend graph',
		controller: 'sparklineTrendCtrl',
		templateUrl: 'sparklineTrend/sparklineTrend.tpl.html',
		edit: {
			templateUrl: 'sparklineTrend/edit.tpl.html',
			reload: false,
			controller: 'sparklineTrendEditCtrl'
		}
	});
})

.directive('obSparklineTrend', function ($http, $window) {
	return {
		restrict: 'EA',
		replace: true,
		templateUrl: 'sparklineTrend/sparklineWidget.tpl.html',
		scope:{
			returnedData: '=',
			config: '='
		},

		controller: function ($scope, $rootScope, $http, $window) {
			angular.forEach($scope.config.query, function(id, val){
				$scope.eachYaxis = id.yAxis;
			});

			$scope.config.interval = 1;
			$scope.config.intervalUnits = 'day';

			$scope.plotDrawn = false;

			$scope.localYaxis = [] ;
			$scope.localSeriesData = [];

			$scope.loaded = false;

			var trendWidth = ($scope.config.width ? $scope.config.width : 4) * 70;

			$scope.trendConfig = {
				options: {
					chart: {
						borderWidth: 0,
						type: 'area',
						height: 70,
						width: trendWidth,
						margin: [0, 0, 0, 0],
						backgroundColor: 'transparent'
					},
					title: {
						text: ''
					},
					tooltip: {
						enabled: $scope.config.showHoverDisplay,
						style: {
							width: trendWidth * 0.8
						}
					},
					xAxis: {
						labels: {
							enabled: false
						},
						title: {
							text: ''
						},
						startOnTick: false,
						endOnTick: false,
						tickPositions: []
					},
					yAxis: {
						endOnTick: false,
						startOnTick: false,
						labels: {
							enabled: false
						},
						title: {
							text: null
						},
						tickPositions: [0]
					},
					credits: {
						enabled: false
					},
					legend: {
						enabled: false
					},
					exporting: {
						enabled: false
					},
					plotOptions: {
						series: {
							animation: false,
							lineWidth: 1,
							shadow: false,
							states: {
								hover: {
									lineWidth: 1
								}
							},
							marker: {
								radius: 1,
								states: {
									hover: {
										radius: 2
									}
								}
							},
							fillOpacity: 0.25
						},
						column: {
							negativeColor: '#910000',
							borderColor: 'silver'
						},
						area: {
							lineColor: '#8085e8'
						}
					}
				},
				series: [{
					data: []
				}],
				loading: false
			};

			var startDate, endDate;
			if ($scope.config.lastXHours === undefined && $scope.config.show24hr) {
				$scope.config.lastXHours = 24;
			}
			if ($scope.config.lastXHours) {
				startDate = new Date();
				startDate.setHours(startDate.getHours() - $scope.config.lastXHours);
				startDate = startDate.getTime();
				endDate = new Date().getTime();
			} else {
				startDate = new Date($scope.config.startDate).getTime();
				endDate = new Date($scope.config.endDate).getTime();
			}

			$scope.dataLoaded = false;

			$scope.$watch('returnedData', function (newVal, oldVal) {
				if (newVal) {
					var pointId = [];
					for (var i in $scope.returnedData) {
						var tempoDBkey = 'Model:' + $scope.config.modelName + '.Property:' + $scope.config.valueProp + '.ItemId:' + $scope.returnedData[i].$id.toString() + '.' + $scope.returnedData[i].$id.toString();
						pointId.push(tempoDBkey);
					}
					var user = $rootScope.loginService.getCurrentUser();
					if( !user ){
						return;
					}
					if ($scope.config.showCurrentValue) {
						$scope.trendConfig.options.xAxis.title.text = $scope.returnedData[i].Name + ' ' +  $scope.returnedData[i].Value;
					}

					var webServiceURL = '/getMultiData?cnum='+user.customerKey+'&pt=' + pointId + '&interval=1&units=day&sd=' + startDate + '&ed=' + endDate + '&interpolate=false';

					$http({
						method: 'GET',
						url: webServiceURL
					}).success(function (processedData, status, headers, config) {
						$scope.dataLoaded = true;
						$scope.dataLoadedError = false;
						if (processedData.series && processedData.series.length > 0) {
							var trendData = [];
							for (var index in processedData.series[0].data) {
								trendData.push([
								new Date(processedData.series[0].data[index][0]).toISOString(),
								processedData.series[0].data[index][1]
								]);
							}
							$scope.trendConfig.series[0].data = trendData;
						}
					});
				}
			});
		}
	};
})

.controller('sparklineTrendCtrl', function($scope, config, $rootScope, DataModels, $log, $interval, pageLevelData){
	$scope.dataLoaded = false;
	$scope.config = config;
	$scope.key = config.key;
	$scope.returnedData = null;

	var check;
	check = $interval(function () {
		var data = pageLevelData.get($scope.key);
		if (typeof data != 'undefined') {
			$interval.cancel(check);
			check = undefined;
			$scope.lastUpdate = new Date();
			$scope.returnedData = data;
			$scope.loadMultiple = true;
			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;
		}
	}, 750, 80);

	$rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
	});

	$rootScope.$on('widget:sparkline:plotted', function () {
		$scope.show = 'graph';
		$scope.plotDrawn = true;
		$scope.dataLoaded = true;
		$scope.dataLoadedError = false;
	});
})

.controller('sparklineTrendEditCtrl', function($scope, config, $rootScope, DataModels, $log){
	$scope.config.interval = 1;
	$scope.config.intervalUnits = 'day';

	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config = config;
	$scope.show = 'graph';
	config.query = null;

	if(typeof $scope.config.graphType == 'undefined'){
		$scope.config.graphType = 'area';
	}

	$scope.getPropertyValue = function(prop) {
		if (prop.component == "select") {
			return "$" + prop.label + ".Name";
		} else {
			return prop.label;
		}
	};

	$scope.plotDrawn = false;

	$scope.verifyPossiblePointsReturned = function(){
		var d1 = new Date($scope.config.startDate);
		var d2 = new Date($scope.config.endDate);
		var diff = d1.getTime() - d2.getTime();
		var possible;

		if( $scope.config.intervalUnits == 'min'){
			possible = diff / 1000 / 60 / $scope.config.interval;
		} else if( $scope.config.intervalUnits == 'hour'){
			possible = diff / 1000 / 60 / 60 / $scope.config.interval;
		} else if( $scope.config.intervalUnits == 'day'){
			possible = diff / 1000 / 60 / 60 / 24 / $scope.config.interval;
		} else if( $scope.config.intervalUnits == 'month'){
			possible = diff / 1000 / 60 / 60 / 24 / 30 / $scope.config.interval;
		} else if( $scope.config.intervalUnits == 'year'){
			possible = diff / 1000 / 60 / 60 / 24 / 365 / $scope.config.interval;
		}

		$scope.totalPossibleResults = Math.ceil(Math.abs(possible));

	};

	$scope.verifyPossiblePointsReturned();

	$scope.updateQuery = function () {
		var propertiesObj = {};
		var propertiesObjName = $scope.config.modelName + 'Type';
		propertiesObj[propertiesObjName] = $scope.config.modelType;
		$scope.config.query[0].properties = propertiesObj;
	};

	$scope.updateModelTypes = function(){
		$scope.config.query[0].modelName = $scope.config.modelName;
		$scope.modelTypes = DataModels.getAllModelTypes($scope.config.modelName).$asObject();
		if ($scope.config.modelName) {
			$scope.trendables = DataModels.listTrendables($scope.config.modelName).$asObject();
		}
	};

	var propertiesObj = {};
	var propertiesObjName = $scope.config.modelName + 'Type';
	propertiesObj[propertiesObjName] = config.modelType;
	var query = {
			modelName: $scope.config.modelName,
			properties: propertiesObj,
			//key: $scope.config.modelType,
			graphType: 'area'
			//valueProp: valueProp,
		};
	$scope.config.query = [];
	$scope.config.query.push(query);

	$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
		if( data ){
			$scope.lastUpdate = new Date();
			$scope.returnedData = data;
		} else {
			$log.error( 'no data returned for ',$scope.key );
		}
	});

	if( typeof $scope.modelNames != 'undefined'){
		$scope.updateModelTypes();
	}

	$scope.dateOptions = {
		'year-format': "'yy'",
		'starting-day': 1
	};

	$scope.chartSeries = [];
	$scope.openedTo = false;
	$scope.openedFrom = false;
	$scope.op = function($event, openItem) {
		$event.preventDefault();
		$event.stopPropagation();
		$scope[openItem] = true;
	};
	$scope.editMode = false;

	// DEFAULTS
	if(typeof $scope.config.modelName == "undefined"){
		$scope.config.modelName = 'Point';
		$scope.updateModelTypes();
	}

	if(typeof $scope.config.intervalUnits == "undefined"){
		$scope.config.intervalUnits = "hour";
	}

	if(typeof $scope.config.interval == "undefined"){
		$scope.config.interval = 1;
	}

	if(typeof $scope.config.graphType == "undefined"){
		$scope.config.graphType = "area";
	}

	if(typeof $scope.config.showAvg == "undefined"){
		$scope.config.showAvg = "false";
	}

	if(typeof $scope.config.interpolate == "undefined"){
		$scope.config.interpolate = "false";
	}

	if(typeof $scope.config.trendFunction == "undefined"){
		$scope.config.trendFunction = "mean";
	}

	if(typeof $scope.config.invertLighting == "undefined"){
		$scope.config.invertLighting = "false";
	}

	if(typeof $scope.config.lastXHours == "undefined"){
		$scope.config.lastXHours = 24;
	}

	if(typeof $scope.config.showPointType == "undefined"){
		$scope.config.showPointType = true;
	}

	if(typeof $scope.config.showCurrentValue == "undefined"){
		$scope.config.showCurrentValue = true;
	}

	if(typeof $scope.config.showHoverDisplay == "undefined"){
		$scope.config.showHoverDisplay = true;
	}

	if(typeof $scope.config.valueProp == "undefined"){
		$scope.config.valueProp = "Value";
	}

	if(typeof $scope.config.yAxisAuto == "undefined"){
		$scope.config.yAxisAuto = "true";
	}

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = "2";
	}

})
;