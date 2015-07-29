angular.module('omniboard.modelInfo', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('modelInfo', {
		title: 'Model Information',
		description: 'Displays model information',
		controller: 'modelInfoCtrl',
		templateUrl: 'modelInfo/modelInfo.tpl.html',
		edit: {
			templateUrl: 'modelInfo/edit.tpl.html',
			reload: false,
			controller: 'modelInfoEditCtrl'
		}
	});
})

.controller('modelInfoCtrl', function($scope, config, es, $rootScope, DataModels, $filter, $stateParams, $interval, pageLevelData){
	$scope.dataLoaded = false;

	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
	}

	if(!$scope.scopeId){
		if(config.useScope && $scope.scopeModel){
			$scope.returnedData = "Please select a " + $scope.scopeModel;
		}else{
			$scope.returnedData = "Please select a " + config.modelName;
		}
	}

	$scope.formatData = function( data ){
		var is_char = /[^\d\s\.]/g; //to ensure that formatting should not be attempted on a string having number and characters e.g. 25th Av.
		if ( !is_char.test(data) && !isNaN(parseFloat(data))) {
			return $filter('number')(data, config.fractionSize);
		} else {
			return data;
		} 
	};

	//PointStatus
	var pointStatus = DataModels.getModelItemsRef('PointStatus');
	pointStatus.once('value',function(dataSnap){
		$scope.allPointStatus = dataSnap.val();
		//console.log('$scope.allPointStatus', $scope.allPointStatus);
	});

	//PointType
	var pointType = DataModels.getModelItemsRef('PointType');
	pointType.once('value',function(dataSnap){
		$scope.allPointType = dataSnap.val();
		//console.log('$scope.allPointType', $scope.allPointType);
	});

	if(config.useScope && $scope.scopeModel){
		$scope.labelProps = DataModels.getModelForm($scope.scopeModel).$asObject();
	}else if(config.modelName){
		$scope.labelProps = DataModels.getModelForm(config.modelName).$asObject();
	}

	//if (config.useScope) {
		console.log('->Using scope', $scope.scopeModel, $scope.scopeId);
		$scope.returnedData = [];

		if ($scope.scopeModel && $scope.scopeId) { 
			var allModelData = DataModels.getItem($scope.scopeModel, $scope.scopeId);
			//$scope.returnedData.push(allModelData);
			$scope.returnedData = allModelData;
			allModelData.$relationsPromise.then(
				function(ok){
					//console.log('allModelData', ok);
					$scope.dataLoaded = true;
					$scope.dataLoadedError = false;
				},
				function(err){
					//console.log('---->allModelData: ERROR', err);
					$scope.dataLoadedError = true;
					$scope.dataLoaded = true;
				}
			);
		} else {
			//console.log('Either $scope.scopeModel or $scope.scopeId not found');
			$scope.dataLoaded = true;
			$scope.dataLoadedError = true;
		}
/*	} else if(config.modelName !== 'Site'){
		console.log('<->NOT Using scope', $scope.key, $scope.type);
		if( $scope.key.toString().indexOf(':') !== 0){
			var originalKey = angular.copy($scope.key.toString());
			$scope.widgetKeys = originalKey.split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}

		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);
			console.log('data', data);
			if( typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;
				console.log('===>', data);
				angular.forEach(data, function(fbRef,id){
					fbRef.$loaded().then(function(refData){
						if( $scope.widgetKeys.length === 1){
							fbData = refData;
						} else {
							if( refData.Gateway == $scope.widgetKeys[2]){
								fbData = refData;
							}
						}

						$scope.returnedData = fbData;
						$scope.dataLoaded = true;
						$scope.dataLoadedError = false;

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

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
			}
		}, 750, 80);


		$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
			if( data ){
				$scope.returnedData = data[0];
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
				$scope.dataLoaded = true;
			}
		});

	}else if (config.modelName && $scope.scopeId){
		$scope.returnedData = DataModels.getItem(config.modelName, $scope.scopeId);
		console.log('$scope.returnedData', $scope.returnedData);
		$scope.dataLoaded = true;
		$scope.dataLoadedError = false;
	}else{
		$scope.dataLoaded = true;
		$scope.dataLoadedError = false;
	}
*/

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

	$scope.getValue = function(data, prop) {
		var val = data;
		var keys = prop.split(".");
		var key = keys.shift();

		while (key && val) {
			val = val[key];
			key = keys.shift();
		}
		if(val && val.toString().indexOf('-') === 0){
			val = angular.copy(DataModels.getName(prop, val));
		}
		/*if(val && val.toString().indexOf('.') !== -1){
			val = val.toString().replace(/./g, '.');
		}*/
		return val;
	};
})

.controller('modelInfoEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams){
	console.log("scope", $stateParams);
	$scope.modelNames = DataModels.getAllModelNames().$asObject();

	if (typeof $scope.config.modelName == "undefined") {
		$scope.config.modelName = $stateParams.modelName;
	}

	if(typeof $scope.config.query == "undefined"){
		$scope.config.query = [];
	}

	if(typeof $scope.config.properties == "undefined"){
		$scope.config.properties = {};
	}

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

	if(!$scope.config.fractionSize){
		$scope.config.fractionSize = "5";
	}

	$scope.setQuery = function(modelName){
		if (!modelName) {
			modelName = $stateParams.modelName;
		}
		$scope.config.query[0] = {};
		$scope.config.query[0].modelName = modelName;
		$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
	};

	$scope.setModel = function(modelName) {
		$scope.config.properties = {};
		$scope.setQuery(modelName);
	};

	$scope.setQuery($scope.config.modelName);

});
