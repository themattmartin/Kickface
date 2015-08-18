angular.module( 'kickface.home', [])


/**
* States (used to be Routes)
*/
.config(['$stateProvider', function($stateProvider) {
	var home = {
		name: 'auth.home',
		url: '/home',
		templateUrl: 'home/home.tpl.html',
		controller: 'HomeCtrl', 
		authRequired: true , 
		resolve:{}
	};

	$stateProvider
		.state(home)
	;

}])

.controller('HomeCtrl', ['$scope', 'fbutil', 'user', 'FBURL', function($scope, fbutil, user, FBURL) {
	$scope.syncedValue = fbutil.syncObject('syncedValue');
	$scope.user = user;
	$scope.FBURL = FBURL;
}]);