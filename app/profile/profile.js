angular.module('uiRouterSample.profile', ['ui.router'])

.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider,   $urlRouterProvider) {
	$stateProvider
		.state('profile', {
			abstract: false,
			url: '/profile', // This abstract state will prepend '/profile' onto the urls of all its children.
			templateUrl: 'static/app/profile/profile.html',
			// You can pair a controller to your template. There *must* be a template to pair with.
			controller: ['$scope', '$state', 'utils', 'appFirebase', function (  $scope, $state, utils, appFirebase) {
				console.log('profile ',$state);
				console.log( 'utils ', utils );
				$scope.data = appFirebase.getUsers();
			}]
		});
}]);

