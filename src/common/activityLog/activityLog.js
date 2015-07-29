angular.module('omniboard.activityLog', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('activityLog', {
		title: 'Activity Logs',
		description: 'Displays the activity log related to any model',
		controller: 'activityLogCtrl',
		templateUrl: 'activityLog/activityLog.tpl.html',
		edit: {
			templateUrl: 'activityLog/edit.tpl.html',
			reload: false,
			controller: 'activityLogEditCtrl'
		}
	});
})

.controller('activityLogCtrl', function($scope, config, es, $modal, $rootScope, DataModels, $filter, $stateParams, $interval, pageLevelData){
	config.useScope = true;
	$scope.dataLoaded = false;
	if (!config.key) {
		$scope.returnedData = 'Please configure this point';
	} else {
		$scope.key = config.key;
	}

	$scope.message = {};
	$scope.message.newNote = "";
	$scope.addNote = function () {
		var note = {};
		note.Message = $scope.message.newNote;
		note.Name = 'Activity Log';
		note[$scope.scopeModel] = $scope.scopeId;
		note.User = $rootScope.loginService.getCurrentUser().User;
		note.lastModified = new Date().getTime();
		DataModels.addItemNote($scope.scopeModel, note);
		$scope.newNote = "";
		$scope.returnedData.push(note);
	};

	if (config.useScope) {
		$scope.returnedData = [];
		if ($scope.scopeModel && $scope.scopeId) {
			var itemNotes = DataModels.getItemNotes($scope.scopeModel, $scope.scopeId);
			itemNotes.then(function (data) {
				$scope.returnedData = data;
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
			});
		} else {
			$scope.dataLoaded = false;
			$scope.dataLoadedError = true;
		}
	}
})
.controller('activityLogEditCtrl', function($scope, es, $rootScope, DataModels, $stateParams){
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	if(!$scope.config.modelName){
		$scope.config.modelName = $stateParams.modelName;
	}
	$scope.config.query = [];
});