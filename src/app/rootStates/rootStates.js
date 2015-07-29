/**
 * Root States Module for Omniboard
 *
 *	@NOTES
 *	This module should only be used for rendering the appropriate
 *	page template. Since all child states inherit the layout of 
 *	their parent state, this is a quick and easy way to show a 
 *	different page template entirely. This is primarily used to
 *	show different markup when a user is logged in versus when he's
 *	logged out. However, the auth and unauth root states actually
 *	have nothing to do with authentication. They are only named
 *	similarly to indicate that when each template should be used.
 */
angular.module( 'kickface.rootStates', [])

/**
* States (used to be Routes)
*	All of the states in our entire application should be
*	a child of one of these root states, allowing us to 
*	replace an entire page layout when needed.
*/
.config(['$stateProvider', function($stateProvider) {

	var auth  = {
		name: 'auth',
		abstract: true,
		templateUrl: 'rootStates/auth.tpl.html',
		controller: "AuthCtrl"
	};

	var noauth  = {
		name: 'noauth',
		abstract: true,
		templateUrl: 'rootStates/noauth.tpl.html',
	};  

	$stateProvider
		.state(auth)
		.state(noauth)
	;

}])

.controller("AuthCtrl", ["$modal", "$scope", "$rootScope", "FirebaseRootRef", "$state", "$stateParams", "$firebase", "$http", "initialFirebaseChild", "$location", "$route", function($modal, $scope, $rootScope, FirebaseRootRef, $state, $stateParams, $firebase, $http, initialFirebaseChild, $location, $route) {


}])
;