angular.module( 'omniboard.404', [])
 .config(['$stateProvider', function($stateProvider) {
	var noPathFound = {
		name: 'auth.404',
		url: '/404',
		templateUrl: '404/template/404.tpl.html',
		controller: 'errorCtrl',
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				//console.log('In the perms resolve of 404');
				return Perms.check();
			}]
		}
	};
	$stateProvider
		.state(noPathFound);
}])

 .controller('errorCtrl', ['$scope','$state', function($scope, $state) {
   


  }]);

