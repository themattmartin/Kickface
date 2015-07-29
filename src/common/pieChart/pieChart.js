
angular.module('omniboard.pieChart', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('pieChart', {
		title: 'Pie Chart',
		description: 'Displays a pie chart',
		controller: 'pieChartCtrl',
		templateUrl: 'pieChart/pieChart.tpl.html',
		edit: {
			templateUrl: 'pieChart/edit.tpl.html',
			reload: false,
			controller: 'pieChartEditCtrl'


		}
	});
})
								
.controller('pieChartCtrl', ['$scope','config','$rootScope','DataModels','$log','$interval','pageLevelData','$http', function ($scope, config, $rootScope, DataModels, $log, $interval, pageLevelData, $http) {
	console.log('pieChartCtrl');
	$scope.dataCompletelyLoaded = false;
	$scope.config = config;
	$scope.key = config.key;
	$scope.returnedData = null;

	if(!$scope.config.unitName){
		$scope.config.unitName = '';
	}
	var updateScopeVars = function(data,loadMultiple,dataCompletelyLoaded, dataLoadedError){
		$scope.lastUpdate = new Date();
		$scope.returnedData = data;

		var startDate = new Date($scope.config.startDate).getTime();
		var endDate = new Date($scope.config.endDate).getTime();
		var user = $rootScope.loginService.getCurrentUser();
		var unit = 'day';
		var interval = parseInt((endDate - startDate) / (1000 * 60 * 60 * 24));
		var pointId = [];
		$scope.pieData = [];
		for( var i in $scope.returnedData ){
			//we will build the point key before pushing it
			//Model:Point.Property:Value.ItemId:-JQPBZ129j5PdZ0krrfh.-JQPBZ129j5PdZ0krrfh
			var tempoDBkey = "Model:"+$scope.config.modelName+".Property:"+$scope.config.valueProp+".ItemId:"+$scope.returnedData[i].$id.toString()+'.'+$scope.returnedData[i].$id.toString();
			pointId.push(tempoDBkey);
		}
		var webServiceURL = '/getMultiData?cnum='+user.customerKey+'&pt='+pointId+'&interval='+interval+'&units='+unit+ '&sd='+startDate+'&ed='+endDate+'&rollupFunction='+$scope.config.trendFunction + '&interpolate=true';

		$http({method: 'GET', url: webServiceURL}).
		success(function(processedData, status, headers, config) {
			console.log("processedData", processedData);
			angular.forEach(processedData.series, function(val,index){
				console.log("val", val, "index", index);
				var pointData = [];

				var name = val.name.split('.');
				var dataRef = DataModels.getItem('Point', val.id);
				dataRef.$relationsPromise.then(function() {
					var name = dataRef.Name;
					if ($scope.config.labelGraphModel) {
						var modelKey = '$' + $scope.config.labelGraphModel;
						if (dataRef[modelKey] && dataRef[modelKey].Name) {
							name = name +' ('+dataRef[modelKey].Name+')';
						}
					}
					pointData[0] = name;
					pointData[1] = val.data[0];
					$scope.pieData.push(pointData);				
					$scope.dataCompletelyLoaded = true;
					$scope.dataLoadedError = false;								
				});
			});
		}).error(function(processedData, status, headers, config) {
			$scope.dataLoadedError = true;
			console.log("Error in getting data from TempoDB");
		});
		$scope.loadMultiple = loadMultiple;
	};

	var check = $interval(function () {
		var data = pageLevelData.get($scope.key);
		if (typeof data != 'undefined') {
			$interval.cancel(check);
			updateScopeVars(data,true,true,false);
			check = "undefined";
		}
		
	}, 750, 80);

	$rootScope.$on('widget:reloading:' + $scope.key, function () {
		$scope.dataCompletelyLoaded = false;
		$scope.dataLoadedError = false;
	});



}])
.controller('pieChartEditCtrl', ['$scope','config','$rootScope','DataModels','$log', function ($scope, config, $rootScope, DataModels, $log) {
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.units = {};	
	$scope.getUnits = function (){
		var unitRef = DataModels.getItems('Unit').$asObject();
		unitRef.$loaded().then(function (data) {
				angular.forEach(data, function (dataInItem, key) {
					$scope.units[key] = dataInItem;	
					$scope.unitsAvailable = true;					
			});
		});			
	};		
	$scope.getUnits();	
	
	$scope.config = config;
	$scope.show = 'graph';
	if (typeof $scope.config.graphType == 'undefined') {
		$scope.config.graphType = 'line';
	}
	$scope.getPropertyValue = function (prop) {
		if (prop.component == 'select') {
			return '$' + prop.label + '.Name';
		} else {
			return prop.label;
		}
	};
	$scope.plotDrawn = false;
	$scope.verifyPossiblePointsReturned = function () {
		var d1 = new Date($scope.config.startDate);
		var d2 = new Date($scope.config.endDate);
		var diff = d1.getTime() - d2.getTime();
		var possible;
		if ($scope.config.intervalUnits == 'min') {
			possible = diff / 1000 / 60 / $scope.config.interval;
		} else if ($scope.config.intervalUnits == 'hour') {
			possible = diff / 1000 / 60 / 60 / $scope.config.interval;
		} else if ($scope.config.intervalUnits == 'day') {
			possible = diff / 1000 / 60 / 60 / 24 / $scope.config.interval;
		} else if ($scope.config.intervalUnits == 'month') {
			possible = diff / 1000 / 60 / 60 / 24 / 30 / $scope.config.interval;
		} else if ($scope.config.intervalUnits == 'year') {
			possible = diff / 1000 / 60 / 60 / 24 / 365 / $scope.config.interval;
		}
		$scope.totalPossibleResults = Math.ceil(Math.abs(possible));
	};
	$scope.verifyPossiblePointsReturned();

	$scope.updateUnitName = function () {
		$scope.config.unitName = '';
		if($scope.units){
			$scope.config.unitName = $scope.units[$scope.config.units].Name;
		}
	};
	
	$scope.updateModelTypes = function () {
		$scope.modelTypes = DataModels.getAllModelTypes($scope.config.modelName).$asObject();
		if ($scope.config.modelName) {
			$scope.trendables = DataModels.listTrendables($scope.config.modelName).$asObject();
		}
	};
	if (!config.query) {
		config.query = [];
	}
	if (!$scope.config.query) {
		$scope.config.query = config.query;
	}
	$scope.addQuery = function () {
		var yAxis = $scope.config.yAxis;
		var valueProp = $scope.config.valueProp;
		var graphType = $scope.config.graphType;
		var propertiesObj = {};
		propertiesObj[config.modelName + 'Type'] = config.modelType;
		var query = {
			modelName: $scope.config.modelName,
			properties: propertiesObj,
			key: $scope.config.modelType,
			graphType: graphType,
			valueProp: valueProp,
			labelGraph: $scope.config.labelGraph,
			labelGraphModel: $scope.config.labelGraphModel
		};
		if (config.modelType) {
			query.typeName = $scope.modelTypes[config.modelType].Name;
		}
		if ($scope.editMode) {
			$scope.config.query[$scope.editModeKey] = query;
		} else {
			$scope.config.query.push(query);
		}
		$scope.editMode = false;
		$scope.checkQuery = angular.copy($scope.config.query);
	};
	$scope.removeQuery = function (index) {
		$scope.config.query.splice(index, 1);
		$scope.checkQuery.splice(index, 1);
	};
	$rootScope.$on('dashboard:' + $scope.key + ':complete', function (evt, data) {
		if (data) {
			$scope.lastUpdate = new Date();
			$scope.returnedData = data;
		} else {
			$log.error('no data returned for ', $scope.key);
		}
	});
	if (typeof $scope.modelNames != 'undefined') {
		$scope.updateModelTypes();
	}
	$scope.dateOptions = {
		'year-format': '\'yy\'',
		'starting-day': 1
	};
	$scope.chartSeries = [];
	$scope.openedTo = false;
	$scope.openedFrom = false;
	$scope.op = function ($event, openItem) {
		$event.preventDefault();
		$event.stopPropagation();
		$scope[openItem] = true;
	};
	$scope.checkQuery = angular.copy($scope.config.query);
	angular.forEach($scope.checkQuery, function (val, data) {
		$scope.checkQuery[data].selected = false;
	});
	$scope.editMode = false;
	$scope.editQuery = function (key, value) {
		$scope.editMode = value.selected !== true;
		$scope.config.modelName = value.modelName;
		$scope.config.modelType = value.properties.PointType;
		$scope.config.graphType = value.graphType;
		$scope.config.labelGraph = value.labelGraph || value.typeName;
		$scope.config.labelGraphModel = value.labelGraphModel;
		$scope.updateSelectBoxes(value.key);
		$scope.editModeKey = key;
	};
	$scope.updateSelectBoxes = function (key) {
		angular.forEach($scope.checkQuery, function (val) {
			val.selected = key === val.key;
		});
	};
	$scope.updateLabelGraph = function () {
		$scope.config.labelGraph = $scope.modelTypes[$scope.config.modelType].Name;
	};
	if (typeof $scope.config.modelName == 'undefined') {
		$scope.config.modelName = 'Point';
		$scope.updateModelTypes();
	}
	if (typeof $scope.config.intervalUnits == 'undefined') {
		$scope.config.intervalUnits = 'hour';
	}
	if (typeof $scope.config.interval == 'undefined') {
		$scope.config.interval = 1;
	}
	if (typeof $scope.config.graphType == 'undefined') {
		$scope.config.graphType = 'line';
	}
	if (typeof $scope.config.showAvg == 'undefined') {
		$scope.config.showAvg = 'false';
	}
	if (typeof $scope.config.interpolate == 'undefined') {
		$scope.config.interpolate = 'false';
	}
	if (typeof $scope.config.trendFunction == 'undefined') {
		$scope.config.trendFunction = 'mean';
	}
	if (typeof $scope.config.invertLighting == 'undefined') {
		$scope.config.invertLighting = 'false';
	}
	if (typeof $scope.config.show24hr == 'undefined') {
		$scope.config.show24hr = true;
	}
	if (typeof $scope.config.labelGraphModel == 'undefined') {
		$scope.config.labelGraphModel = 'Gateway';
	}
	if (typeof $scope.config.valueProp == 'undefined') {
		$scope.config.valueProp = 'Value';
	}
	if (typeof $scope.config.yAxisAuto == 'undefined') {
		$scope.config.yAxisAuto = 'true';
	}
	if (typeof $scope.config.labelGraph == 'undefined') {
		if ($scope.config.query.length) {
			$scope.config.labelGraph = $scope.config.query[$scope.config.query.length - 1].typeName;
		} else {
			$scope.config.labelGraph = 'Select';
		}
	}

$scope.getDatesFromDateRange = function(dateRangeOption) {
		var startDate, endDate;

		$scope.config.startDate = '';
		$scope.config.endDate = '';

		//console.log('$scope.config.startDate',$scope.config.startDate ,'$scope.config.endDate', $scope.config.endDate,'sd', startDate,'ed', endDate);

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


}])
.directive('obPie', function () {
	return {
		restrict: 'C',
		replace: true,
		scope: {
			items: '=',
			config: '=',
		},
		//controller: function ($scope, $element, $attrs, $http, $window, $rootScope, $q, $interval, DataModels) {	},
		template: '<div title="" style="margin: 0 auto">not working</div>',
		link: function (scope, element, attrs) {
			var chart = new Highcharts.Chart({
				chart: {
					renderTo: element[0],
					plotBackgroundColor: scope.config.bgColor,
					backgroundColor: scope.config.bgColor,
					plotBorderWidth: null,
					plotShadow: false
				},
				title: { 
						text: '<b>' + scope.config.widgetTitle + '</b>'
					},
				subtitle: { 
						style: { color: '#FF0000', fontWeight: 'bold'} , text: new Date(scope.config.startDate).toDateString() + ' - ' + new Date(scope.config.endDate).toDateString() 
					},
				tooltip: {
					formatter: function () {
						return this.point.name + ': <b>' + Highcharts.numberFormat(this.point.percentage, 1) + '%</b>';
					}
				},
				credits: {
					enabled: false
				},
				plotOptions: {
					pie: {
						allowPointSelect: true,
						cursor: 'pointer',
						dataLabels: {
							enabled: false,
						},
						showInLegend: true
					}
				},
				legend: {
					enabled: true,
					useHTML: true,
					layout: 'vertical',								
					labelFormatter: function() {
						return '<div title="" style="text-align: left; width:160px;">' + this.name + ': ' + this.y + ' ' + scope.config.unitName + '</div>';
					}
				},
				series: [{
					type: 'pie',
					name: 'Omniboard Data',
					data: scope.items
				}]
			});

			scope.$watch("items", function (newValue) {
				chart.series[0].setData(newValue, true);		
			}, true);
		}
	};
});
