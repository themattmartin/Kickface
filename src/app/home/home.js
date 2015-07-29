/**
* Home Page Module for Omniboard
*/
angular.module( 'kickface.home', [])


/**
* States (used to be Routes)
*/
.config(['$stateProvider', function($stateProvider) {
	var home = {
		name: 'auth.home',
		url: '/home',
		templateUrl: 'home/index.tpl.html',
		controller: 'HomeCtrl', 
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				
				return Perms.check();
			}]
		}
	};

	$stateProvider
		.state(home)
	;

}])


/**
 * Controller
 */
.controller('HomeCtrl', ['$scope', function($scope) {
	$scope.dashboardKey = "home";
	$scope.collapsible = true;
}])

;