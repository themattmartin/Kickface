// Make sure to include the `ui.router` module as a dependency
angular.module('uiRouterSample', [
  'uiRouterSample.contacts',
  'uiRouterSample.contacts.service',
  'uiRouterSample.utils.service',
  'uiRouterSample.profile',
  'ui.router', 
  'ngAnimate',
  'firebase'
])

.service('appFirebase', function($firebaseAuth, $firebaseObject, $firebaseArray){
	return {
		ref : new Firebase("https://taekwondo.firebaseio.com"),
		init : function(){
			console.log('initialized ', this.ref.toString() );
			this.ref.authWithCustomToken("ADDKEY", function(error, authData) {
				if (error) {
					console.log("Authentication Failed!", error);
				} else {
					console.log("Authenticated successfully with payload:", authData);
				}
			});
		},
		getUsers : function(){
			console.log( this.ref.child('users').toString() );
			return $firebaseObject( this.ref.child('users') );
			
		}
	};

	// download the data into a local object
	//$scope.data = $firebaseObject(ref);
})

.run(['$rootScope', '$state', '$stateParams', 'appFirebase', function ($rootScope,   $state,   $stateParams, appFirebase) {
    // It's very handy to add references to $state and $stateParams to the $rootScope
    // so that you can access them from any scope within your applications.For example,
    // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
    // to active whenever 'contacts.list' or one of its decendents is active.
    appFirebase.init();
    console.log( $state );
    console.log( $stateParams );
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    }
  ]
)

.config(['$stateProvider', '$urlRouterProvider',function ($stateProvider,   $urlRouterProvider) {

      /////////////////////////////
      // Redirects and Otherwise //
      /////////////////////////////

      // Use $urlRouterProvider to configure any redirects (when) and invalid urls (otherwise).
      $urlRouterProvider

        // The `when` method says if the url is ever the 1st param, then redirect to the 2nd param
        // Here we are just setting up some convenience urls.
        .when('/c?id', '/contacts/:id')
        .when('/user/:id', '/contacts/:id')
        .when('/profile', '/profile')

        // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
        .otherwise('/');


      //////////////////////////
      // State Configurations //
      //////////////////////////

      // Use $stateProvider to configure your states.
      $stateProvider

        //////////
        // Home //
        //////////

        .state("home", {

          // Use a url of "/" to set a state as the "index".
          url: "/",

          // Example of an inline template string. By default, templates
          // will populate the ui-view within the parent state's template.
          // For top level states, like this one, the parent template is
          // the index.html file. So this template will be inserted into the
          // ui-view within index.html.
          template: '<p class="lead">Welcome to the UI-Router Demo</p>' +
            '<p>Use the menu above to navigate. ' +
            'Pay attention to the <code>$state</code> and <code>$stateParams</code> values below.</p>' +
            '<p>Click these links—<a href="#/c?id=1">Alice</a> or ' +
            '<a href="#/user/42">Bob</a>—to see a url redirect in action.</p>'

        })

        ///////////
        // About //
        ///////////

        .state('about', {
          url: '/about',

          // Showing off how you could return a promise from templateProvider
          templateProvider: ['$timeout',
            function (        $timeout) {
              return $timeout(function () {
                return '<p class="lead">UI-Router Resources</p><ul>' +
                         '<li><a href="https://github.com/angular-ui/ui-router/tree/master/sample">Source for this Sample</a></li>' +
                         '<li><a href="https://github.com/angular-ui/ui-router">Github Main Page</a></li>' +
                         '<li><a href="https://github.com/angular-ui/ui-router#quick-start">Quick Start</a></li>' +
                         '<li><a href="https://github.com/angular-ui/ui-router/wiki">In-Depth Guide</a></li>' +
                         '<li><a href="https://github.com/angular-ui/ui-router/wiki/Quick-Reference">API Reference</a></li>' +
                       '</ul>';
              }, 100);
            }]
        })
    }
  ]
);
