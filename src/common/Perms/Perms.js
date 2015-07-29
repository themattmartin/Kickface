angular.module( 'omniboard.Perms', [])

/* 
* Permissions Initialization 
*/
.run(['$rootScope', 'Perms', '$state','omniNavSettings', 'firebaseManager', 'pageLevelData', function($rootScope, Perms, $state, omniNavSettings, firebaseManager, pageLevelData) {

	/* Required for Perms factory that checks permissions on each page */
	$rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {

		if ( $state.href(toState.name, toParams) == "#/" ){
			$state.go("auth.dashboard.ready",{name: "home", modelName: "Site"});
			omniNavSettings.setState("Site", "");
		} else {
			Perms.setCurrentPath($state.href(toState.name, toParams).slice(2));
			omniNavSettings.setState(toParams.modelName,toParams.scopeID);
			
		}
		if( Object.keys(toParams).length === 0){
			omniNavSettings.setState( toState.name, '' );
		}
		//turn off any outstanding firebase refs
		//console.log('cleanup started');
		firebaseManager.cleanUp();
		pageLevelData.purge();
		//console.log('cleanup done');
	});

	/* Gets fired when a user is denied access to a page */
	$rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams, error) {
		if (Perms.lastRejection && Perms.lastRejection.redirectToLogin) {
			$rootScope.requestedParams = toParams;
			$state.go("noauth.login");
		} else { 
			////console.log('going to denied');
			$state.go("auth.denied");
		}
	});  
		
}])

/* 
/* 
* Firebase Factory for Getting References to Pages 
*/
.factory('PageRootRef', ['FirebaseRootRef','initialFirebaseChild', function(FirebaseRootRef,initialFirebaseChild) {
	return{
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions/Pages");
		}
	};
	
}])

.factory('PageRef', ['PageRootRef', function(PageRootRef) {
	return{
		get: function(path){
			return PageRootRef.get().child(path);
		}
	};
}])

/* 
* Firebase Factory for Getting References to Permissions 
*/
.factory('PermRef', ['FirebaseRootRef', 'initialFirebaseChild', function(FirebaseRootRef, initialFirebaseChild) {
	return {
		get: function(requires, uid) {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions/Assignments").child(requires).child("users").child(uid);
		}
	};
	/*
	return function(requires, uid) {
		return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions/Assignments").child(requires).child("users").child(uid);
	};
	*/
}])

.factory('ActiveUser', ['$state', '$interval', '$rootScope', 'UserItem', 'Settings','es', '$http', '$q', function($state, $interval, $rootScope, UserItem, Settings, es, $http, $q){

	return {
		timeOutInSeconds: 1200, // will need to be a setting from the admin settings page to timeout in 
		timeOutIn: 1200, // will be initially the same as admin settings
		showMessageThreshold: 300, // when the message will be displayed
		intervalProcess: null,
		initialized: false,
		initialize: function(){
			////console.log('initialize running');
			var self = this;
			var tO, tM;
			Settings.getSetting("Security", "Inactivity Timeout").then(function(data){
				tO = data;
				self.timeOutIn = data.value;
				self.timeOutInSeconds = data.value;

				Settings.getSetting("Security", "Inactivity Alert Timeout").then(function(data){
					tM = data;
				self.showMessageThreshold = data.value;
					/*()
					tO.$loaded().then(
						function(data) {
							if( data.$value !== null){
								////console.log('tO loaded', data);
								self.timeOutIn = data.value;
								self.timeOutInSeconds = data.value;
								////console.log( 'setting timeoutin ', data);
							}
						}
					);
					tM.$loaded().then(
						function(data) {
							if( data.$value !== null){
								//console.log('tM loaded', data);
								//console.log( 'setting message threshold ');
								self.showMessageThreshold = tM.value;
							}
						}
					);
					*/
					self.initialized = true;
				});
			});

		},
		updateTimeOut: function(){
			//console.log('updateTimeOut running');
			var self = this;
			//console.log('set self');
			//console.log( self.timeOutInSeconds);
			self.timeOutIn = self.timeOutInSeconds;
			//console.log('set self.timeOutIn ', self.timeOutIn);
			//console.log( $rootScope.loginService.getCurrentUser() );
			if( $rootScope.loginService.getCurrentUser() !== null){
				self.getOnlineUsers();
				//console.log('back from getOnlineUsers');
			}
			
			$rootScope.logoutIn = null;
		},

		check: function(userid){
			var self = this;
			if( !self.initialized ){
				self.initialize();
			}

			var logoutSoon = {
				timeoutIn: self.timeOutIn, 
				userid: userid
			};

			if( self.timeOutIn <= self.showMessageThreshold ){
				$rootScope.$broadcast('logout:inactivity:soon', logoutSoon);
			}

			self.timeOutIn -= 1;

			if( self.timeOutIn < 0 ){
				$interval.cancel(self.intervalProcess);
				$rootScope.$broadcast('logout:request', userid);
				$state.go('noauth.login', {});
				self.updateTimeOut();
				//the check function which is part of the perms factory will kick this off again.
			}
		},

		groupPermCheck: function(toParams, state) {
			var deferred = $q.defer();
			var user = $rootScope.loginService.getCurrentUser();
			if(user){
				var formData = angular.copy(toParams);
				formData.cid = user.customerKey;
				formData.uid = user.uid;
				formData.md5 = user.md5;
				formData.state = state;

				$http({
					method: 'POST', 
					url: '/checkUserPermissions',
					data: formData,
					headers: {'Content-Type': 'application/json'}
				}).
				success(function(response) {
					//console.log('success');
					deferred.resolve(response);
					
				}).
				error(function(response) {
					//console.log('ERR ', response );
					deferred.resolve({ allow: true });
				});
			}else{
				deferred.resolve({ allow: true });
			}
			return deferred.promise;
		},

		process: function(userid){
			$rootScope.logoutCountDownRunning = true;
			// this is executed from the login function on login.js
			var self = this;
			self.intervalProcess = $interval(function(){
				self.check(userid);
			}, 1000); 
		},
		getOnlineUsers: function(){
			//console.log('getting online users');
			// using elastic search get the users that are logged in
			var searchObj = {
				index: es.getIndexName(),
				type:  'User',
				explain: false,
				lowercaseExpandedTerms: false,
				body: {
					size: 500,
					sort: [ "Name.raw" ],
					query: { filtered: { filter: { bool: { must: [ { term: { online: true } } ] } } } }
				}
			};
			//console.log( 'going to User Item ');
			var onlineUsers = UserItem.searchOnline('Users',searchObj);

		}

	};

}])


