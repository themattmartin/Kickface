// MAIN APPLICATION MODULE
angular.module( 'kickface', [
  'ui.router',
  'ngAnimate',
  'ngSanitize',
  'ngCookies',
  'ngRoute',
  'webStorageModule',
  'templates-app',
  'templates-common',
  'firebase',
  'ui.bootstrap',
  'ngGrid',
  'mgcrea.ngStrap.affix',
  'mgcrea.ngStrap.tooltip',
  'mgcrea.ngStrap.popover',
  //'firebaseConfig',
  'kickface.denied',
  'kickface.rootStates',
  'kickface.home',
  'kickface.login'
])


// CONFIGURE HEADERS
.config(['$httpProvider', '$urlRouterProvider', function($httpProvider, $urlRouterProvider){
  //delete $httpProvider.defaults.headers.common['X-Requested-With'];
  
 /* delete $httpProvider.defaults.headers.common['Access-Control-Request-Headers'];
  delete $httpProvider.defaults.headers.common['Access-Control-Request-Method'];
  $httpProvider.defaults.withCredentials = false;*/
  /////////////////////////////
  // Redirects and Otherwise //
  /////////////////////////////

  // Use $urlRouterProvider to configure any redirects (when) and invalid urls (otherwise).
  $urlRouterProvider

    // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
    .otherwise('/login');

}])

.factory('loginService', ['$rootScope', 'webStorage', '$state', function($rootScope, webStorage, $state) {
	var currentUserKey = 'omniboard.user';
	$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
		var state = '';
		if(toState.parent){
			state += toState.parent.url;
		}
		state += toState.url;
	});

	$rootScope.$on("logout:success", function(evt, stateLocation) {
		webStorage.remove(currentUserKey);
	});
  
	return{
		currentUser: webStorage.get(currentUserKey) || null,
		getCurrentUser: function(){
			return this.currentUser;
		},
		setCurrentUser: function(user){
			this.currentUser = user;
			webStorage.add('omniboard.user', user);
		}
	};
}])

.filter('searchObject', function() {
	// can be used to search any object 
	// called via the markup | searchObject:{keyToSearch:ngModelInput}
	return function(obj, searchPhrase) {
		var finalObj = {};
		var returnFullObject = false;
		var wasFound = false;

		for( var item in searchPhrase ){
			if( typeof searchPhrase[item] != 'undefined' ){
				for( var key in obj ){
					if( key.indexOf('$') !== 0 ){
						if( typeof obj[key][item] != 'undefined' ){
							if( obj[key][item].toString().toLowerCase().indexOf( searchPhrase[item].toLowerCase() ) > -1 ){
								finalObj[key] = obj[key];
								wasFound = true;
							}
						} else {
							returnFullObject = true;
							break;
						}
					}
				}
				if( returnFullObject && wasFound === false ){
					break;
				}
			} else {
				returnFullObject = true;
				break;
			}
		}

		if( returnFullObject && wasFound === false ){
			return obj;
		} else {
			return finalObj;
		}

	};
})

.filter('filterMultiple',['$filter',function ($filter) {
return function (items, keyObj) {
    var filterObj = {
        data:items,
        filteredData:[],
        applyFilter : function(obj,key){
            var fData = [];
            if (this.filteredData.length === 0)
                {this.filteredData = this.data;}
            if (obj){
                var fObj = {};
                if (!angular.isArray(obj)){
                    fObj[key] = obj;
                    fData = fData.concat($filter('filter')(this.filteredData,fObj));
                } else if (angular.isArray(obj)){
                    if (obj.length > 0){
                        for (var i=0;i<obj.length;i++){
                            if (angular.isDefined(obj[i])){
                                fObj[key] = obj[i];
                                fData = fData.concat($filter('filter')(this.filteredData,fObj));    
                            }
                        }

                    }
                }
                if (fData.length > 0){
                    this.filteredData = fData;
                }
            }
        }
    };
    if (keyObj){
        angular.forEach(keyObj,function(obj,key){
            filterObj.applyFilter(obj,key);
        });
    }
    return filterObj.filteredData;
};
}])


