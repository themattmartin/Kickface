angular.module('omniboard.groupTable', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('groupTable', {
		title: 'Group Table',
		description: 'Displays the value of chosen model',
		controller: 'groupTableCtrl',
		templateUrl: 'groupTable/groupTable.tpl.html',
		edit: {
			templateUrl: 'groupTable/edit.tpl.html',
			reload: false,
			controller: 'groupTableEditCtrl'
		}
	});
})

.controller('groupTableCtrl', function($scope, config, $rootScope, DataModels, $stateParams, $interval, pageLevelData, $http, $filter, Expressions){
	console.log('===========>$scope.modelName', $scope.modelName, '$stateParams.modelName', $stateParams.modelName, '$stateParams.scopeID', $stateParams.scopeID, '$scope.scopeModel', $scope.scopeModel, '$scope.config.modelName', $scope.config.modelName);
	console.log('Loaded.....', $scope);
	$scope.config = config;
	$scope.key = config.key;
	var recordCount = 0;
	console.log('After setting.....', $scope.config);

	$scope.expressionNames = Expressions.getExpressionNames().$asObject();
	//console.log('$scope.expressionNames', $scope.expressionNames);

	if(typeof $scope.config.rollUp == "undefined"){
		$scope.config.rollUp = "AVG";
	}

	if(!$scope.config.customColumns){
		$scope.config.customColumns = ['SITE AVERAGE', 'GROUP AVERAGE', 'ACCOUNT AVERAGE', 'SITE AVERAGE/SQFT', 'GROUP AVERAGE/SQFT'];
	}

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = 2;
	}

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

	$scope.startDate = startDate;
	$scope.endDate = endDate;
	console.log('startDate', startDate.toString(), 'endDate', endDate.toString());

	$scope.formatData = function( data ){
		if ( !isNaN(parseFloat(data))) {
			return $filter('number')(data, config.fractionSize);
		} else {
			return data;
		} 
	};
	/*
	if( $scope.config.show24hr ){
		var cleanUpdate = $rootScope.$on('updateSiteTime', function(evt,data, tzOffset){
			console.log('.... updateSiteTime');
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
		});
	}*/

	/*
	var utcSD = new Date(startDate);
	var utcED = new Date(endDate);
	var utcForSD = utcSD.getTime() + (utcSD.getTimezoneOffset() * 60000);
	var utcForED = utcED.getTime() + (utcED.getTimezoneOffset() * 60000);
	var finalSD = (new Date(utcForSD + (3600000*$scope.diff))).getTime();
	var finalED = (new Date(utcForED + (3600000*$scope.diff))).getTime();
	*/

	if($scope.config.modelName && !$scope.config.columns){
		DataModels.getModelFormAsArray(model).then(function(modelForm){
			console.log('====>', modelForm);
			$scope.config.columns = [];

			angular.forEach(modelForm, function(controlObj, controlId){
				var obj = {};
				obj.name = controlObj.label;
				obj.show = true;
				obj.isCustom = false;
				$scope.config.columns.push(obj);
			});

			if($scope.config.customColumns){
				angular.forEach($scope.config.customColumns, function(columnName){
					var obj = {};
					obj.name = columnName;
					obj.show = true;
					obj.isCustom = true;
					$scope.config.columns.push(obj);
				});
			}

			$scope.config.columns.push({name:'RollUp', show:true});
		});
	}

	if( typeof $scope.key != 'undefined'){
		$scope.pointTypeAggs = {};
		$scope.pointTypeAvgs = {};
		$scope.pointTypeAvgsForSite = {};
		$scope.pointTypeAvgsForAccounts = {};

		//console.log("avg",$scope.pointTypeAggs[id].AVG.Value);

		$scope.calculatePointTypeAggs = function(val, id){
			console.log('id', id);

			if(typeof $scope.pointTypeAggs[id] == 'undefined'){
				$scope.pointTypeAggs[id] = {
					'SUM':{Value: 0, recordCount: 0},
					'MAX':{Value: 0, recordCount: 0},
					'MIN':{Value: 0, recordCount: 0},
					'AVG':{Value: 0, recordCount: 0}
				};
			}

			if(val && !isNaN(Number(val))){
				if( $scope.config.rollUp == 'SUM' || $scope.config.rollUp == 'AVG' ){
					$scope.pointTypeAggs[id].SUM.Value = Number($scope.pointTypeAggs[id].SUM.Value) + Number(val);
					//console.log("avg",$scope.pointTypeAggs[id].AVG.Value, "$scope.pointTypeAggs[id].SUM.Value", $scope.pointTypeAggs[id].SUM.Value, "recordCount", $scope.pointTypeAggs[id].SUM.recordCount);
					$scope.pointTypeAggs[id].SUM.recordCount = $scope.pointTypeAggs[id].SUM.recordCount + 1;
					$scope.pointTypeAggs[id].AVG.Value = Number($scope.pointTypeAggs[id].SUM.Value)/$scope.pointTypeAggs[id].SUM.recordCount;
					//console.log('$scope.pointTypeAggs[id].SUM.Value', $scope.pointTypeAggs[id].SUM.Value, val);
				} else if( $scope.config.rollUp == 'MIN' ){
					if( Number(val) < Number($scope.pointTypeAggs[id].MIN.Value) ){
						$scope.pointTypeAggs[id].MIN.Value = val;
					}
				} else if( $scope.config.rollUp == 'MAX' ){
					if( Number(val) > Number($scope.pointTypeAggs[id].MAX.Value) ){
						$scope.pointTypeAggs[id].MAX.Value = val;
					}
				}
			}
		};

		$scope.calculatePointTypeAvg = function(val, pointTypeId, siteId, AccId){
			console.log('pointTypeId', pointTypeId);

			if(!$scope.pointTypeAvgs[pointTypeId]){
				$scope.pointTypeAvgs[pointTypeId] = {
					'SUM':{Value: 0, recordCount: 0},
					'AVG':{Value: 0, recordCount: 0},
				};
			}

			if(!$scope.pointTypeAvgsForSite[pointTypeId]){
				$scope.pointTypeAvgsForSite[pointTypeId] = {};
			}

			if(!$scope.pointTypeAvgsForAccounts[pointTypeId]){
				$scope.pointTypeAvgsForAccounts[pointTypeId] = {};
			}

			if(!$scope.pointTypeAvgsForSite[pointTypeId][siteId]){
				$scope.pointTypeAvgsForSite[pointTypeId][siteId] = {
					'SUM':{Value: 0, recordCount: 0},
					'AVG':{Value: 0, recordCount: 0},
				};
			}

			if(!$scope.pointTypeAvgsForAccounts[pointTypeId][AccId]){
				$scope.pointTypeAvgsForAccounts[pointTypeId][AccId] = {
					'SUM':{Value: 0, recordCount: 0},
					'AVG':{Value: 0, recordCount: 0},
				};
			}

			if(val && !isNaN(Number(val))){
				//console.log("avg",$scope.pointTypeAvgs[pointTypeId].AVG.Value, "$scope.pointTypeAvgs[pointTypeId].SUM.Value", $scope.pointTypeAvgs[pointTypeId].SUM.Value, "recordCount", $scope.pointTypeAvgs[pointTypeId].SUM.recordCount);
				$scope.pointTypeAvgs[pointTypeId].SUM.Value = Number($scope.pointTypeAvgs[pointTypeId].SUM.Value) + Number(val);
				$scope.pointTypeAvgsForSite[pointTypeId][siteId].SUM.Value = Number($scope.pointTypeAvgsForSite[pointTypeId][siteId].SUM.Value) + Number(val);
				$scope.pointTypeAvgsForAccounts[pointTypeId][AccId].SUM.Value = Number($scope.pointTypeAvgsForAccounts[pointTypeId][AccId].SUM.Value) + Number(val);

				$scope.pointTypeAvgs[pointTypeId].SUM.recordCount = $scope.pointTypeAvgs[pointTypeId].SUM.recordCount + 1;
				$scope.pointTypeAvgsForSite[pointTypeId][siteId].SUM.recordCount = $scope.pointTypeAvgsForSite[pointTypeId][siteId].SUM.recordCount + 1;
				$scope.pointTypeAvgsForAccounts[pointTypeId][AccId].SUM.recordCount = $scope.pointTypeAvgsForAccounts[pointTypeId][AccId].SUM.recordCount + 1;

				$scope.pointTypeAvgs[pointTypeId].AVG.Value = Number($scope.pointTypeAvgs[pointTypeId].SUM.Value)/$scope.pointTypeAvgs[pointTypeId].SUM.recordCount;
				$scope.pointTypeAvgsForSite[pointTypeId][siteId].AVG.Value = Number($scope.pointTypeAvgsForSite[pointTypeId][siteId].SUM.Value)/$scope.pointTypeAvgsForSite[pointTypeId][siteId].SUM.recordCount;
				$scope.pointTypeAvgsForAccounts[pointTypeId][AccId].AVG.Value = Number($scope.pointTypeAvgsForAccounts[pointTypeId][AccId].SUM.Value)/$scope.pointTypeAvgsForAccounts[pointTypeId][AccId].SUM.recordCount;
				//console.log('$scope.pointTypeAvgs[pointTypeId].SUM.Value', $scope.pointTypeAvgs[pointTypeId].SUM.Value, val);
			}
		};

		$scope.calculateAverages = function(pointsData){
			angular.forEach(pointsData, function(fbRef,id){
				fbRef.$loaded().then(function(refData){
					recordCount++;
					$scope.calculatePointTypeAvg(refData.RollUp, refData.PointType, refData.Site, refData.AccountNumber);
				});
			});
		};

		if( $scope.key.toString().indexOf(':') !== 0 ){
			var originalKey = angular.copy($scope.key.toString());
			$scope.widgetKeys = originalKey.split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}


		var user = $rootScope.loginService.getCurrentUser();

		if( user ){
			var check = $interval( function() {
				var data = pageLevelData.get($scope.key);
				console.log('$$$$$$$$$', data);
				if( typeof data != 'undefined'){
					$interval.cancel(check);
					check = undefined;
					$scope.returnedData = data;
					var pointId = [];
					var unit = 'day';
					var interval = parseInt((endDate - startDate) / (1000 * 60 * 60 * 24));

					//$scope.calculateAverages($scope.returnedData);
					$scope.allPoints = {};

					for( var i in $scope.returnedData ){
						$scope.allPoints[$scope.returnedData[i].$id] = $scope.returnedData[i];

						//we will build the point key before pushing it
						//Model:Point.Property:Value.ItemId:-JQPBZ129j5PdZ0krrfh.-JQPBZ129j5PdZ0krrfh
						var tempoDBkey = "Model:"+$scope.config.modelName+".Property:Value.ItemId:"+$scope.returnedData[i].$id.toString()+"."+$scope.returnedData[i].$id.toString();
						pointId.push(tempoDBkey);
					}

					var webServiceURL = '/getMultiData?cnum='+user.customerKey+'&pt='+pointId+'&interval='+interval+'&units='+unit+'&sd='+startDate+'&ed='+endDate+'&rollupFunction='+$scope.config.rollUp+'&interpolate=true';
					console.log('webServiceURL', webServiceURL);

					$http({method: 'GET', url: webServiceURL}).
					success(function(processedData, status, headers, config) {
						console.log('##############', processedData);

						angular.forEach(processedData.series, function(pointData, id){
							var pt = $scope.allPoints[pointData.id];
							pt['RollUp'] = pointData.data[0];
							//console.log('pt.$id', pt.$id, 'pointData.id', pointData.id);

							if ($scope.config.expressionType && $scope.config.expressionTypeCategory && $scope.config.selectedExpression && pt.expressions && pt.expressions.values){
								if(pt.expressions.values[$scope.config.expressionType] && pt.expressions.values[$scope.config.expressionType][$scope.config.expressionTypeCategory] && pt.expressions.values[$scope.config.expressionType][$scope.config.expressionTypeCategory][$scope.config.selectedExpression]){
									pt.Value = pt.expressions.values[$scope.config.expressionType][$scope.config.expressionTypeCategory][$scope.config.selectedExpression].Value;
									if(pt.Value){
										//pt.RollUp = pt.Value;
									}
									console.log('ExpValue', pt.expressions.values[$scope.config.expressionType][$scope.config.expressionTypeCategory][$scope.config.selectedExpression].Value);
								}
							}
						});
						$scope.calculateAverages($scope.allPoints);
					}).
					error(function(data, status, headers, config) {
						console.log('error', data);
						$scope.dataLoadedError = true;
						$scope.dataLoaded = true;
					});

					/*
					angular.forEach(data, function(fbRef,id){
						fbRef.$loaded().then(function(refData){
							if($scope.config.selectedTypes[refData.PointType]){
								if( $scope.widgetKeys.length === 1){
									console.log('=========> refData', refData);
									$scope.returnedData.push(refData);
								} else {
									if( refData[$scope.widgetKeys[1]] == $scope.widgetKeys[2]){
										$scope.returnedData.push(refData);
									}
								}
								recordCount++;
								$scope.calculatepointTypeAvg(refData.Value, refData.Site);
							}
						});
					});*/

					$rootScope.$on('timeLoaded',function(evt,data){
						var offset = data.isDST ? data.dstOffset : data.gmtOffset;
						var lastModified = $scope.returnedData.lastModified;
						//sometimes array[6] may come
						lastModified = (!lastModified && $scope.returnedData[6] ? $scope.returnedData[6].data : '');
						$scope.localUpdatedTime = (lastModified ? formatter.filterDateString(lastModified, offset) : '');
					});

					$scope.dataLoaded = true;
					$scope.dataLoadedError = false;
				} else {
					$scope.dataLoadedError = true;
				}
			}, 750, 80);
		}else{
			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;
		}

		$rootScope.$on('widget:reloading:'+$scope.key,function(){
			$scope.dataLoaded = false;
			$scope.dataLoadedError = false;
		}); 
	}
})

