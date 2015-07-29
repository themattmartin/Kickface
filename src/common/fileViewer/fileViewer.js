angular.module('omniboard.fileViewer', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('fileViewer', {
		title: 'File Viewer',
		description: 'Displays uploaded files (pdf, jpg, etc..)',
		controller: 'fileViewerCtrl',
		templateUrl: 'fileViewer/fileViewer.tpl.html',
		edit: {
			templateUrl: 'fileViewer/edit.tpl.html',
			reload: false,
			controller: 'fileViewerEditCtrl'
		}
	});
})

.controller('fileViewerCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $stateParams, $sce, $http, $interval, pageLevelData){
	$scope.dataLoaded = false;
	$scope.showFile=false;
	$scope.dataLoading = false;
	$scope.dataLoadedError = false;

	$scope.config = config;
	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this point";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}

	$scope.formatData = function( data ){
		if ( !isNaN(parseFloat(data))) {
			return parseFloat(data).toFixed(2);
		} else {
			return data;
		}
	};

	$scope.trustSrc = function(src) {
		return $sce.trustAsResourceUrl(src);
	};

	$scope.fetchData = function(input){
		var user = $rootScope.loginService.getCurrentUser();
		$http({method: 'GET', url: '/getS3File?key='+ input+'&cnum='+user.customerKey}).
		success(function(awsURL, status, headers, config) {
			if(typeof awsURL.err != 'undefined'){
				$scope.dataLoadedError = true;
			} else if(typeof awsURL.url != 'undefined'){
				$scope.selectedURL = $scope.trustSrc( awsURL.url );
				$scope.dataLoaded = true;
				$scope.showFile=true;
				$scope.dataLoadedError = false;
				$scope.dataLoading = false;
			}
			
		}).
		error(function(data, status, headers, config) {
			
		});
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
					$scope.dataLoading = true;
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

		if( $scope.key.toString().indexOf(':') !== 0){
			var originalKey = angular.copy($scope.key.toString());
			$scope.widgetKeys = originalKey.split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}

		var check;
		check = $interval(function() {
			var data = pageLevelData.get($scope.key);
			if( typeof data != 'undefined'){
				$interval.cancel(check);
				check = undefined;
				/*
				if( data.length === 0){
					$scope.returnedData = data[0];
				} else {
					$scope.returnedData = data;
				}
				*/

				config.showMin= false;
				config.showMax= false;

				angular.forEach(data, function(fbRef,id){
					fbRef.$loaded().then(function(refData){

						refData.$relationsPromise.then(
							function(ok){
								$scope.fetchData(data[0].URL);					
							},
							function(err){
								$scope.dataLoadedError = true;
								$scope.dataLoaded = true;
							}
						);
						
						$scope.returnedData = data;


					});
				});

				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;


			}
		}, 750, 80);

/*
		$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
			if( data ){
				data[0].$relationsPromise.then(
					function(ok){
						$scope.fetchData(data[0].URL);					
					},
					function(err){
						$scope.dataLoadedError = true;
						$scope.dataLoaded = true;
					}
				);
				
				$scope.returnedData = data;
				
		
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			} else {
				$scope.dataLoadedError = true;
				$scope.dataLoaded = true;
			}
		});
*/
	}

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
      $scope.dataLoaded = false;
      $scope.dataLoadedError = false;
    });       

    $scope.setFileType = function(selectedFile) {
		$scope.selectedFile = selectedFile;
		
	};

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

})

.controller('fileViewerEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams){
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
			$scope.config.modelName = $scope.scopeModel;
		} else { 
			$scope.config.modelName = "SiteFiles";
		}
	}

	if(!$scope.config.valueProp){
		$scope.config.valueProp = "URL";
	}

	if(!$scope.config.labelProp){
		$scope.config.labelProp = "TextInput";
	}


	$scope.loadModelTypes = function(modelName, useScope) {
		if (!modelName && useScope) {
			modelName = $stateParams.modelName;
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
});