.filter('orderObjectBy', function() {
	return function(items, field, reverse) {

		var filtered = [];
		angular.forEach(items, function(item,id) {
			item.key = id;
			filtered.push(item);
		});
		filtered.sort(function (a, b) {
			return (a[field] > b[field] ? 1 : -1);
		});
		if(reverse){
			filtered.reverse();
		}
		return filtered;
	};
})


.factory('firebaseManager',[ '$firebase', function($firebase){
	// factory to handle create and destruction of firebase refs
	// Example call: firebaseManager.buildRef(this.getSettingRef(group, name));
	// make sure you include firebaseManager in the controller
	var totalRefs = 0;
	return {
		fbRefs: [],
		firebaseRefs: {},
		constants: {}, // ref constances 
		cleanUp: function(){
			//console.log('cleanup started', new Date() );
			angular.forEach(this.firebaseRefs, function(val, id){
                if(val._objectSync) {
                    val.$asObject().$destroy();
                }
			});
			this.firebaseRefs = {};
		},
		addRef: function(ref){
			if( typeof this.firebaseRefs[ref.$ref().toString()] == 'undefined' ){
				this.firebaseRefs[ref.$ref().toString()] = ref;
			}
			//this.fbRefs.push(ref);
		},
		buildRef: function(ref){
			//console.log( ref.toString() );
			if( typeof this.firebaseRefs[ref.toString()] == 'undefined' ){
				var firebaseRef = $firebase(ref);
				this.addRef(firebaseRef);
				totalRefs = totalRefs + 1;
				//console.log('totalRefs ', totalRefs);
				//console.log( this.fbRefs.length , "  -  " , Object.keys( this.firebaseRefs ).length );
				return firebaseRef;
			} else {
				//console.log( this.fbRefs.length , "  -  " , Object.keys( this.firebaseRefs ).length );
				return this.firebaseRefs[ref.toString()];
			}
		}
	};            
}])



/*----limit text in a string for label----*/
.filter('limitStringLength', function(){
// EXAMPLE CALL <p>{{name | limitStringLength:10}}

return function(str, len){
  if(typeof str === 'undefined'){
		return '';
	}
  if( str.length > len){
    return str.substr(0, len)+'...';
  } else {
    return str;
  }
};
})

// INITIALIZE AUTHENTICATION
.run(['$rootScope', '$location', 'loginService', 'firebaseManager', function($rootScope, $location, loginService, firebaseManager) {
	$rootScope.loginService = loginService;
  // this ensures the timeouts are setting form the settings stored in firebase

   var user = $rootScope.loginService.getCurrentUser();
    if( user ){
      Locks.initialize();
      $rootScope.$broadcast("login:complete:success", 'auth.dashboard.ready', user.uid);
    }

  /* This prevents navigation away from a page when data is not committed */
  var _preventNavigation = false;
  var _preventNavigationUrl = null;

  $rootScope.allowNavigation = function() {
    _preventNavigation = false;
  };

  $rootScope.preventNavigation = function() {
    _preventNavigation = true;
    _preventNavigationUrl = $location.absUrl();
  };

  $rootScope.$on('$locationChangeStart', function (event, newUrl, oldUrl) {

    if( !$rootScope.logoutCountDownRunning ){
      var user = $rootScope.loginService.getCurrentUser();
        if( user) {
          ActiveUser.process(user.uid);
        }
    }

    // Allow navigation if our old url wasn't where we prevented navigation from
    if (_preventNavigationUrl != oldUrl || _preventNavigationUrl == null) {
      $rootScope.allowNavigation();
      return;
    }

    if (_preventNavigation && !confirm("You have unsaved changes, do you want to continue?")) {
      event.preventDefault();
    }
    else {
      $rootScope.allowNavigation();
    }
  });

  $rootScope.$on('$viewContentLoaded', function(){
    window.scrollTo(0, 0);
  });

  // Take care of preventing navigation out of our angular app
  window.onbeforeunload = function() {
    // Use the same data that we've set in our angular app
    if (_preventNavigation && $location.absUrl() == _preventNavigationUrl) {
      return "You have unsaved changes, do you want to continue?";
    }
  };

}])

;
