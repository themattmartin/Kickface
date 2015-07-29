angular.module('omniboard.modelDetails', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('Map Pin Details', {
		title: 'Details',
		description: 'Displays details and links to a dashboard',
		controller: 'modelDetailsCtrl',
		templateUrl: 'modelDetails/modelDetails.tpl.html',
		edit: {
			templateUrl: 'modelDetails/edit.tpl.html',
			reload: false,
			controller: 'modelDetailsEditCtrl'
		}
	});
})


.controller('modelDetailsCtrl', function($scope, config, $rootScope, Dashboards, $state, $stateParams, alarmFormatter, $http, FirebaseRootRef, es , $window, DataModels, timeService, $q){

	$scope.dataLoaded = false;
	$scope.dashboards = Dashboards.list();
	$scope.config = config;
	$scope.showInfo = false;
	$scope.displayEnergy = false;
	$scope.trend = true;
	$scope.controlName = "Details";
	$scope.fullScreen = false;
	$scope.widthVal = "Full Screen";
	$scope.transit = false;
	$scope.toggleName = "Expand";
	$scope.activeLoads = false;
	$scope.hideTrend = false;
	$scope.noReturn = true;

	$scope.getLoadValueName = function(loadName, value){
	
		if( typeof value == 'undefined'){
			value = 'NA';
			return value;
		} else {
			
			if( value < 1){
				value = 0;
			}

			$scope.EnergyLoadsMapping = {
				'1ThirdSales': {0:'ON', 1:'OFF'},
				'1ThirdSalsOverride': {1:'ON', 0:'OFF'},
				'AlarmSystem': {0:'ON', 1:'OFF'},
				'Effective Occupancy': {0:'ON', 1:'OFF'},
				'Exhaust Fan Status': {1:'ON', 0:'OFF'},
				'Exterior': {0:'ON', 1:'OFF'},
				'ExteriorOverride': {1:'ON', 0:'OFF'},
				'First': {0:'ON', 1:'OFF'},
				'First Lights Status': {1:'ON', 0:'OFF'},
				'FirstOverride': {1:'ON', 0:'OFF'},
				'Full': {0:'ON', 1:'OFF'},
				'FULL LIGHTS.Load Status': {0:'ON', 1:'OFF'},
				'FullOverride': {1:'ON', 0:'OFF'},
				'HalfValence': {0:'ON', 1:'OFF'},
				'HalfValOverride': {1:'ON', 0:'OFF'},
				'HotWaterHeater': {0:'ON', 1:'OFF'},
				'HotWaterHtrOverride': {1:'ON', 0:'OFF'},
				'OneThirdSales': {0:'ON', 1:'OFF'},
				'OneThirdSalsOverride': {1:'ON', 0:'OFF'},
				'Security': {0:'ON', 1:'OFF'},
				'SecurityOverride': {1:'ON', 0:'OFF'},
				'Sign': {0:'ON', 1:'OFF'},
				'SignOverride': {1:'ON', 0:'OFF'},
				'Supply Fan Status': {1:'ON', 0:'OFF'}
			};

			if( typeof $scope.EnergyLoadsMapping[loadName.split(' - ')[1]] != 'undefined' && $scope.EnergyLoadsMapping[loadName.split(' - ')[1]][value] != 'undefined' ){
				return $scope.EnergyLoadsMapping[loadName.split(' - ')[1]][value];
			} else {
				return value;
			}

		}
	};

	$scope.lastHrKwH = '-';
	$scope.kwhPerSqftAC = '-';
	$scope.kw = '-';
	$scope.siteNames = DataModels.getModelAngularFireRef('Site').$asObject();
	$scope.chartSeriesActiveLoads = [];
	$scope.energyUsage = [];
	$scope.showUsage = false;

	var user = $rootScope.loginService.getCurrentUser();

	Highcharts.setOptions({lang: {loading: '<span class="fa fa-spinner fa-spin fa-2x text-info"></span>'}});

	var loadingStyles = {
		labelStyle: {
			top: '37%'
		},
		style: {
			boxSizing: 'content-box',
			marginLeft: '-1px',
			borderRight: '10px solid #3c3c3c',
			backgroundColor: '#3c3c3c',
			opacity: 1
		}
	};

	$scope.trendConfigActiveLoads = {
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
								var exportURL = '/exportCSV?cnum='+user.customerKey+'&pt='+$scope.returnedData.$id+'&interval='+$scope.interval+'&units='+$scope.intervalUnits+'&sd='+new Date($scope.startDate).getTime()+'&ed='+new Date($scope.endDate).getTime()+'&rollupFunction='+$scope.trendFunction+'&type='+$scope.type;
								$window.open(exportURL);
							}
						}],
						x: -6
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
						var selectedVal = this.x - $scope.timeOffsetInSeconds;
						var d = new Date(this.x);
						$scope.activeLoadTime = formatTime(d.toISOString());

						timeService.toSiteLocalTime($scope.selectedSite.Location, selectedVal, function(convertedTime){
							if(convertedTime){
								$scope.timeZoneAbbr = convertedTime[1];
							}
						});
						$scope.selectUsagePoints = $scope.energyUsage[this.x];
						$scope.kw = this.points[0].y;
						
						//we need to come up with a way to query back for the change in kwh
						if( this.points[0].point.index === 0){
							$scope.lastHrKwH = $scope.kWhSeriesCollection[this.points[0].point.index].v - $scope.kWhSeriesCollection[this.points[0].point.index].v;
						} else {
							$scope.lastHrKwH = $scope.kWhSeriesCollection[this.points[0].point.index].v - $scope.kWhSeriesCollection[this.points[0].point.index - 1].v;
						}

						$scope.kwhPerSqftAC = $scope.kw / $scope.selectedSite.Area;
						
						var str = '';
						for(var i=0;i<this.points.length;i++){
							str = str + "<b style='color: "+this.points[i].series.color+"'>"+this.points[i].series.name + "</b>: " + Highcharts.numberFormat(this.points[i].y, 2) + "<br />";
						}
						return str;
					},
				useHTML: true,
				crosshairs: true,
				shared: true
			},
			loading: loadingStyles
		},
		xAxis: {
			type: 'datetime',
            dateTimeLabelFormats: {
                day: '%e of %b'
            },
			labels: {
				style: {
					color: '#FFF',
					fontWeight: 'bold'
				}
			}
		},
		series: $scope.chartSeriesActiveLoads,
		title: {
			text: ''
		},
		credits: {
			enabled: false
		},
		loading: false
	};

	var formatTime = function(zuluTime){
		//returns : Jun 28, 2015 9:37:27 AM 
		//take in : 2015-06-30T13:35:21.900Z
		var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		var dateParts = zuluTime.split('T')[0];
		var timeParts = zuluTime.split('T')[1].split('.');
		var monthNumber = parseInt( dateParts.split('-')[1] ) - 1;
		var dayNumber = dateParts.split('-')[2];
		var yearNumber = dateParts.split('-')[0];
		return months[monthNumber] + " " + dayNumber + ", " + yearNumber + " " + timeParts[0];
	};

	$scope.fetchEnergyData = function(siteID, siteData){


		timeService.fetchTime( siteData.Location, function(callbackData){

			$scope.trendConfigActiveLoads.loading = true;
			$http({method: 'GET', url: '/getActiveLoadData?cnum='+user.customerKey+'&m=Site&s='+siteID}).
			success(function(processedData, status, headers, config) {
				$scope.energyUsage = processedData.data;
				var series_startDate =  processedData.sd;
				var series_endDate = processedData.ed;

				// get the correct site 
				$scope.selectedSite = $scope.siteNames[siteID];

				/****************************************
					Point Types -
						-JUt9jZN9fF7H-TyWfmm: Current kW
						-JUt9jZN9fF7H-TyWfmn: kWh
				****************************************/
				$scope.searchSitePointsByTypes(siteID, ['-JUt9jZN9fF7H-TyWfmm','-JUt9jZN9fF7H-TyWfmn']).then(
					function(points){
						angular.forEach(points, function(data, id){

							if (data._source.PointType === '-JUt9jZN9fF7H-TyWfmm') {
								$scope.kwID = data._id;
								$scope.kw = data._source.Value.toFixed(2);
							//}
							//if (data._source.PointType === '-JUt9jZN9fF7H-TyWfmn') {
								$scope.kWh = data;
								var pointId = "Model:Point.Property:Value.ItemId:" + data._id + "." + data._id;
								var webServiceURL = '/getLastHourAvgOmniscore?cnum='+user.customerKey+'sd='+series_startDate+'&ed='+series_endDate+'&pt='+pointId;
								$http({method: 'GET', url: webServiceURL}).
									success(function(HrAvgData, status, headers, config) {

										var seriesCollection = [];
										if( HrAvgData.length > 0){
											var initStart = Date.parse(processedData.sd);
											var pointInterval = 1 * 3600 * 1000;
											var timeOffset = callbackData.dstOffset < 0 ? callbackData.dstOffset+1 : callbackData.dstOffset-1;
											var timeOffsetFlip = timeOffset < 0 ? timeOffset * -1 : timeOffset * 1;

											$scope.timeOffsetInSeconds = pointInterval * timeOffsetFlip;

											for (var index in HrAvgData) {
												var series = HrAvgData[index];
												// we are already subtracting an hour
												seriesCollection.push([(new Date(initStart)).getTime() - $scope.timeOffsetInSeconds, series.v ]);
												initStart = initStart + pointInterval;
											}
											$scope.chartSeriesActiveLoads.pop();
											$scope.chartSeriesActiveLoads.push( {pointStart: Date.parse(processedData.sd), pointInterval: pointInterval, "name": "kW", "data": seriesCollection, type: "spline", color: "#7cb5ec" } );
											
											// clean up the processedData
											var newData = {};
											initStart = Date.parse(processedData.sd);
											for(var item in processedData.data){
												var d = new Date(parseInt(item));
												var newTime = (new Date(initStart)).getTime() - $scope.timeOffsetInSeconds;
												newData[newTime] = processedData.data[item];
												initStart = initStart + pointInterval;
											}

											$scope.energyUsage = newData;

											if( HrAvgData.length >= 3){
												$scope.lastHrKwH = HrAvgData[HrAvgData.length-1].v - HrAvgData[HrAvgData.length-2].v;
											} else if ( HrAvgData.length === 2 ){
												$scope.lastHrKwH = HrAvgData[1].v - HrAvgData[0].v;
											} else {
												$scope.lastHrKwH = HrAvgData[0].v;
											}
											//$scope.lastHrKwH = HrAvgData[HrAvgData.length-2].v[pointId] - HrAvgData[HrAvgData.length-1].v[pointId];
											$scope.kwhPerSqftAC = $scope.lastHrKwH / $scope.selectedSite.Area;

										}
										$scope.trendConfigActiveLoads.loading = false;
									}).
									error(function(data, status, headers, config) {
										
									});
							}

							if (data._source.PointType === '-JUt9jZN9fF7H-TyWfmn') {
								$scope.kWh = data;
								var kwhpointId = "Model:Point.Property:Value.ItemId:" + data._id + "." + data._id;
								var kwhwebServiceURL = '/getLastHourAvgOmniscore?cnum='+user.customerKey+'sd='+series_startDate+'&ed='+series_endDate+'&pt='+kwhpointId;
								$http({method: 'GET', url: kwhwebServiceURL}).
									success(function(HrAvgData, status, headers, config) {

										$scope.kWhSeriesCollection = [];
										if( HrAvgData.length > 0){
											var initStart = Date.parse(processedData.sd);
											var pointInterval = 1 * 3600 * 1000;
											for (var index in HrAvgData) {
												var series = HrAvgData[index];
												$scope.kWhSeriesCollection.push({t:(new Date(initStart)).getTime(),v: series.v });
												initStart = initStart + pointInterval;
											}
											//$scope.chartSeriesActiveLoads.pop();
											//$scope.chartSeriesActiveLoads.push( {pointStart: Date.parse(processedData.sd), pointInterval: pointInterval, "name": "kWh","visible": false, "data": seriesCollection, type: "spline", color: "#7cb5ec" } );
											
											if( HrAvgData.length >= 3){
												$scope.lastHrKwH = HrAvgData[HrAvgData.length-1].v - HrAvgData[HrAvgData.length-2].v;
											} else if ( HrAvgData.length === 2 ){
												$scope.lastHrKwH = HrAvgData[1].v - HrAvgData[0].v;
											} else {
												$scope.lastHrKwH = HrAvgData[0].v;
											}
											//$scope.lastHrKwH = HrAvgData[HrAvgData.length-2].v[pointId] - HrAvgData[HrAvgData.length-1].v[pointId];
											$scope.kwhPerSqftAC = $scope.lastHrKwH / $scope.selectedSite.Area;

										}
										$scope.trendConfigActiveLoads.loading = false;
									}).
									error(function(data, status, headers, config) {
										
									});
							}

						});
					});
			}).
			error(function(data, status, headers, config) {
											
			});

		});
	};

	$scope.searchSitePointsByTypes = function(siteID, types){
		var shouldQueries = [];
		angular.forEach(types, function (data, id) {
			var query = {term:{PointType: data}};
			shouldQueries.push(query);
		});
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
							bool:{
								must: [
									{term:{Site: siteID}},
									{
										bool: {
											should : shouldQueries
										}
									}
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
				if(resp.hits && resp.hits.hits && resp.hits.hits.length > 0){
					deferred.resolve(resp.hits.hits);
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
	$scope.toggleList = function(){
		if($scope.hideTrend === false){
			$scope.hideTrend = true;
			$scope.toggleName = "Minimize";
		} else if ($scope.hideTrend === true){
			$scope.hideTrend = false;
			$scope.toggleName = "Expand";
		}
	};
	$scope.aLoadsView = function(){
		$scope.activeLoads = true;
		$scope.trend = false;
	};
	$scope.trendView = function(){
		$scope.trend = true;
		$scope.activeLoads = false;		
	};
	$scope.detailsView = function(){
		$scope.activeLoads = false;
		$scope.trend = false;
	};


	

	//gives us access to the alarmFormatter factory
	$scope.alarmCall = alarmFormatter;

	var keyToObject = function(str){
		var items = str.split('.');
		var obj = {};
		for( var i=0;i<items.length;i++){
			var keys = items[i].split(':');
			if( keys.length === 2){
				if( typeof obj[keys[0]] == 'undefined'){
					obj[keys[0]] = {};
				}
				obj[keys[0]] = keys[1];
			}
		}
		return obj;
	};

	function postprocessAlarms(data) {
		var deferred = $q.defer();

		$scope.searchSitePointsByTypes(data._id).then(function (points) {
			var pointsIndex = {};
			angular.forEach(points, function (point) {
				pointsIndex[point._id] = point._source;
			});

			var devices = [];

			if( typeof data.expressions != 'undefined' && typeof data.expressions.values != 'undefined' && typeof data.expressions.values.alarm != 'undefined'){
				angular.forEach(data.expressions.values.alarm, function(alarmGroup) {
					angular.forEach(alarmGroup, function(alarm) {
						if (!alarm.history) {
							return;
						}
						angular.forEach(alarm.history, function(history) {
							if (history.model === 'Point') {
								history.Point = pointsIndex[history.itemId];
							}
						});
					});
				});
			}

			deferred.resolve(devices);
		});

		return deferred.promise;
	}

	$scope.siteData = function(data){
		angular.forEach($scope.pins, function(obj,id){
			if(obj._id == data){
				$scope.getEnergyData(obj);
			}
		});
	};

	$scope.fetchExpressions = function(model, id){
		var deferred = $q.defer();
		var ref = DataModels.getModelItemRef(model, id).child('expressions');
		ref.once('value', function(expressSnap){
			deferred.resolve( expressSnap.val() );
		});
		return deferred.promise;
	};
	$scope.$on("itemSelected", function(evt, data, model, pins, hasData) {

		if( hasData === false){
			$scope.noReturn = false;
		} else {
			$scope.noReturn = true;
		}

		var user = $rootScope.loginService.getCurrentUser();
		$scope.pinModel = model;
		
		if(typeof $scope.pins == 'undefined'){
			$scope.pins = pins;
		}

		$scope.loading = true;
		$scope.showInfo = true;
		$scope.details = data;

		$scope.fetchExpressions(model, data._id).then(
			function(exp){
				$scope.details.expressions = exp;

				$scope.data = {};
				angular.forEach($scope.pins, function(obj,id){
					if(obj._id == data._id){
						obj.Name = data.Name;
						$scope.data.sites = obj._id;
					}
				});

				if ( typeof data.degreeDays != 'undefined'){
					$scope.displayEnergy = true;
				} else {
					$scope.displayEnergy = false;
				}
				
				// if displayEnergy is set

				// we need omniscore for this site
				// Model:Site.Property:expressions.ExpressionType:values|cv.ExpressionCategory:Performance.Name:Daily Degree Days.ItemId:" + item.Site + "." + item.Site;
				// we also need average omniscore

				if( $scope.displayEnergy && $scope.noReturn !== false ){
					$scope.getEnergyData(data);
				}

			}
		);

	});


	$scope.getEnergyData = function(siteData){
		$scope.selectUsagePoints = [];
		if( siteData ){
			if( $stateParams.name == 'Energy' ){
				//only pull data when on energy view
				$scope.fetchEnergyData(siteData._id, siteData);
			}

			if( siteData.speedKmHr ){
				siteData.Speed = parseFloat(siteData.speedKmHr / 1.609344).toFixed(2);
			}

			postprocessAlarms(siteData).then(function(){
				$scope.details = siteData;
				//$scope.$apply();
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			});
		} else {
			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;
		}

		$scope.dataSiteID = siteData._id;

		var pointId = "Model:Site.Property:expressions.ExpressionType:values|cv.ExpressionCategory:Performance.Name:OmniScore.ItemId:" + siteData._id + "." + siteData._id;

		$scope.chartSeries = [];
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
									var exportURL = '/exportCSVEnergy?cnum='+user.customerKey+'&site='+$scope.datasiteData._id+"&area="+data.Area;
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
									//alert ('Time: '+ this.x +', Value: '+ this.y);
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
				},
				loading: loadingStyles
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
			loading: true
		};

		webServiceURL = '/getThirtyDayAverage?cnum='+user.customerKey+'&pt='+pointId;

		var tempoKeyObject = keyToObject(pointId);
		$http({method: 'GET', url: webServiceURL}).
		success(function(processedData, status, headers, config) {

			if(processedData.length === 0){
				$scope.trendConfigActiveLoads.loading = false;
				if( typeof $scope.details != 'undefined' && $scope.details != null){
					$scope.details.degreeDays = null;
				}
				$scope.kwhPerSqft = null;
				$scope.CurrentAvgOmniScore = null;
				$scope.noReturn = false;
			}else{
				$scope.noReturn = true;


				var seriesCollection = [];

				for (var index in processedData) {
					var series = processedData[index];
					// do if block
					if( typeof series.v[tempoKeyObject.ItemId] != 'undefined'){
						seriesCollection.push([(new Date(Date.parse(series.t))).getTime(), series.v[tempoKeyObject.ItemId]]);          
					} else {
						seriesCollection.push([(new Date(Date.parse(series.t))).getTime(), series.v.expression]);          
					}
				}

				$scope.chartSeries.pop();
				$scope.chartSeries.push( {"name": 'OmniScore', color: "#7cb5ec", "data": seriesCollection, dataGrouping: {enabled: false} } );
				$scope.trendConfig.loading = false;

				var getKWHPoints = function(model, type, site, sqft) {
					var searchObj = {
						index: es.getIndexName(),
						type:  model,
						explain: false,
						lowercaseExpandedTerms: false,
						body: {
							size: 500000,
							sort: [ "Name.raw" ],
							query: {
								filtered: {
									filter: {
										bool: {
											must: [
												{ term: {Site: site } },
												{ term: {PointType: type } }
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
								if(resp.hits && resp.hits.hits && resp.hits.hits.length > 0){
									var pointId = "Model:Point.Property:Value.ItemId:" + resp.hits.hits[0]._id + "." + resp.hits.hits[0]._id;
									var webServiceURL = '/getThirtyDayAverage?cnum='+user.customerKey+'&pt='+pointId;
									$http({method: 'GET', url: webServiceURL}).
									success(function(processedData, status, headers, config) {
										// this will be the sum of the kwh point
										var totalKwh = parseFloat(processedData[processedData.length - 1].v[resp.hits.hits[0]._id]) - parseFloat(processedData[0].v[resp.hits.hits[0]._id]);
										$scope.kwhPerSqft = (totalKwh / siteData.Area).toFixed(2);
									}).
									error(function(data, status, headers, config) {
																	
									});
								} else {

								}
							},
							function(err) {
								
							}
						)
					;
				};
				// get kwh point
				getKWHPoints('Point', '-JUt9jZN9fF7H-TyWfmn', siteData._id, siteData.Area);
				/*** WORKS ***/
				webServiceURL = '/getOmniScoreAverage?cnum='+user.customerKey;
				$http({method: 'GET', url: webServiceURL}).
				success(function(processedData, status, headers, config) {
					var seriesCollection = [];
					var counter = 0;

					var findLastValue = function(){
						return $scope.chartSeries[0].data[$scope.chartSeries[0].data.length - 1];
					};
					
					for (var index in processedData) {
						var series = processedData[index];		
						//seriesCollection.push([(new Date(Date.parse(series.t))).getTime(), series.v]);          
						if( typeof $scope.chartSeries[0].data[index] != 'undefined' ){
							seriesCollection.push([$scope.chartSeries[0].data[index][0], series.v]);
						} else {
							var lst = findLastValue();
							seriesCollection.push([lst ? lst[0] : (new Date(Date.parse(series.t))).getTime(), series.v]);
						}
					}
					$scope.CurrentAvgOmniScore = (processedData[processedData.length-1].v).toFixed(2);
					$scope.chartSeries.push( {"name": 'OmniScore Avg', color: "#F7A35C", "data": seriesCollection, dataGrouping: {enabled: false} } );
				}).
				error(function(data, status, headers, config) {
												
				});

			}

		}).
		error(function(data, status, headers, config) {
										
		});
	};


	$scope.seeMore = function(id){
		$state.go('auth.dashboard.ready', {name:config.dashboard, modelName:'Site', scopeID: id});
	};

	$rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
	}); 

}).controller('modelDetailsEditCtrl', function($scope, config, Dashboards, $rootScope){
	$scope.config = config;
	$scope.config.query = [];
	//$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

	var user = $rootScope.loginService.getCurrentUser();	
	if (user) {
		var dbs = Dashboards.getUserCustomDashboards(user.uid).then(function (ok) {
			ok.$asObject().$loaded().then(function (data) {
			$scope.dashboards = data;
			});
		});
	}
	//$scope.dashboards = Dashboards.list();
});
