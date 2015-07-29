angular.module('omniboard.aggregatePoint', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('aggregatePoint', {
		title: 'Aggregate Point',
		description: 'Aggregate the point data',
		controller: 'aggregatePointCtrl',
		templateUrl: 'aggregatePoint/aggregatePoint.tpl.html',
		edit: {
			templateUrl: 'aggregatePoint/edit.tpl.html',
			reload: false,
			controller: 'aggregatePointEditCtrl'
		}
	});
})

.controller('aggregatePointCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $stateParams, $filter, $http, pageLevelData, $interval){
	$scope.dataLoaded = false;
	$scope.config = config;
	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
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

	$scope.formatData = function( data ){

		if ( !isNaN(parseFloat(data))) {
			return $filter('number')(data, config.fractionSize);
		} else {
			return data;
		} 
		
	};

	$scope.dataKey = config.modelType;

	if (config.useScope) {
		$scope.returnedData = [];
		
		if ($scope.scopeModel && $scope.scopeId) { 
			var allPointData = DataModels.getItem($scope.scopeModel, $scope.scopeId);

			//$scope.returnedData.push(allPointData);
			$scope.returnedData = allPointData;
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
		console.log('aggreagate point ', $scope.key );
		if( $scope.key.toString().indexOf(':') !== 0){
			var originalKey = angular.copy($scope.key);
			$scope.widgetKeys = originalKey.toString().split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}

		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);
			if( typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;
				if( data.length === 0){
					$scope.returnedData = data[0];
				} else {
					$scope.returnedData = data;
				}

				config.showMin = false;
				config.showMax = false;

				angular.forEach(data, function(fbRef,id){
					fbRef.$loaded().then(function(refData){
						if( $scope.widgetKeys.length === 1){
							$scope.returnedData = refData;
						} else {
							if( refData.Gateway == $scope.widgetKeys[2]){
								$scope.returnedData = refData;
							}
						}

						if(!isNaN($scope.returnedData.Value)){
							if(parseFloat($scope.returnedData.Value) <= config.minValue){
								$scope.config.showMin = true;
								$scope.config.showMax = false;
								$scope.config.showValue = false;
							}else if(parseFloat($scope.returnedData.Value) >=  config.maxValue ){
								$scope.config.showMax = true;
								$scope.config.showValue = false;
								$scope.config.showMin = false;
							}else{
								$scope.config.showValue = true;
								$scope.config.showMax = false;
								$scope.config.showMin = false;
							}
						}
						$scope.tempoDBkey = "Model:"+$scope.config.modelName+".Property:"+$scope.config.valueProp+".ItemId:"+$scope.returnedData.$id.toString()+'.'+$scope.returnedData.$id.toString();

						$scope.fetchDataFromTempo( $scope.tempoDBkey );

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

				/*
				$scope.returnedData = data[0];
				$scope.returnedData.$loaded().then(function(){
					config.showMin= false;
					config.showMax= false;

					$scope.$watch("returnedData.Value", function(newVal, oldVal){
						if(parseFloat(newVal) <= config.minValue){
							$scope.config.showMin = true;
							$scope.config.showMax = false;
							$scope.config.showValue = false;
						}else if(parseFloat(newVal) >=  config.maxValue ){
							$scope.config.showMax = true;
							$scope.config.showValue = false;
							$scope.config.showMin = false;
						}else{
							$scope.config.showValue = true;
							$scope.config.showMax = false;
							$scope.config.showMin = false;
						}
					});

					$scope.tempoDBkey = "Model:"+$scope.config.modelName+".Property:"+$scope.config.valueProp+".ItemId:"+$scope.returnedData.$id.toString()+'.'+$scope.returnedData.$id.toString();

					$scope.fetchDataFromTempo( $scope.tempoDBkey );

				});
				*/
			} else {
				$scope.dataLoadedError = true;
			}
		}, 750, 80);

/*
		$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
			if( data ){
				$scope.returnedData = data[0];

			$scope.returnedData.$loaded().then(function(){
				config.showMin= false;
				config.showMax= false;
					
			
				$scope.$watch("returnedData.Value", function(newVal, oldVal){
					
				if(parseFloat(newVal) <= config.minValue){
					$scope.config.showMin = true;
					$scope.config.showMax = false;
					$scope.config.showValue = false;
				}else if(parseFloat(newVal) >=  config.maxValue ){
					$scope.config.showMax = true;
					$scope.config.showValue = false;
					$scope.config.showMin = false;
				}else{
					$scope.config.showValue = true;
					$scope.config.showMax = false;
					$scope.config.showMin = false;
				}

				
				});

				$scope.tempoDBkey = "Model:"+$scope.config.modelName+".Property:"+$scope.config.valueProp+".ItemId:"+$scope.returnedData.$id.toString()+'.'+$scope.returnedData.$id.toString();
				
				$scope.fetchDataFromTempo( $scope.tempoDBkey );

				});
			} else {
				$scope.dataLoadedError = true;
				$scope.dataLoaded = true;
			}
		});
*/
	}

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.reloading = true;
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

	$scope.fetchDataFromTempo = function(pID) {
		interval = $scope.config.interval;
		unit = $scope.config.intervalUnits;
		switch($scope.config.aggregation){
			case "Custom":
				startDate = new Date($scope.config.startDate).getTime();
				endDate = new Date($scope.config.endDate).getTime();
				break;
			case "Month To Date":
				d = new Date();
				startDate = new Date(d.getYear()+1900, d.getMonth(), 1, 0, 0, 0);
				endDate = d;
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "today":
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
				startDate.setDate(startDate.getDate()-7);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last 24 Hours":
				startDate = new Date();
				startDate.setHours(startDate.getHours()-24);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
		}

		var user = $rootScope.loginService.getCurrentUser();
		tFunction = $scope.config.trendFunction;
		if( tFunction == 'max' || tFunction == 'min'){
			webServiceURL = '/getMaxMinValue?pt='+pID+'&interval='+interval+'&units='+unit+'&sd='+startDate+'&ed='+endDate+'&rollupFunction='+tFunction+'&cnum='+user.customerKey;
		} else {
			webServiceURL = '/aggregatePoint?pt='+pID+'&interval='+interval+'&units='+unit+'&sd='+startDate+'&ed='+endDate+'&rollupFunction='+tFunction+'&cnum='+user.customerKey;
		}
		$http({method: 'GET', url: webServiceURL}).
		success(function(processedData, status, headers, config) {
			$scope.aggregateValue = $scope.formatData(processedData[processedData.length-1].v);
			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;
		}).
		error(function(data, status, headers, config) {
			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;
		});
	};

})

.controller('aggregatePointEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams){
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
			$scope.config.modelName = $scope.$scopeModel;
		} else { 
			$scope.config.modelName = "Point";
		}
	}

	if(!$scope.config.aggregation){
		$scope.config.aggregation = 'Last 24 Hours';
	}

	if(!$scope.config.trendFunction){
		$scope.config.trendFunction = 'mean';
	}

	if(!$scope.config.intervalUnits){
		$scope.config.intervalUnits = 'hour';
	}

	if(!$scope.config.interval){
		$scope.config.interval = 1;
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

	$scope.loadModelTypes = function(modelName, useScope) {
		if (!modelName && useScope) {
			modelName = $stateParams.modelName;
		}else{
			modelName = $scope.config.modelName;
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

});
