angular.module('omniboard.table', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('table', {
		title: 'Table',
		description: 'Displays the value of any model property',
		controller: 'tableCtrl',
		templateUrl: 'table/table.tpl.html',
		edit: {
			templateUrl: 'table/edit.tpl.html',
			reload: false,
			controller: 'tableEditCtrl'
		}
	});
})

.controller('tableCtrl', function($scope, config, $http, $rootScope, DataModels, $filter, $stateParams, $interval, pageLevelData, $q){

	$scope.dataLoaded = false;
	$scope.dataLoadedError = false;

	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}

	$scope.loadModelValues = function(modelName) {
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.linkValueProps = DataModels.getModelForm(modelName).$asObject();
	};

	$scope.formatData = function( data ){
		if ( !isNaN(parseFloat(data))) {
			return $filter('number')(data, config.fractionSize);
		} else {
			return data;
		}
	};

	$scope.daysBetween = function(date1_ms, date2_ms) {
		var ONE_DAY = 1000 * 60 * 60 * 24;
		var difference_ms = Math.abs(date1_ms - date2_ms);
		return Math.round(difference_ms/ONE_DAY);
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

	$scope.dataKey = config.modelType;

	$scope.returnedData = [];

	if( $scope.key.toString().indexOf(':') !== 0){
		var originalKey = angular.copy($scope.key.toString());
		$scope.widgetKeys = originalKey.split(':');
		$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
	}

	var startDate,endDate;

	if ($scope.config.dateRange !== undefined && $scope.config.dateRange.length > 0 && $scope.config.dateRange !== 'Custom') {
		var res = $scope.getDatesFromDateRange($scope.config.dateRange);
		startDate = res.SD;
		endDate = res.ED;
	} else {
		startDate = new Date($scope.config.startDate).getTime();
		endDate = new Date($scope.config.endDate).getTime();
	}

	var utcSD = new Date(startDate);
	var utcED = new Date(endDate);

	// convert to msec
	// add local time zone offset
	// get UTC time in msec
	utcForSD = utcSD.getTime() + (utcSD.getTimezoneOffset() * 60000);
	utcForED = utcED.getTime() + (utcED.getTimezoneOffset() * 60000);

	// create new Date object for different city
	// using supplied offset

	var finalSD = (new Date(startDate)).getTime(); //(new Date(utcForSD + (3600000*$scope.diff))).getTime();
	var finalED = (new Date(endDate)).getTime();   //(new Date(utcForED + (3600000*$scope.diff))).getTime();

	// calculate interval in days
	var interval = $scope.daysBetween(endDate,startDate);
	var user = $rootScope.loginService.getCurrentUser();
	var rollUp = $scope.config.rollUp ? $scope.config.rollUp : 'mean';

	var check = $interval(function() {

		var data = pageLevelData.getRaw($scope.key);

		if (typeof data !== 'undefined' && Object.keys(data).length !== 0) {

			$interval.cancel(check);
			check = undefined;

			var allPoints = {};
			var defer = $q.defer();

			var allPtCnt=0;
			angular.forEach(data, function(queryData,idx){
				allPtCnt += queryData.length;
				angular.forEach(queryData, function(d,count){
					d.$loaded().then(function() {
						allPtCnt -= 1;
						d.Unit = config.query[idx].unit;
						allPoints[d.$id] = d;
						if (allPtCnt === 0) {
							defer.resolve(allPoints);
						}
					});
				});
			});

			defer.promise.then(function(points) {
				var pointId = [];
				for( var i in points ){
					var point = points[i];
					var tempoDBkey = "Model:"+$scope.config.modelName+".Property:"+$scope.config.valueProp+".ItemId:"+point.$id;
					pointId.push(tempoDBkey);
				}

				var URL = '/getMultiData?cnum='+user.customerKey+'&pt='+pointId+'&interval='+interval+'&units=day&sd='+finalSD+'&ed='+finalED+'&rollupFunction='+rollUp+'&interpolate=true';

				$http({method: 'GET', url: URL}).success(function(processedData, status, headers, config) {
					angular.forEach(processedData.series,function(d) {
						var dataRef = {};
						angular.forEach(allPoints[d.id],function(val,key) {
							dataRef[key] = val;
						});
						dataRef.Value = d.data[0];
						$scope.returnedData.push(dataRef);
					});

					$scope.dataLoaded = true;
					$scope.dataLoadedError = false;
				});
			});
		}

	}, 750, 80);

	$rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
	});

	$scope.getDisplayValue = function(model, valueProp) {
		var value = $scope.getValue(model, valueProp);
		if(config.displayValues && config.displayValues[value]){
			return config.displayValues[value];
		}else{
			return value;
		}
	};

	$scope.getDisplayValuewithUnit = function(data, valueProp) {
		var value = $scope.getDisplayValue(data, valueProp);
		if (value){
			var returnval = $scope.formatData(value) + ' ' + data.Unit;
			return returnval;
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

	$scope.getName = function(model) {
		var val = '';

		if (config.labelProp) {
			var val1 = $scope.getValue(model, config.labelProp, true);
			if(config.displayValues && config.displayValues[val1]){
				val = config.displayValues[val1];
			}else{
				val = val1;
			}
		}

		if (config.labelGraphModel) {
			var key = '$' + config.labelGraphModel + '.Name';
			var val2 = $scope.getValue(model,key);
			if(val2 !== undefined){
				if(config.displayValues && config.displayValues[val2] && config.displayValues[val2] !== undefined){
					val = val + config.displayValues[val2];
				}else{
					val = val + ' (' + val2 + ')';
				}
			}
		}
	return val;
	};
})

