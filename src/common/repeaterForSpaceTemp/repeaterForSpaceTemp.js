angular.module('omniboard.spaceTempRepeater', ['adf.provider'])

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
	.widget('spaceTempRepeater', {
		title: 'Space Temp Repeater',
		description: 'Repeats all space temps for a site',
		controller: 'spaceTempRepeaterCtrl',
		templateUrl: 'repeaterForSpaceTemp/repeaterFull.tpl.html',
		edit: {
			templateUrl: 'repeaterForSpaceTemp/edit.tpl.html',
			reload: false,
			controller: 'spaceTempRepeaterEditCtrl'
		}
	});
})

.controller('spaceTempRepeaterCtrl', function($scope, config, $rootScope, $log, DataModels, es, $state, FirebaseRootRef){

	$scope.config = config;
	$scope.key = config.key;
	$scope.dataLoaded = false;
	$scope.showTable = false;

	$scope.getItems = function(id){
		return DataModels.getNameDirectly('Device', id);
	};

	$scope.getAllAvailablePoints = function(modelName,modelType,Site,SiteID){

		var firstMust = {};
		firstMust[modelName+'Type'] = modelType;
		var secondMust = {};
		secondMust[Site] = SiteID;

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
									"term" : secondMust
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

			es.get().search(findDevice)
				.then(
					function(resp) {
						if(resp.hits && resp.hits.hits){
							var points = resp.hits.hits;
							var searchObj = {
								index: es.getIndexName(),
								type: 'Device',
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
															"term" : secondMust
														}
													]
												}
											}
										}
									}
								}
							};

							es.get().search(searchObj).then(
								function(resp) {
									if (resp.hits && resp.hits.hits) {
										var devices = resp.hits.hits;
										var deviceDictionary = {};
										angular.forEach(devices, function (device, id) {
											deviceDictionary[device._id] = device._source;
										});

										angular.forEach(points, function (data, id) {
											var device = deviceDictionary[data._source.Device];
											var deviceName = '';
											if (device) {
												deviceName = deviceDictionary[data._source.Device].Name;
											}
											$scope.mainData[data._id] = {id: data._id, data: data, device: deviceName};


											var b = $scope.mainData[data._id].data._source.Value;
											var c = isNaN(b);

											if (c){
											$scope.mainData[data._id].data._source.Value = $scope.mainData[data._id].data._source.Value ;
											}else{
											$scope.mainData[data._id].data._source.Value = Math.round($scope.mainData[data._id].data._source.Value*10)/10;
											}



										});
									}
								});
						}
					}
				);
		};

		searchData();
      
	};

	$rootScope.$on("itemSelected", function(evt, data) {
		if( data ){
			
			$scope.showInfo = true;
			$scope.getAllAvailablePoints($scope.config.modelName,$scope.config.modelType, 'Site',data._id );
			$scope.details = data;
			$scope.$apply();
			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;
		} else {
			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;
		}
	});
	

	$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
		if( data ){
			
			var allData = [];
			angular.forEach(data,function(val,id){
				allData.push({data: val, id: val.$id});
			});

			$scope.returnedData = allData;
			$scope.getAllAvailablePoints($scope.config.modelName,$scope.config.modelType);
		}
	});

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
    }); 

}).controller('spaceTempRepeaterEditCtrl', function($scope, config, $rootScope, $log, DataModels, es){

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
