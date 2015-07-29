/**
* Login Module for Omniboard
*/
angular.module( 'kickface.login', [])


/**
 * TO-DO: 
 *  - Refactor all firebase queries to use $firebase service (angularFire)
 *  - Move all queries into factory as a firebase wrapper
 */

/**
 * Listen for Logout Events
 */
.run(['$rootScope', 'FirebaseRootRef', '$state', function($rootScope, FirebaseRootRef, $state) {

	$rootScope.$on("logout:success", function(evt, stateLocation) {
		$state.go(stateLocation);
	});

	$rootScope.logout = function() {
		var user = $rootScope.loginService.getCurrentUser();
		if (user) { $rootScope.$broadcast("logout:request", user.uid); }
	};

}])  


/**
* States (used to be Routes)
*/
.config(['$stateProvider', function($stateProvider) {
	var loginState = {
		name: 'noauth.login',
		url: '/login',
		templateUrl: 'login/form.tpl.html', 
		controller: 'LoginCtrl', 
		authRequired: false
	};

	var homeState = {
		name: 'noauth.home',
		url: '/',
		templateUrl: 'login/form.tpl.html', 
		controller: 'homeCtrl', 
		authRequired: false
	};

	$stateProvider
		.state(loginState)
		.state(homeState)
	;    
}])


/**
 * Controller
 */
.controller('homeCtrl', ['$scope', '$location', '$rootScope', '$state', 'loginService', function($scope, $location, $rootScope, $state, loginService){
	if(loginService.getCurrentUser() === null){
		$state.transitionTo('noauth.login');
	}else{
		$state.go(stateLocation, { name: 'home', modelName: 'Site'});
	}
}])

.controller('LoginCtrl', ['$scope', '$location', '$rootScope', 'FirebaseRootRef', '$cookieStore', '$firebase', 'addToDate', '$state', '$http', 'initialFirebaseChild', function($scope, $location, $rootScope, FirebaseRootRef, $cookieStores, $firebase, addToDate, $state, $http, initialFirebaseChild) {

}])

;