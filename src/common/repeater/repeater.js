angular.module('omniboard.repeater', ['adf.provider'])

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
	.widget('repeater', {
		title: 'RTU Repeater',
		description: 'Repeat widgets',
		controller: 'repeaterCtrl',
		templateUrl: 'repeater/repeaterFull.tpl.html',
		edit: {
			templateUrl: 'repeater/edit.tpl.html',
			reload: false,
			controller: 'repeaterEditCtrl'
		}
	});
})

.controller('repeaterCtrl', function($scope, config, $rootScope, $log, DataModels, es, $state, $interval, pageLevelData, formatter){
	$scope.config = config;
	$scope.key = config.key;
	$scope.dataLoaded = false;
	$scope.showTable = false;

	$scope.getItems = function(id){
		return DataModels.getNameDirectly('Device', id);
	};

	$scope.pointTypes = DataModels.getAllModelTypes('Point').$asObject();
	$scope.alreadyRanSearch = false;

	$scope.getAllAvailablePoints = function(modelName, modelType){
		var firstMust = {};
		firstMust[$state.params.modelName] = $state.params.scopeID;

		var findDevice = {
			index: es.getIndexName(),
			//type: 'Device',
			type: $scope.config.modelName,
			explain: false,
			lowercaseExpandedTerms: false,
			body: {
				size: 800,
				sort: [ "Name.raw" ],                    
				query: { 
					filtered: {
						filter: {
							"bool" : {
								"must" : [
									{
										"term" : firstMust
									},
									{
										"term" : {"DeviceType" : $scope.config.modelType}
									}
								]
							}
						}
					}
				}
			}
		};

		var searchData = function(){
			$scope.mainData = {};
			$scope.alreadyRanSearch = true;
			es.get().search(findDevice).then(
				function(resp) {
					var orArray = [];
					var filteredDevices = {};
					angular.forEach(resp.hits.hits,function(data,id){
						filteredDevices[data._id] = data._source;
						$scope.mainData[data._source.Name] = {id: data._id};
						orArray.push({"term" : {"Device" : data._id}});
					});

					var searchObj = {
						index: es.getIndexName(),
						type: 'Point',
						explain: false,
						lowercaseExpandedTerms: false,
						body: {
							size: 800,
							sort: [ "Name.raw" ],                    
							query: { 
								filtered: {
									filter: {
										"or" :  orArray
									}
								}
							}
						}
					};

					es.get().search(searchObj).then(
						function(pts) {
							//console.log('pts', pts);
							angular.forEach(pts.hits.hits,function(val,key){
								val._source['$PointType'] = $scope.pointTypes[val._source.PointType];

								var b = val._source.Value;
								var c = isNaN(b);
								
								if (c){
									val._source.Value = val._source.Value ;
								}else{
									val._source.Value = Math.round(val._source.Value*10)/10;
								}
								if( typeof val._source.PointStatus != 'undefined'){
									val._source.Status = $scope.PointStatus[val._source.PointStatus];
								}
								
								if( val._source.Name == 'Space Temperature' || val._source.Name == 'Zone Temperature' || val._source.Name == 'AvgSpaceTemp' || val._source.Name == 'Discharge Air Temperature' || val._source.Name == 'AUXILIARY SENSOR' || val._source.Name == 'Discharge Air Temp' || val._source.Name == 'DischTemp' || val._source.Name == 'Return Air Temperature' || val._source.Name == 'ReturnTemp'){
									var str = val._source.Value.toString();
									val._source.Value = str.substring(0,2);
								}

								$scope.mainData[filteredDevices[val._source.Device].Name][val._source.Name] = val;
								$scope.mainData[filteredDevices[val._source.Device].Name].Status = $scope.allData[filteredDevices[val._source.Device].Name].status;
							});

							$scope.pointsAvailable = $scope.mainData;
							config.Points = $scope.pointsAvailable;

							$scope.dataLoaded = true;
							$scope.dataLoadedError = false;
						},
						function(err) {
							$scope.alreadyRanSearch = false;
							$scope.dataLoadedError = true;
							$scope.dataLoaded = true;
						}
					);
				},
				function(err) {
					$scope.alreadyRanSearch = false;
					$scope.dataLoadedError = true;
					$scope.dataLoaded = true;
				}
			);
		};

		searchData();
	};

	if( $scope.key.toString().indexOf(':') !== 0){
		var originalKey = angular.copy($scope.key.toString());
		$scope.widgetKeys = originalKey.split(':');
		$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
	}

	$scope.DeviceStatus = {};
	$scope.DeviceStatusByName = {};
	DataModels.fetchFilteredDate('DeviceStatus',{}).then(function(DeviceStatus){
		angular.forEach(DeviceStatus,function(deviceStatus) {
			$scope.DeviceStatus[deviceStatus._id] = deviceStatus.Name;
			$scope.DeviceStatusByName[deviceStatus.Name] = deviceStatus._id;
		});
	});

	$scope.PointStatus = {};
	$scope.PointStatusByName = {};
	DataModels.fetchFilteredDate('PointStatus',{}).then(function(PointStatus){
		angular.forEach(PointStatus,function(pointStatus) {
			$scope.PointStatus[pointStatus._id] = pointStatus.Name;
			$scope.PointStatusByName[pointStatus.Name] = pointStatus._id;
		});
	});

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

	$scope.allData = {};
	var check = $interval(function() {
		var pageData = pageLevelData.get($scope.key);
		if( typeof pageData != 'undefined'){
			$interval.cancel(check);
			check = undefined;

			config.showMin= false;
			config.showMax= false;

			angular.forEach(pageData, function(fbRef,id){
				fbRef.$loaded().then(function(refData){
					var data;
					if( $scope.widgetKeys.length === 1){
						data = refData;
					} else {
						if( refData.Gateway == $scope.widgetKeys[2]){
							data = refData;
						}
					}

					if(typeof data.DeviceStatus == 'undefined'){
						data.DeviceStatus = $scope.DeviceStatusByName['Active'];
					}

					var allData = [];
					angular.forEach(data,function(val,id){
						allData.push({data: val, id: val.$id, status: ($scope.DeviceStatus[data.DeviceStatus] ? $scope.DeviceStatus[data.DeviceStatus].Name : data.DeviceStatus) });
					});

					$scope.returnedData = allData;

					$scope.allData[fbRef.Name] = {data: refData, id: refData.$id, status: $scope.DeviceStatus[refData.DeviceStatus] };
					if( $scope.alreadyRanSearch === false ){
						$scope.getAllAvailablePoints($scope.config.modelName,$scope.config.modelType ,fbRef.Name );
					}

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

			$rootScope.$on('timeLoaded',function(evt,data){
				var offset = data.isDST ? data.dstOffset : data.gmtOffset;

				//sometimes array[6] may come
				//Imran: we found lastModified in last element of returnedData and made change to fetch from last element instead of hard code 6
				var lastModified = $scope.returnedData.lastModified ? $scope.returnedData.lastModified : $scope.returnedData[$scope.returnedData.length-1].data;

				$scope.localUpdatedTime = formatter.filterDateString(lastModified, offset);
			});

			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;

		}
	}, 750, 80);

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
    }); 

}).controller('repeaterEditCtrl', function($scope, config, $rootScope, $log, DataModels, es){

	$scope.config = config;
	if( !$scope.config.showPoints) {
		$scope.config.showPoints = {};
	}
	
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

	$scope.addToConfig = function(name,id){
		var cleanName = name.split(' ').join('');
		if( !$scope.config.showPoints[id]) {
			$scope.config.showPoints[id] = cleanName;
		} else {
			delete $scope.config.showPoints[id];
		}
	};

	$scope.loadModelTypes = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
	};

	$scope.setModelType = function(modelName, modelType) {
		$scope.config.query[0].properties[modelName + "Type"] = modelType;
		$scope.getAllAvailablePoints(modelName, modelType);
	};

	$scope.getAllAvailablePoints = function(modelName,modelType){

		// var matchObj = [];
		// var obj = { "match": {} };
		// //obj.match[modelName+'Type'] = modelType;
		// obj.match[modelName+'Type'] = modelType;
		// matchObj.push(obj);

		var searchObj = {
			index: es.getIndexName(),
			type: 'PointType',
			explain: false,
			lowercaseExpandedTerms: false,
			body: {
				size: 800,
				sort: ["Name.raw"],
				query: { filtered: { filter: { match_all: {} } } }
			}
		};

		$scope.pointsAvailable = [];
		es.get().search(searchObj).then(
			function(resp) {
				$scope.pointsAvailable = resp.hits.hits;
			},
			function(err) {

			}
		);
	};

	if(!$scope.config.modelName){
		if ($scope.config.useScope) {
			$scope.config.modelName = $scope.scopeModel;
		} else {
			$scope.config.modelName = "Device";
		}
	}

	if( $scope.config.modelName && $scope.config.modelType && !$scope.config.showPoints ){
		$scope.getAllAvailablePoints($scope.config.modelName,$scope.config.modelType);
	}

	if ($scope.config.modelName) {
		$scope.loadModelTypes($scope.config.modelName);
	}

	if ($scope.config.modelName && $scope.config.modelType) {
		$scope.setModelType($scope.config.modelName, $scope.config.modelType);
	}

})

;