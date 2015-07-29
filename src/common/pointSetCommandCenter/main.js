/**
* Point Set Command Center Module for Omniboard
*/
angular.module('omniboard.pointSetCommandCenter', [])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var main = {
		name: 'auth.pointSetCommandCenter',
		url: '/pointSetCommandCenter',
		templateUrl: 'pointSetCommandCenter/template/pointSetCommandCenter.tpl.html',
		controller: 'pointSetCommandCenterCtrl',
	};		

	$stateProvider.state(main);

}])
.controller('pointSetCommandCenterCtrl', ['$rootScope', '$scope', 'FirebaseRootRef', function($rootScope, $scope, FirebaseRootRef) {

	$scope.pointTypes = [];
	$scope.sites = [];
	$scope.selectedPointTypes = [];
	$scope.selectedSites = [];

	FirebaseRootRef.child('/dataItems/models/PointType/data').once('value',function(dataSnap){
		angular.forEach(dataSnap.val(), function(val,id){
			$scope.pointTypes.push(val);
		});
	});
	
	FirebaseRootRef.child('/dataItems/models/Site/data').once('value',function(dataSnap){
		angular.forEach(dataSnap.val(), function(val,id){
			if ($rootScope.userSites && !$rootScope.userSites[id]) { return; }
			$scope.sites.push(val);
		});
	});

	var updateSelected = function(model, action, id) {
		if (action === 'add' && model.indexOf(id) === -1) {
			model.push(id);
		}
		if (action === 'remove' && model.indexOf(id) !== -1) {
			model.splice(model.indexOf(id), 1);
		}
	};

	$scope.updateSelection = function($event, model, id) {
		var checkbox = $event.target;
		var action = (checkbox.checked ? 'add' : 'remove');
		updateSelected(model, action, id);
	};

	$scope.selectAll = function($event, availableModel, selectedModel) {
		var checkbox = $event.target;
		var action = (checkbox.checked ? 'add' : 'remove');

		for (var item in availableModel) {
			updateSelected(selectedModel, action, availableModel[item].Name);
		}
	};

	/*
	$scope.selectAllFilteredItems = function (){
		var filtered = filter($scope.selectedSite.rtus, $scope.search_text);

		angular.forEach(filtered, function(rtu) {
			$scope.checkedRTUs.push(rtu.name);
		});
	};
	*/

	$scope.isSelected = function(model, id) {
		return model.indexOf(id) >= 0;
	};

	//something extra I couldn't resist adding :)
	$scope.isSelectedAll = function(selectedModel, availableModel) {
		if (selectedModel && availableModel){
			return selectedModel.length === availableModel.length;
		}
	};
}]);
