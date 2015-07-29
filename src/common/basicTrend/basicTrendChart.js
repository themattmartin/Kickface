angular.module('omniboard.basicTrend', ['adf.provider', 'highcharts-ng'])

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
	.widget('basicTrend', {
		title: 'Graph',
		description: 'Displays a basic trend graph',
		controller: 'basicTrendCtrl',
		templateUrl: 'basicTrend/basicTrend.tpl.html',
		edit: {
			templateUrl: 'basicTrend/edit.tpl.html',
			reload: false,
			controller: 'basicTrendEditCtrl'
		}
	});
})

.controller('basicTrendCtrl', function($scope, config, $rootScope, DataModels, $log, $interval, pageLevelData){

	$scope.dataLoaded = false;
	$scope.config = config;
	$scope.key = config.key;
	$scope.returnedData = null;

	var check;
	check = $interval(function() {
		var data = pageLevelData.get($scope.key);
		if( typeof data != 'undefined'){
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

}).controller('basicTrendEditCtrl', function($scope, config, $rootScope, DataModels, $log){

	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config = config;
	$scope.show = 'graph';
	$scope.config.yAxis = '';


	if(typeof $scope.config.graphType == 'undefined'){
		$scope.config.graphType = 'line';
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

	$scope.updateModelTypes = function(){
		$scope.modelTypes = DataModels.getAllModelTypes($scope.config.modelName).$asObject();
		if($scope.config.modelName){
			$scope.trendables = DataModels.listTrendables($scope.config.modelName).$asObject();
		}
	};

	if(!config.query){
		config.query = [];
	}
	if( !$scope.config.query ){
		$scope.config.query = config.query;
	}

	$scope.addQuery = function(){
		var yAxis = $scope.config.yAxis;
		var valueProp = $scope.config.valueProp;
		var graphType = $scope.config.graphType;

		var propertiesObj = {};
		propertiesObj[config.modelName+"Type"] = config.modelType;

		var query = {
			modelName: $scope.config.modelName,
			properties:propertiesObj,
			key: $scope.config.modelType,
			graphType: graphType,
			valueProp: valueProp,
			yAxis:yAxis,
			labelGraph: $scope.config.labelGraph,
			labelGraphModel: $scope.config.labelGraphModel
		};
		
		//In case the model chosen has no types
		if(config.modelType){
			query.typeName = $scope.modelTypes[config.modelType].Name;
		}

		if($scope.editMode){
			$scope.config.query[$scope.editModeKey] = query;
		}else{
			$scope.config.query.push(query);
		}
		$scope.editMode = false;

		$scope.checkQuery = angular.copy($scope.config.query);
	};

	$scope.getDatesFromDateRange = function(dateRangeOption) {
		var startDate, endDate;

		$scope.config.startDate = '';
		$scope.config.endDate = '';

		switch ( dateRangeOption ) {
			case "Month To Date":
				d = new Date();
				startDate = new Date(d.getYear()+1900, d.getMonth(), 1, 0, 0, 0);
				endDate = d;
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Today":
				startDate = new Date();
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Week To Date":
				function getStartOfWeek(d) {
					d = new Date(d);
					var day = d.getDay(),
					diff = d.getDate() - day + (day === 0 ? -6:0); // adjust when day is sunday
					var returnDate = new Date(d.setDate(diff));
					returnDate.setHours(0);
					returnDate.setMinutes(0);
					returnDate.setSeconds(0);
					return returnDate;
				}
				startDate= getStartOfWeek( new Date() ).getTime();
				endDate = new Date().getTime();
				break;
			case "Year To Date":
				function startOfYear(d){
					return new Date(d.getFullYear(),0,1,0,0,0);
				}
				d = new Date();
				startDate = startOfYear( new Date() );
				endDate = d;
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last Year":
				startDate = new Date();
				startDate.setDate(startDate.getDate()-365);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last 30 Days":
				startDate = new Date();
				startDate.setDate(startDate.getDate()-30);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last Week":
				startDate = new Date();
				startDate.setDate(startDate.getDate()-6);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
		}

		$scope.config.startDate = startDate;
		$scope.config.endDate = endDate;

		return { SD: startDate, ED: endDate };
	};

	$scope.removeQuery = function(index){
		$scope.config.query.splice(index,1);
		$scope.checkQuery.splice(index,1);
	};

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

	$scope.checkQuery = angular.copy($scope.config.query);

	angular.forEach($scope.checkQuery, function(val, data){
		$scope.checkQuery[data].selected = false;
	});

	$scope.editMode = false;

	$scope.editQuery = function(key,value){
		$scope.editMode = (value.selected !== true);
		$scope.config.modelName = value.modelName;
		$scope.config.modelType = value.properties.PointType;
		$scope.config.yAxis = value.yAxis;
		$scope.config.graphType =value.graphType;
		$scope.config.modelYAxisInterval = value.yAxis.interval;
		$scope.config.labelGraph = value.labelGraph || value.typeName;
		$scope.config.labelGraphModel = value.labelGraphModel;
		$scope.updateSelectBoxes(value.key);
		$scope.editModeKey = key;
	};

	$scope.updateSelectBoxes = function(key){
		angular.forEach($scope.checkQuery, function(val){
			val.selected = key === val.key;
		});
	};

	$scope.updateLabelGraph = function() {
		$scope.config.labelGraph = $scope.modelTypes[$scope.config.modelType].Name;
	};

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
		$scope.config.graphType = "line";
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

	if(typeof $scope.config.show24hr == "undefined"){
		$scope.config.show24hr = true;
	}

	if(typeof $scope.config.labelGraphModel == "undefined"){
		$scope.config.labelGraphModel = "Gateway";
	}

	if(typeof $scope.config.valueProp == "undefined"){
		$scope.config.valueProp = "Value";
	}

	if(typeof $scope.config.yAxisAuto == "undefined"){
		$scope.config.yAxisAuto = "true";
	}

	if(typeof $scope.config.labelGraph == "undefined"){
		if ($scope.config.query.length) {
			$scope.config.labelGraph = $scope.config.query[$scope.config.query.length - 1].typeName;
		} else {
			$scope.config.labelGraph = "Select";
		}
	}
})

.directive('obBasicTrend', function ($http, $window) {
    return {
        restrict: 'EA',
        replace: true,
        templateUrl: 'basicTrend/trendWidget.tpl.html',
        scope:{
            returnedData: '=',
            config: '='
        },

        controller: function ($scope, $element, $attrs, $http, $window, $rootScope, $q, $interval, $timeout) {

			$scope.trendControlName = "Table";
			$scope.plotDrawn = false;
			$scope.localYaxis = [] ;
			$scope.localSeriesData = [];
			$scope.loaded = false;

			$timeout(function () {
				if ($scope.plotDrawn === false) {
					$scope.noData = true;
				}
			}, 60000);

			var user = $rootScope.loginService.getCurrentUser();
			if( user ){

				$scope.plot = function(){
					if( typeof $scope.returnedData != 'undefined'){
						$scope.loaded = true;

						Highcharts.setOptions({
							global: {timezoneOffset: -$scope.tzOffset * 60}
						});

						var trendConfig = {
							options: {
								chart: {
									type: 'line',
									zoomType: 'xy'
								},
								yAxis: {reversed: false,title: ''},
								exporting: {
									buttons: {
										contextButton: {
											menuItems: [{
												text: "Export CSV",
												onclick: function () {
													var exportURL = '/exportCSV?cnum='+user.customerKey+'&pt='+$scope.returnedData.$id+'&interval='+$scope.interval+'&units='+$scope.intervalUnits+'&sd='+new Date($scope.startDate).getTime()+'&ed='+new Date($scope.endDate).getTime()+'&rollupFunction='+$scope.trendFunction+'&type='+$scope.type;
													$window.open(exportURL);
												}
											}]
										}
									}
								},
								plotOptions: {
									series: {
										step: 'left',
										connectNulls: false,
										stacking: ''
									}
								},
								tooltip: {
									formatter:
										function() {
											if( trendConfig.options.obFormat == "currency" ){
												returnSTR= Highcharts.dateFormat('%m/%d/%y %H:%M', this.x) + '<br /><b>Value: </b>$' + Highcharts.numberFormat(this.y, 0);
											} else if( trendConfig.options.obFormat == "degree"){
												returnSTR= Highcharts.dateFormat('%m/%d/%y %H:%M', this.x) + '<br /><b>Value: </b>' + Highcharts.numberFormat(this.y, 0) +'&deg;';
											} else {
												returnSTR= Highcharts.dateFormat('%m/%d/%y %H:%M', this.x) + '<br /><b>Value: </b>' + this.y;
											}

											return returnSTR;
										},
									useHTML: true
								}
							},
							title: {
								text: ''
							},
							xAxis: {
								type: 'datetime',
								dateTimeLabelFormats: {
									day: '%e of %b'
								}
							},
							yAxis: $scope.yAxisForTrend,
							series: $scope.seriesData,
							credits: {
								enabled: false
							},
							loading: false,
							useHighstocks: true
						};

						var startDate;
						var endDate;
						if( $scope.config.show24hr ){
							startDate = new Date();
							startDate.setHours(startDate.getHours()-24);
							startDate = startDate.getTime();
							endDate = new Date().getTime();
						} else {
							startDate = new Date($scope.config.startDate).getTime();
							endDate = new Date($scope.config.endDate).getTime();
						}

						var pointId = [];

						for( var i in $scope.returnedData ){
							//we will build the point key before pushing it
							//Model:Point.Property:Value.ItemId:-JQPBZ129j5PdZ0krrfh.-JQPBZ129j5PdZ0krrfh
							var tempoDBkey = "Model:"+$scope.config.modelName+".Property:"+$scope.config.valueProp+".ItemId:"+$scope.returnedData[i].$id.toString()+'.'+$scope.returnedData[i].$id.toString();
							pointId.push(tempoDBkey);
						}

						$scope.widgetConfig = $scope.config;
						// these variables are also used in setting the dynamic yAxis as well as the call to tempoIQ
						interval = $scope.config.interval;
						var unit = $scope.config.intervalUnits;

						utcSD = new Date(startDate);
						utcED = new Date(endDate);

						//console.log( utcSD , utcED );

						// convert to msec
						// add local time zone offset 
						// get UTC time in msec
						utcForSD = utcSD.getTime() + (utcSD.getTimezoneOffset() * 60000);
						utcForED = utcED.getTime() + (utcED.getTimezoneOffset() * 60000);
						
						// create new Date object for different city
						// using supplied offset

						finalSD = (new Date(utcForSD + (3600000*$scope.diff))).getTime();
						finalED = (new Date(utcForED + (3600000*$scope.diff))).getTime();

						var webServiceURL = '/getMultiData?cnum='+user.customerKey+'&pt='+pointId+'&interval='+interval+'&units='+unit+
											'&sd='+finalSD+'&ed='+finalED+'&rollupFunction='+$scope.config.trendFunction+'&interpolate='+$scope.config.interpolate;

						$http({method: 'GET', url: webServiceURL}).
						success(function(processedData, status, headers, config) {
							var data = processedData.series;
							// use in setting dynamic yAxis
							var firstDate = processedData.firstDate;

							var getPointTypeID = function(pointID){
								var pointTypeID = null;
								angular.forEach($scope.returnedData, function(val,id){
									if( val.$id == pointID){
										pointTypeID = val.$PointType.$id;
									}
								});
								return pointTypeID;
							};
							var getYAxisSuffix = function(pointID){
								var retVar = '';
								angular.forEach($scope.returnedData, function(val,id){
									if( val.$id == pointID){
										angular.forEach($scope.config.query, function(queryData,id){
											if( val.PointType == queryData.key){
												retVar = queryData.yAxis;
											}
										});
									}
								});
								return retVar;
							};
							var lookupPointType = function(id){
								var retVar;
								for( var i=0;i<$scope.returnedData.length;i++){
									if( id == $scope.returnedData[i].$id){
										for (var q = 0; q < $scope.config.query.length; q++) {
											if ($scope.config.query[q].key == $scope.returnedData[i].PointType) {
												retVar = $scope.config.query[q].labelGraph;

												if ($scope.config.query[q].labelGraphModel) {
													var modelKey = '$' + $scope.config.query[q].labelGraphModel;
													if ($scope.returnedData[i][modelKey] && $scope.returnedData[i][modelKey].Name) {
														retVar = retVar +' ('+$scope.returnedData[i][modelKey].Name+')';
													}
												}
											}
										}
										//if no labelGraph set up before
										if (retVar === undefined) {
											retVar = $scope.returnedData[i].Name;
										}
										break;
									}
								}
								return retVar;
							};
							var getPointInterval = function(unit, interval){
								var pointInterval = 0;
								switch( unit ){
									case "hour":
										pointInterval = interval * 3600 * 1000;
										break;
									case "min":
										pointInterval = interval * 60 * 1000;
										break;
									case "day":
										pointInterval = interval * 24 * 3600 * 1000;
										break;
									case "month":
									// TO-DO: NEED TO COME BACK AND FIGURE THESE OUT
										pointInterval = interval * 3600 * 1000;
										break;
									case "year":
									// TO-DO: NEED TO COME BACK AND FIGURE THESE OUT
										pointInterval = interval * 3600 * 1000;
										break;
								}

								return pointInterval;
							};
							var getSeriesGraphType = function(id){
								var series_data_type = 'line';
								for( var item in $scope.widgetConfig.query){
									if(getPointTypeID(id) === $scope.widgetConfig.query[item].key){
										series_data_type = $scope.widgetConfig.query[item].graphType;
										break;
									}
								}
								return series_data_type;
							};
							var setOpposite = function(key){
								var oppositeYAxis = false;
								if( ($scope.localYaxis.length % 2) === 0){
									oppositeYAxis = true;
								}
								return oppositeYAxis;
							};
							var doesYAxisExistForSuffix = function(suffix){
								// returns -1 if no yaxis exists
								// returns the position of the yAxis if it does exist
								var exists = -1;

								for(var i=0;i<$scope.localYaxis.length;i++){
									if( $scope.localYaxis[i].title.text == suffix){
										exists = i;
										break;
									}
								}

								return exists;
							};
							//var addToYAxis = function(name,opposite,key,yAxisSuffix){
							var addToYAxis = function(name,key,yAxisSuffix){
								if( doesYAxisExistForSuffix(yAxisSuffix) === -1 ){
									var opposite = setOpposite(key);
									$scope.localYaxis.push(
										{ // Primary yAxis
											labels: {
												format: '{value}',
												style: {
													color: Highcharts.getOptions().colors[key]
												}
											},
											title: {
												text: yAxisSuffix,
												style: {
													color: Highcharts.getOptions().colors[key]
												}
											},
											opposite: opposite
										}
									);
								}
							};
							var addSeriesToGraph = function(id,name,type,yAxis,data,pointStart,pointInterval,toolTipSuffix){
								var yAxisColor = $scope.localYaxis[yAxis].title.style.color;

								$scope.localSeriesData.push(
									{
										//color: yAxisColor,
										id: id,
										name: name,
										type: type,
										yAxis: yAxis,
										data: data,
										pointStart: pointStart,
										pointInterval: pointInterval,
										tooltip: {
											valueSuffix: toolTipSuffix
										}
									}
								);
							};

							if( typeof data != 'undefined' ){
								$scope.localSeriesData = [];
								for(var key=0; key<data.length;key++){
									// use to invert lighting
									if( typeof $scope.widgetConfig.invertLighting != 'undefined' && $scope.widgetConfig.invertLighting == "true" ){
										for( var dataNum=0; dataNum<data[key].data.length; dataNum++){
											if( data[key].data[dataNum] === 0 ){
												data[key].data[dataNum] = 1;
											} else if( data[key].data[dataNum] === 1 ){
												data[key].data[dataNum] = 0;
											}
										}
									}

									// this is need to set the pointInterval for each series of data.
									// essentially this lest us dynamically build the xAxis
									var pointStart = Date.parse(firstDate) + ($scope.startDateOffset);

									if($scope.config.interpolate === false){
										pointInterval = getPointInterval(1, 'min');
									}else{
										pointInterval = getPointInterval(unit, interval);
									}
									// set the graph type of the series being looped through (line,column... etc.)
									var series_data_type = getSeriesGraphType(data[key].id);
									// used to make sure both left and right side of the graph have axis
									//var oppositeYAxis = setOpposite(key);
									// get the name of the point
									var ptTypeName = lookupPointType(data[key].id);
									// add a yAxis for the series
									var yAxisSuffix = getYAxisSuffix(data[key].id);
									//addToYAxis(ptTypeName,oppositeYAxis,key,yAxisSuffix );
									addToYAxis(ptTypeName,key,yAxisSuffix );
									// add the series to the graph;
									if( doesYAxisExistForSuffix(yAxisSuffix) === -1 ){
										// if we do not find a yAxis then we created a new one
										addSeriesToGraph(data[key].id,ptTypeName,series_data_type,$scope.localYaxis.length - 1,data[key].data,pointStart,pointInterval,$scope.config.yAxis);
									} else {
										// we found a yAxis to match  so we will use that
										addSeriesToGraph(data[key].id,ptTypeName,series_data_type, doesYAxisExistForSuffix(yAxisSuffix),data[key].data,pointStart,pointInterval,$scope.config.yAxis);
									}
								}

								// set the series and yAxis
								trendConfig.series = $scope.localSeriesData;
								trendConfig.yAxis = $scope.localYaxis;
								// load the data in a scope variable to draw the chart
								$scope.trendConfig = trendConfig;

								$scope.plotDrawn = true;
								$scope.dataLoaded = true;
								$scope.dataLoadedError = false;
							} else {
								$scope.dataLoaded = true;
								$scope.dataLoadedError = true;
							}
						}).
						error(function(data, status, headers, config) {
							$scope.dataLoadedError = true;
							$scope.dataLoaded = true;
						});
					}
				};

				$scope.setView = function(){
					if ($scope.show == 'graph'){
						$scope.show = 'table';
						$scope.trendControlName = "Graph";
					} else {
						$scope.show = 'graph';
						$scope.trendControlName = "Table";
					}
				};

				$scope.show = 'graph';
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;

				$scope.$watch('returnedData',function(newVal, oldVal){
					if(newVal != null){
						$scope.plotran = false;
						var loadComplete = false;
						angular.forEach(newVal,function(val,id){
							val.$loaded().then(function(data){

							});
							loadComplete = true;
						});

						if(loadComplete) {
							if( $scope.config.show24hr ){
								var cleanUpdate = $rootScope.$on('updateSiteTime', function(evt,data, tzOffset){
									$scope.tzOffset = tzOffset;
									var clientDate = new Date();
									var clientTZ = clientDate.getTimezoneOffset() / 60;

									if( clientDate.getTimezoneOffset() > 0 ){
										clientTZ = clientTZ * -1;
									}

									$scope.diff = (tzOffset - clientTZ);
									$scope.startDateOffset = (tzOffset  /-60)* 3600 * 1000;
									$scope.endDate =  new Date();
									$scope.startDate = new Date();
									$scope.startDate.setHours(data.getHours()-24);
									$scope.startDate.setMinutes(data.getMinutes());
									$scope.startDate.setSeconds(data.getSeconds());
									$scope.interval = 1;
									$scope.intervalUnits = "hour";
									if( !$scope.plotran ){
										$scope.plot();
										$scope.plotran = true;
									}
								});
							} else {
								$rootScope.$on('updateSiteTime', function(evt,data, tzOffset){
									$scope.tzOffset = tzOffset;
									var clientDate = new Date();
									var clientTZ = clientDate.getTimezoneOffset() / 60;
									if( clientDate.getTimezoneOffset() > 0 ){
										clientTZ = clientTZ * -1;
									}
									$scope.diff = (tzOffset - clientTZ);

									$scope.startDateOffset = 0;
									$scope.plot();
								});
							}
						}
					}
				});
			}
		}
	};
});