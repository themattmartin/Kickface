/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.activeLoadTrend.states", [])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var main = {
		name: 'auth.activeLoadTrend',
		url: '/activeLoadTrend',
		templateUrl: 'activeLoadTrend/templates/activeLoadTrend.tpl.html',
		controller: 'activeLoadTrendCtrl',
		data: {
			title: 'Active Loads'
		}
	};		

	$stateProvider
		.state(main)
	;

}])

/**
 * Controller
 */
.controller('activeLoadTrendCtrl', ['$scope', '$q', 'es', 'DataModels', '$http', function($scope, $q, es, DataModels, $http) {

$scope.getLoadValueName = function(loadName, value){
	$scope.EnergyLoadsMapping = {
	'1ThirdSales': {0:'ON', 1: 'OFF'},
	'AlarmSystem': {0:'ON', 1: 'OFF'},
	//'Cool Primary': {1,'ON', 0, 'OFF'},
	'Effective Occupancy': {0:'ON', 1: 'OFF'},
	'Exhaust Fan Status': {1:'ON', 0: 'OFF'},
	'Exterior': {0:'ON', 1: 'OFF'},
	'First': {0:'ON', 1: 'OFF'},
	'Full': {0:'ON', 1: 'OFF'},
	'HalfValence': {0:'ON', 1: 'OFF'},
	//'Heat Primary': {1,'ON', 0, 'OFF'},
	//'Heat Secondary': {1,'ON', 0, 'OFF'},
	'HotWaterHeater': {0:'ON', 1: 'OFF'},
	'OneThirdSales': {0:'ON', 1: 'OFF'},
	'Security': {0:'ON', 1: 'OFF'},
	'Sign': {0:'ON', 1: 'OFF'},
	'Supply Fan Status': {1:'ON', 0: 'OFF'}
	};
	if( typeof $scope.EnergyLoadsMapping[loadName.split(' - ')[1]] != 'undefined' && $scope.EnergyLoadsMapping[loadName.split(' - ')[1]][value] != 'undefined' ){
		return $scope.EnergyLoadsMapping[loadName.split(' - ')[1]][value];
	} else {
		return value;
	}


};

	var user = $rootScope.loginService.getCurrentUser();

	$scope.lastHrKwH = '-';
	$scope.kwhPerSqft = '-';
	$scope.kw = '-';

	$scope.siteNames = DataModels.getModelAngularFireRef('Site');
	$scope.chartSeries = [];
	$scope.energyUsage = [];
	$scope.showUsage = false;
	$scope.trendConfig = {
		options: {
			chart: {
				zoomType: 'x',
				backgroundColor: '#3c3c3c'
			},
			yAxis: {
				reversed: false,
				title: '',
				labels: {
					formatter: function () {
						return '<span style="fill: white;">' + this.value + '</span>';
					}
				}
			},
			exporting: {
				buttons: {
					contextButton: {
						menuItems: [{
							text: "Export CSV",
							onclick: function () {
							
								var exportURL = '/exportCSV?pt='+$scope.returnedData.$id+'&interval='+$scope.interval+'&units='+$scope.intervalUnits+'&sd='+new Date($scope.startDate).getTime()+'&ed='+new Date($scope.endDate).getTime()+'&rollupFunction='+$scope.trendFunction+'&type='+$scope.type;
								$window.open(exportURL);
							}
						}]
					}
				}
			},
			plotOptions: {
				series: {
					//step: 'left',
					connectNulls: false,
					stacking: '',
					point: {
						events: {
							/*click: function() {
								alert ('Time: '+ this.x +', Value: '+ this.y);
							}*/
						}
					}

				}
			},
			legend: {
				itemStyle: {
					color : "#FFFFFF"
				}
			},
			tooltip: { 
				formatter: 
					function() {
						$scope.showUsage = true;
						$scope.selectUsagePoints = this.points[0].point.index;
						
						
						var str = '';
						for(var i=0;i<this.points.length;i++){
							str = str + "<b style='color: "+this.points[i].series.color+"'>"+this.points[i].series.name + "</b>: " + Highcharts.numberFormat(this.points[i].y, 2) + "<br />";
						}
						return str;
						


					},
				useHTML: true,
				crosshairs: true,
				shared: true
			}
		},
		xAxis: {
			type: 'datetime',
			dateTimeLabelFormats: {
				day: '%e of %b'
			},
			labels: {
				formatter: function () {
					return '<span style="fill: white;">' + Highcharts.dateFormat('%m/%d/%y', this.value) + '</span>';
				}
			}
		},
		series: $scope.chartSeries,
		title: {
			text: ''
		},
		credits: {
			enabled: false
		},
		loading: false
	};

	
	$scope.errorLoading = false;
	$scope.fetchData = function(siteID){

		
		$http({method: 'GET', url: '/processEnergyLoads?siteid='+siteID}).
		success(function(processedData, status, headers, config) {
			$scope.energyUsage = processedData;

			// get the correct site 
			$scope.selectedSite = $scope.siteNames[siteID];

			// get the kwh and the kw point 
			$scope.search('-JUt9jZN9fF7H-TyWfmn',siteID).then(
				function(kwhSearchData){
					
					if( typeof kwhSearchData != 'undefined' ) {

						$scope.kw = kwhSearchData._source.Value.toFixed(2);

						$scope.search('-JUt9jZN9fF7H-TyWfmm',siteID).then(
							function(ok){
								if( typeof ok._id != 'undefined' ) {
									$scope.kWh = ok;
									
									var pointId = "Model:Point.Property:Value.ItemId:" + ok._id + "." + ok._id;
									var webServiceURL = '/getLastHourAvg?pt='+pointId;
									$http({method: 'GET', url: webServiceURL}).
									success(function(processedData, status, headers, config) {
										console.log( 'webServiceURL', webServiceURL );
										console.log( 'getLastHourAvg ', processedData );
										var seriesCollection = [];

										for (var index in processedData) {
											var series = processedData[index];
											if( typeof series.v[pointId] != 'undefined'){
												seriesCollection.push([(new Date(Date.parse(series.t))).getTime(), series.v[pointId] ]);          
											} else {
												seriesCollection.push([(new Date(Date.parse(series.t))).getTime(), 0 ]);          
											}
											
										}
										$scope.chartSeries.pop();
										$scope.chartSeries.push( {"name": "kW", "data": seriesCollection, type: "area" } );
									
										$scope.lastHrKwH = processedData[processedData.length-2].v[pointId] - processedData[processedData.length-1].v[pointId];
										$scope.kwhPerSqft = $scope.lastHrKwH / $scope.selectedSite.Area;
									}).
									error(function(data, status, headers, config) {
																	
									});
								} else {
									$scope.errorLoading = true;
								}
							}
						); //kWh

					} else {
						$scope.errorLoading = true;
					}

				}, function(err){
					$scope.errorLoading = true;
				}
			); //kW

				
		}).
		error(function(data, status, headers, config) {
									
		});

	};

	$scope.search = function(type,siteID){
		var deferred = $q.defer();
		var searchObj = {
			index: es.getIndexName(),
			type:  'Point',
			explain: false,
			lowercaseExpandedTerms: false,
			body: {
				size: 500,
				sort: [ "Name.raw" ],
				query: {
					filtered: {
						filter: { 
							bool: {
								must: [
									{term:{Site: siteID}},
									{term:{PointType: type}}
								]
							}
						}
					}
				}
			}
		};
		
		es.get().search(searchObj)
			.then(
				function(resp) { 
					if( typeof resp.hits.hits[0] != 'undefined'){
						deferred.resolve(resp.hits.hits[0]);
					} else {
						deferred.reject();
					}
				},
				function(err) {
					deferred.reject(err);
				
				}
			)
		;	

		return deferred.promise;
	};

//var pointId = "Model:Site.Property:expressions.ExpressionType:values|cv.ExpressionCategory:Performance.Name:OmniScore.ItemId:" + data._id + "." + data._id;


/*

		webServiceURL = '/getThirtyDayAverage?pt='+pointId;
		$http({method: 'GET', url: webServiceURL}).
		success(function(processedData, status, headers, config) {
			var seriesCollection = [];

			for (var index in processedData) {
				var series = processedData[index];
				seriesCollection.push([(new Date(Date.parse(series.t))).getTime(), series.v[pointId]]);          
			}

			$scope.chartSeries.pop();
			$scope.chartSeries.push( {"name": 'OmniScore', color: "#7cb5ec", "data": seriesCollection, dataGrouping: {enabled: false} } );

			$scope.trendConfig = {
				options: {
					chart: {
						zoomType: 'x',
						backgroundColor: '#3c3c3c'
					},
					yAxis: {
						reversed: false,
						title: '',
						labels: {
							formatter: function () {
								return '<span style="fill: white;">' + this.value + '</span>';
							}
						}
					},
					exporting: {
						buttons: {
							contextButton: {
								menuItems: [{
									text: "Export CSV",
									onclick: function () {
										var exportURL = '/exportCSV?pt='+$scope.returnedData.$id+'&interval='+$scope.interval+'&units='+$scope.intervalUnits+'&sd='+new Date($scope.startDate).getTime()+'&ed='+new Date($scope.endDate).getTime()+'&rollupFunction='+$scope.trendFunction+'&type='+$scope.type;
										$window.open(exportURL);
									}
								}]
							}
						}
					},
					plotOptions: {
						series: {
							//step: 'left',
							connectNulls: false,
							stacking: '',
							point: {
								events: {
									click: function() {
										alert ('Time: '+ this.x +', Value: '+ this.y);
									}
								}
							}

						}
					},
					legend: {
						itemStyle: {
							color : "#FFFFFF"
						}
					},
					tooltip: { 
						formatter: 
							function() {
								var str = '';
								for(var i=0;i<this.points.length;i++){
									str = str + "<b style='color: "+this.points[i].series.color+"'>"+this.points[i].series.name + "</b>: " + Highcharts.numberFormat(this.points[i].y, 2) + "<br />";
								}
								return str;
							},
						useHTML: true,
						crosshairs: true,
						shared: true
					}
				},
				xAxis: {
					type: 'datetime',
					dateTimeLabelFormats: {
						day: '%e of %b'
					},
					labels: {
						formatter: function () {
							return '<span style="fill: white;">' + Highcharts.dateFormat('%m/%d/%y', this.value) + '</span>';
						}
					}
				},
				series: $scope.chartSeries,
				title: {
					text: ''
				},
				credits: {
					enabled: false
				},
				loading: false
			};

		}).
		error(function(data, status, headers, config) {
									
		});
*/

}])
;