.controller('groupTableEditCtrl', function($scope, $rootScope, DataModels, $stateParams, Expressions){
	$scope.aggregations = ['SUM','AVG','MAX','MIN'];
	var savedQuery;
	var savedSelectedTypes;

	if(!$scope.config.customColumns){
		$scope.config.customColumns = ['SITE AVERAGE', 'GROUP AVERAGE', 'ACCOUNT AVERAGE', 'SITE AVERAGE/SQFT', 'GROUP AVERAGE/SQFT'];
	}

	console.log('$scope.modelName', $scope.modelName, '$stateParams.modelName', $stateParams.modelName, '$stateParams.scopeID', $stateParams.scopeID, '$scope.scopeModel', $scope.scopeModel, '$scope.config.modelName', $scope.config.modelName);

	$scope.expressionNames = Expressions.getExpressionNames().$asObject();
	console.log('$scope.expressionNames', $scope.expressionNames);

	$scope.loadExpressionTypeCategories = function(expressionType){
		$scope.expressionTypeCategories = Expressions.getExpressionTypeCategories(expressionType).$asObject();
	};

	$scope.getUnits = function (){
		$scope.units = DataModels.getItems('Unit').$asArray();
		$scope.units.$loaded().then(function (data) {
			$scope.unitsAvailable = data.length > 0;
		});
	};

	$scope.getUnits();

	if($scope.config.expressionType && $scope.config.expressionType !== ''){
		$scope.loadExpressionTypeCategories($scope.config.expressionType);
	}

	$scope.openedTo = false;
	$scope.openedFrom = false;

	$scope.op = function($event, openItem) {
		$event.preventDefault();
		$event.stopPropagation();
		$scope[openItem] = true;
	};

	$scope.dateOptions = {
		'year-format': "'yy'",
		'starting-day': 1
	};

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

	$scope.getDatesFromDateRange = function(dateRangeOption) {
		var startDate, endDate;

		$scope.config.startDate = '';
		$scope.config.endDate = '';

		console.log('$scope.config.startDate',$scope.config.startDate ,'$scope.config.endDate', $scope.config.endDate,'sd', startDate,'ed', endDate);

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

	$scope.verifyPossiblePointsReturned();

	if($stateParams.modelName && $stateParams.scopeID){
		$scope.modelName = DataModels.getName($stateParams.modelName, $stateParams.scopeID);
	}

	$scope.config.modelName = "Point";

	if(!$scope.config.rollUp){
		$scope.config.rollUp = $scope.aggregations[1];
	}

	if(typeof $scope.config.selectedTypes == 'undefined'){
		$scope.config.selectedTypes = {};
	}else{
		savedSelectedTypes = $scope.config.selectedTypes;
	}

	if(typeof $scope.config.query == 'undefined'){
		$scope.config.query = [];
	}else{
		savedQuery = $scope.config.query;
	}

	if(typeof $scope.config.query[0] == 'undefined'){
		$scope.config.query[0] = { modelName: 'Point', properties: {} };
	}
	
	if(typeof $scope.config.show24hr == "undefined"){
		$scope.config.show24hr = true;
	}

	if(typeof $scope.config.valueProp == "undefined"){
		$scope.config.valueProp = "Value";
	}

	$scope.setModelType = function(model){
		if(model){
			console.log('>>>', model);
			$scope.availableModelTypes = DataModels.getItems(model + 'Type').$asObject();

			if(!$scope.config.columns){
				DataModels.getModelFormAsArray(model).then(function(modelForm){
					console.log('====>', modelForm);
					$scope.config.columns = [];

					angular.forEach(modelForm, function(controlObj, controlId){
						var obj = {};
						obj.name = controlObj.label;
						obj.show = true;
						obj.isCustom = false;
						$scope.config.columns.push(obj);
					});

					if($scope.config.customColumns){
						angular.forEach($scope.config.customColumns, function(columnName){
							var obj = {};
							obj.name = columnName;
							obj.show = true;
							obj.isCustom = true;
							$scope.config.columns.push(obj);
						});
					}

					$scope.config.columns.push({name:'RollUp', show:true});
				});
			}
		}

		$scope.config.selectedTypes = {};
		$scope.config.query = [];

		$scope.config.query[0] = { modelName: 'Point', properties: {} };
	};

	$scope.selectType = function(ID){
		console.log('selectType ', ID);
		$scope.config.selectedTypes[ID] = angular.copy($scope.availableModelTypes[ID]);
		var queryEmpty = false;

		angular.forEach($scope.config.query, function(query, index){
			if(!queryEmpty){
				var queryCompleted = false;

				if(query.properties[$scope.config.modelName + 'Type']){
					queryCompleted = true;
				}

				if(!queryCompleted){
					query.properties[$scope.config.modelName + 'Type'] = ID;
					queryEmpty = true;
				}
			}
		});

		if(!queryEmpty){
			var newQuery = {};
			newQuery['modelName'] = $scope.config.modelName;
			newQuery['properties'] = {};
			newQuery['properties'][$scope.config.modelName + 'Type'] = ID;

			/*
			if($scope.config.unit){
				newQuery['unit'] = angular.copy($scope.config.unit);
				$scope.config.selectedTypes[ID].unit = angular.copy($scope.config.unit);
			}
			*/

			$scope.config.query.push(newQuery);
		}
	};

	$scope.removeType = function(ID){
		angular.forEach($scope.config.query, function(query, index){
			if(query.properties[$scope.config.modelName + 'Type'] == ID){
				$scope.config.query.splice(index, 1);
			}
		});
		delete $scope.config.selectedTypes[ID];
	};

	$scope.setModelType($scope.config.modelName);

	$scope.moveUp = function(key){
		var temp = $scope.config.columns[key];
		$scope.config.columns[key] = $scope.config.columns[key - 1];
		$scope.config.columns[key - 1] = temp;
	};

	$scope.moveDown = function(key){
		var temp = $scope.config.columns[key];
		$scope.config.columns[key] = $scope.config.columns[key + 1];
		$scope.config.columns[key + 1] = temp;
	};

	if(savedQuery){
		$scope.config.query = savedQuery;
	}

	if(savedSelectedTypes){
		$scope.config.selectedTypes = savedSelectedTypes;
	}

});