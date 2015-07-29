/**
 * Access Denied Module for Omniboard
 *
 *	@NOTES
 *	This module renders the page that is displayed when a user
 *	is denied access to a resource.
 */
angular.module( 'kickface.denied', [])


/**
 * States (used to be Routes)
 */
.config(['$stateProvider', function($stateProvider) {
	var denied = {
		name: 'auth.denied',
		url: '/denied',
		templateUrl: 'denied/index.tpl.html', 
		controller: 'DeniedCtrl', 
		authRequired: false 
	};
	$stateProvider.state(denied);
}])


/**
 * Controller
 */
.controller('DeniedCtrl', ['$scope', function($scope) {

	/**
	 * The Perms service keeps a copy of the latest 
	 * rejection for this user so that we can use it here
	 * to let the user know what he was rejected from and
	 * why.
	 */

}])

;