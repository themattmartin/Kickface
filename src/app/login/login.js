/**
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
angular.module( 'kickface.login', [])

/**
* States (used to be Routes)
*	All of the states in our entire application should be
*	a child of one of these root states, allowing us to 
*	replace an entire page layout when needed.
*/
.config(['$stateProvider', function($stateProvider) {
	var loginState = {
		name: 'noauth.login',
		url: '/login',
		templateUrl: 'login/login.tpl.html', 
		controller: 'LoginCtrl', 
		authRequired: false
	};

	var homeState = {
		name: 'noauth.home',
		url: '/',
		templateUrl: 'login/login.tpl.html', 
		controller: 'homeCtrl', 
		authRequired: false
	};

	$stateProvider
		.state(loginState)
		.state(homeState)
	;    
}])

 .controller('LoginCtrl', ['$scope', 'simpleLogin', '$location', function($scope, simpleLogin, $location) {
    $scope.email = null;
    $scope.pass = null;
    $scope.confirm = null;
    $scope.createMode = false;

    $scope.login = function(email, pass) {
      $scope.err = null;
      simpleLogin.login(email, pass)
        .then(function(/* user */) {
          $location.path('/account');
        }, function(err) {
          $scope.err = errMessage(err);
        });
    };

    $scope.createAccount = function() {
      $scope.err = null;
      if( assertValidAccountProps() ) {
        simpleLogin.createAccount($scope.email, $scope.pass)
          .then(function(/* user */) {
            $location.path('/account');
          }, function(err) {
            $scope.err = errMessage(err);
          });
      }
    };

    function assertValidAccountProps() {
      if( !$scope.email ) {
        $scope.err = 'Please enter an email address';
      }
      else if( !$scope.pass || !$scope.confirm ) {
        $scope.err = 'Please enter a password';
      }
      else if( $scope.createMode && $scope.pass !== $scope.confirm ) {
        $scope.err = 'Passwords do not match';
      }
      return !$scope.err;
    }

    function errMessage(err) {
      return angular.isObject(err) && err.code? err.code : err + '';
    }
  }]);