.controller('tableEditCtrl', function($scope, config, $rootScope, DataModels, $stateParams, Dashboards){

	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.dashboards = Dashboards.list();
	$scope.getUnits = function (){
		$scope.units = DataModels.getItems('Unit').$asArray();
		$scope.units.$loaded().then(function (data) {
			$scope.unitsAvailable = data.length > 0;
		});
	};
	$scope.getUnits();

	if (!$scope.config.query) { $scope.config.query = []; }

	$scope.getPropertyValue = function(prop) {

		if (prop.component == "select") {
			return "$" + prop.label + ".Name";
		} else {
			return prop.label;
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

	$scope.addQuery = function(){

		var propertiesObj = {};
		propertiesObj[config.modelName + 'Type'] = config.modelType;

		var query = {
			modelName: $scope.config.modelName,
			properties: propertiesObj,
			key: $scope.config.modelType,
			valueProp: $scope.config.valueProp,
			labelGraph: $scope.config.labelGraphModel,
			labelGraphModel: $scope.config.labelGraphModel,
			unit: $scope.config.unit
		};

		//In case the model chosen has no types
		if($scope.config.modelType){
			query.typeName = $scope.modelTypes[$scope.config.modelType].Name;
		}

		if($scope.editMode){
			$scope.config.query[$scope.editModeKey] = query;
		}else{
			$scope.config.query.push(query);
		}

		$scope.editMode = false;

		$scope.checkQuery = angular.copy($scope.config.query);
	};

	$scope.removeQuery = function(index){
		$scope.config.query.splice(index,1);
		$scope.checkQuery.splice(index,1);
	};

	$scope.editMode = false;

	$scope.editQuery = function(key,value){
		$scope.editMode = (value.selected !== true);
		$scope.config.modelName = value.modelName;
		$scope.loadModelTypes(value.modelName);
		$scope.config.modelType = value.key;
		$scope.updateSelectBoxes(value.key);
		$scope.editModeKey = key;
		$scope.config.unit = value.unit;
		$scope.config.labelGraphModel = value.labelGraphModel;
	};

	$scope.updateSelectBoxes = function(key){
		angular.forEach($scope.checkQuery, function(val){
			val.selected = key === val.key;
		});
	};

	$scope.dateOptions = {
		'year-format': "'yy'",
		'starting-day': 1
	};

	$scope.checkQuery = angular.copy($scope.config.query);
	$scope.openedTo = false;
	$scope.openedFrom = false;

	$scope.op = function($event, openItem) {
		$event.preventDefault();
		$event.stopPropagation();
		$scope[openItem] = true;
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

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = "5";
	}

	if(!$scope.config.labelGraphModel){
		$scope.config.labelGraphModel = $scope.config.modelName;
	}

	$scope.loadModelTypes = function(modelName, useScope) {
		if (!modelName && useScope) {
			modelName = $stateParams.modelName;
		}else{
			modelName = $scope.config.modelName;
		}

		if (modelName) {
			//$scope.config.query[0].modelName = modelName;
			$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
			$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
			$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
		}
	};

	$scope.setModelType = function(modelName, modelType) {
		//$scope.config.query[0][modelName + "Type"] = modelType;
	};

	if ($scope.config.modelName) {
		$scope.loadModelTypes($scope.config.modelName);
	}

});
