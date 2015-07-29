angular.module('omniboard.searchBox', ['adf.provider'])

.factory('CommandQueueRef', function(FirebaseRootRef) {
  return FirebaseRootRef.child("commandQueue");
})

.config(function(dashboardProvider){
	dashboardProvider
	.widget('searchBox', {
		title: 'Search Box',
		description: 'Displays the value of any model property',
		controller: 'searchBoxCtrl',
		templateUrl: 'searchBox/searchBox.tpl.html',
		edit: {
			templateUrl: 'searchBox/edit.tpl.html',
			reload: false,
			controller: 'searchBoxEditCtrl'
		}
	});
})

.controller('searchBoxCtrl', function($scope, config, $rootScope, DataModels, $state, Dashboards, $location){

	// from the config we need to pull the device types along
	// with the current selected site

	// search elasticsearch and find all the points based on their
	// devices returned
	$scope.dataLoaded = false;
	$scope.config = config;
	$scope.showInfo = false;
	$scope.dashboards = Dashboards.list();
	$scope.pointsToShow = [];

	//config.dboard = $state.params.name;

	var modelName = (config.modelName ? config.modelName : $state.params.modelName);
	var scopeID = $state.params.scopeID;

	var relations = DataModels.getModelRelations('Point').$asObject();
	relations.$loaded().then(function(data) {

		//console.log('relations:',relations);
		var boolHasRelation = (relations[modelName] && relations[modelName].relationType.name == "belongsTo");
		//console.log(modelName,'boolHasRelation' , boolHasRelation);

		if (boolHasRelation) {
			var filter = {};
			if (modelName == 'Site' && !$rootScope.superUser && $rootScope.userSites) {
				filter['_id'] = Object.keys($rootScope.userSites);
			}

			DataModels.fetchFilteredDate(modelName,filter).then(function(pts){
				angular.forEach(pts, function(ptData) {
					$scope.pushData(ptData, config);
				});
				$scope.dataLoaded = true;
			});
		} else {
			DataModels.fetchFilteredDate(modelName,{ '_id' : scopeID }).then(function(data){
				if (data.length > 0 && data[0].Site) {
					var innerFilter = { 'Site': ( !$rootScope.superUser && $rootScope.userSites ? Object.keys($rootScope.userSites) : data[0].Site ) };
					DataModels.fetchFilteredDate(modelName,innerFilter).then(function(pts){
						angular.forEach(pts, function(ptData) {
							$scope.pushData(ptData, config);
						});
						$scope.dataLoaded = true;
					});
				} else {
					DataModels.fetchFilteredDate(modelName,{}).then(function(data){
						angular.forEach(data, function(mData) {
							$scope.pushData(mData, config);
						});
						$scope.dataLoaded = true;
					});
				}
			});
		}
	});

	$scope.pushData = function(ptData, config){
		var data = { 'value': ptData.Name, 'href': '/dashboard/' + config.dboard + '/' + config.modelName + '/' + ptData._id };
		$scope.pointsToShow.push(data);
	};

	$scope.moveOn = function(path){
		console.log( path );
		$location.path( path );
		$state.reload();
	};
})
.controller('searchBoxEditCtrl', function($scope, es, $rootScope, DataModels, Dashboards){
	var user = $rootScope.loginService.getCurrentUser();

	if(user){
		Dashboards.getUserCustomDashboards(user.uid).then(function(dashboardData){
			$scope.dashboards = dashboardData.$asObject();
		});
	}

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

	if(!$scope.config.modelName){
		$scope.config.modelName = "Point";
	}

	if(!$scope.config.valueProp){
		$scope.config.valueProp = "Value";
	}

	if(!$scope.config.labelProp){
		$scope.config.labelProp = "Name";
	}

	if(!$scope.config.showLabel){
		$scope.config.showLabel = true;
	}

	if(!$scope.config.showValue){
		$scope.config.showValue = true;
	}

	if(!$scope.config.showModel){
		$scope.config.showModel = true;
	}

	$scope.loadModelValues = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
	};

	if ($scope.config.modelName) {
		$scope.loadModelValues($scope.config.modelName);
	}

});