/* 
* Permission Servies: Promise Must Resolve Before $routeProvider will render route 
*/
.factory('Perms', ['$q', '$firebase', 'FirebaseRootRef', 'PageRef', 'PageRootRef', 'PermRef', 'ActiveUser', 'DataModels', '$rootScope', 'initialFirebaseChild', 'firebaseManager', function($q, $firebase, FirebaseRootRef, PageRef, PageRootRef, PermRef, ActiveUser, DataModels, $rootScope, initialFirebaseChild, firebaseManager) {
	return {

		/* Store Current Path as Part of Factory Object */
		currentPath: null,

		lastRejection: null,

		getAssignmentRef: function(scope) {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions").child("Assignments").child(scope);
		},

		getPageAssignmentsRef: function() {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions").child("Pages");
		},		

		getScopesRef: function() {
			var ref = FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions").child("Scopes");
			//console.log( 'getScopesRef ', initialFirebaseChild.get() );
			//console.log( 'getScopesRef' , ref.toString() );
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions").child("Scopes");
		},

		getScopes: function() {
			var ref = this.getScopesRef();
			return firebaseManager.buildRef( ref );
		},

		getRightsRef: function() {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions").child("Rights");
		},

		getRights: function() {
			return firebaseManager.buildRef( this.getRightsRef() );
		},

		setAssignments: function(scope, rights) {
			var deferred = $q.defer();
			var aRef = this.getAssignmentRef(scope);
			aRef.set(rights, function(err) {
				if (err) {
					deferred.reject(err);
				} else {
					deferred.resolve();
				}
			});
			return deferred.promise;
		},

		setPageAssignments: function(pageRights) {
			var pageAssignmentsRef = this.getPageAssignmentsRef();

			pageAssignmentsRef.child("_paths").remove();
			pageAssignmentsRef.remove();

			var createPromises = [];

			angular.forEach(pageRights, function(pageRight, pageName) {
				pageName = pageName.slice(2);
				var path = pageName.replace(/\//g, "|");

				createPromises.push(pageAssignmentsRef.child("_paths/" + path).set(pageRight));
				createPromises.push(pageAssignmentsRef.child(pageName).set(pageRight));
			});

			return $q.all(createPromises);
		},		

		getAssignments: function(scope) {
			var ref = firebaseManager.buildRef( this.getAssignmentRef(scope) );
			return ref;
		},

		getPageAssignments: function() {
			var ref = firebaseManager.buildRef( this.getPageAssignmentsRef().child("_paths") );
			return ref;
		},

		recursivePageCheck: function(pageRef, deferred, self) {

			if (!self) { self  = this; }
			if (!deferred) { deferred = $q.defer(); }

			var page = firebaseManager.buildRef(pageRef).$asObject();

			page.$loaded().then(
				function() {
					//page.$off("loaded");
					//console.log('pageRef ', pageRef );
					if (page.requires) {
						deferred.resolve(page.requires);
					} else {
						var nextPageRef = pageRef.parent().child("*");
						if (nextPageRef.toString() == pageRef.toString()) {
							nextPageRef = pageRef.parent().parent().child("*");
						}
						if (nextPageRef.parent().toString() !== PageRootRef.get().parent().toString()) { 
							self.recursivePageCheck(nextPageRef, deferred, self);
						} else {
							deferred.reject("End of the line!");
						}
					}
				}
			);

			return deferred.promise;
		},

		permCheck: function (requires, uid) {
			var deferred = $q.defer();

			var checkPermissions = function(scopes, scopeName, require){
				var permissionDeferred = $q.defer();
				var thisRequires = scopeName + "/" + require;
				var permRef = new PermRef.get(thisRequires, uid);

				var perm = $firebase(permRef).$asObject();
				perm.$loaded().then(function (data) {
					perm.$destroy();
					scopes.$destroy();
					permissionDeferred.resolve(data.$value);
				});
				return permissionDeferred.promise;
			};

			var scopes = this.getScopes().$asObject();
			scopes.$loaded().then(function (scopes) {
				var promises = [];
				angular.forEach(scopes, function (scope, scopeName) {
					if (scopeName.indexOf('$') !== -1) {
						return;
					}
					if(Array.isArray(requires)){
						angular.forEach(requires, function (require) {
							promises.push(checkPermissions(scopes, scopeName, require));
						});
					}else{
						promises.push(checkPermissions(scopes, scopeName, requires));
					}
				});

				$q.all(promises).then(function(data){
					var hasPermissions = data.some(function(value,key) {
						if (value) {
							return true;
						}
					});

					if (hasPermissions) {
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
				});
			});

			return deferred.promise;
		},

		userCheck: function(uid) {
			//console.log('running user check');
			var deferred = $q.defer();
			var user = DataModels.getItem('User', uid);
			user.$relationsPromise.then(
				function(val) {
					//console.log('got user relations');
					if (user && 
						user.hasOwnProperty("$UserStatus") &&
						user.$UserStatus.hasOwnProperty("Name") &&
						user.$UserStatus.Name == "Disabled") {
						deferred.reject("User Account has been disabled.");
					} else {
						deferred.resolve();
					}
				},
				function(err) {
					//console.log('ERR user relations');
					deferred.resolve();
				}
			);
			return deferred.promise;
		},

		/* Setter Method for currentPath */
		setCurrentPath: function(state) {
			this.currentPath = state;
		},

		/* Getter Method for currentPath */
		getCurrentPath: function() {
			return this.currentPath;
		},

		/* Checks Permissions: is user logged in? can they access this page? */
		check: function() {

			//console.log('check');

			var self = this;
			var deferred = $q.defer();
				if (!$rootScope.loginService.getCurrentUser() ) {
					//console.log('not logged in');
					self.lastRejection = {
						reason: "You are not logged in.",
						path: self.getCurrentPath(),
						redirectToLogin: true
					};
					deferred.reject(self.lastRejection);

				} else {
					//console.log(' logged in');
					var user = $rootScope.loginService.getCurrentUser();
					//console.log( 'user is ', user);
					ActiveUser.updateTimeOut(user.uid);
					//console.log('updated timeout for ', user.uid);

					self.userCheck(user.uid).then(
						function() {
							//console.log('user check done');
							deferred.resolve();
							/*
							self.recursivePageCheck(new PageRef.get(self.getCurrentPath()))
							.then(
								function(requires) {
									//console.log('recursivePageCheck done');
									self.permCheck(requires, user.uid)
									.then(
										function(data) {
											//console.log('permCheck done');
											deferred.resolve();
										},
										function(requires) {
											//console.log('recursivePageCheck err');
											//console.log("You do not have sufficient permission to access this page." );
											self.lastRejection = {
												reason: "You do not have sufficient permission to access this page.",
												path: self.getCurrentPath(),
												requires:  requires
											};
											deferred.reject(self.lastRejection);
										})
									;
								},
								function(err) {
									//console.log('recursivePageCheck err');
									//console.log("Page not in Firebase or does not have requires property" );
									self.lastRejection = {
										reason: "Page not in Firebase or does not have requires property",
										path: self.getCurrentPath()
									};
									deferred.reject(self.lastRejection);
								})
							;
							*/
						},
						function(err) {
							//console.log( 'user check err');
							self.lastRejection = {
								reason: err,
								path: self.getCurrentPath()
							};
							deferred.reject(self.lastRejection);
						}
					);
				}
			return deferred.promise;
		}
	};
}])

;