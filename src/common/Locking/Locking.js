angular.module( 'omniboard.Locking', [])

.run(['$rootScope', 'Locks', '$state', function($rootScope, Locks, $state) {

	$rootScope.$on("login:complete:success", function(evt, stateLocation, userid) {
		Locks.initialize();
	});
	$rootScope.$on("logout:request", function(evt, stateLocation, userid) {
		Locks.destroy();
	});
 
}])

/* 
* Firebase Factory for Getting References to Pages 
*/
.factory('LockRootRef', ['FirebaseRootRef','initialFirebaseChild', function(FirebaseRootRef,initialFirebaseChild) {
	return FirebaseRootRef.child(initialFirebaseChild.get()).child("locks");
}])

/* 
* Permission Servies: Promise Must Resolve Before $routeProvider will render route 
*/
.factory('Locks', ['$q', '$firebase', 'FirebaseRootRef', 'LockRootRef', 'DataModels', '$rootScope', '$state', 'initialFirebaseChild', 'firebaseManager', function($q, $firebase, FirebaseRootRef, LockRootRef, DataModels, $rootScope, $state, initialFirebaseChild, firebaseManager) {
	return {

		currentPath: null,

		lastRejection: null,

		lockData: null,
		initSCS: null,
		initSCE: null,
		initialize: function(){
			var that = this;
			/* Required for Locks factory that checks permissions on each page */
			this.initSCS = $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {
				//console.log('Locking - stateChangeStart ', toState);

				if ( $state.href(toState.name, toParams) == "#/" ){
					$state.go("auth.dashboard.ready",{name: "home", modelName: "Site"});
				} else {
					if( toState.name != 'noauth.login') {
						if( that.getCurrentPath() !== null && that.getCurrentLockData() !== null){
							that.releaseLock(that.getCurrentPath());
						}
					}
					that.setCurrentPath($state.href(toState.name, toParams).slice(2));
				}
			});

			/* Gets fired when a user is denied access to a page */
			this.initSCE = $rootScope.$on("$stateChangeError", function(event) {
				if( (typeof that.lastRejection != 'undefined') && (that.lastRejection !== null) ) {
					$state.go("noauth.login");
				} else { 
					$state.go("auth.denied");
				}
			});  

		},
		destroy: function(){

			this.initSCS();
			this.initSCE();

		},

		verify: function() {
			var self = this;
			var deferred = $q.defer();

			var user = $rootScope.loginService.getCurrentUser();
			self.checkForLock(user.uid).then(function(lockData) {

				var getUserName;
				var returnObj = {
					isEditable: false,
					lockedSince: 0,
					lockedBy: '',
					lockedByYou: false,
					lockedById: user.uid
				};
				if( lockData.$value ){
					angular.forEach(lockData.$value, function(value,key){
						if( user.uid === key ){
							returnObj.isEditable = true;
							returnObj.lockedSince = value;
							returnObj.lockedByYou = true;
							getUserName = self.getUserName(user.uid).$asObject();
							self.setLock(user.uid,(new Date()).getTime());
							returnObj.lockedSince = (new Date()).getTime();
						} else {
							returnObj.lockedSince = value;
							getUserName = self.getUserName(key).$asObject();
						}
						getUserName.$loaded().then(
							function(data) {
								returnObj.lockedBy = data.Firstname + " " + data.Lastname;
								self.setCurrentLockData(returnObj);
								deferred.resolve(returnObj);
							}
						);

					});
					deferred.resolve(returnObj);
				} else {
					//store a lock for this item
					returnObj.isEditable = true;
					returnObj.lockedSince = (new Date()).getTime();
					getUserName = self.getUserName(user.uid).$asObject();
					getUserName.$loaded().then(
						function(data) {
							returnObj.lockedBy = data.Firstname + " " + data.Lastname;
							self.setLock(user.uid,returnObj.lockedSince);
							self.setCurrentLockData(returnObj);
							deferred.resolve(returnObj);
						}
					);

				}
			});
				
			return deferred.promise;
		},
		getNormalizedPath: function(path){
			
			if( path === null ){
				return '';
			} else {
				return path.split('/').join('|');
			}
			
		},
		getUrlPath: function(path){
			return path.split('|').join('/');
		},
		getUserName: function(userid){
			return firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models/User/data').child(userid));
		},			
		setLock: function(user,time) {
			var updateObject = {};
			updateObject[user] = time;
			var currentLockPath = this.getNormalizedPath(this.getCurrentPath());
			if( currentLockPath !== ''){
				firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('locks').child( currentLockPath )).$update(updateObject);
			}
		},
		getCurrentLockData: function(){
			return this.lockData;
		},
		setCurrentLockData: function(data){
			if(data){
				this.lockData = data;
			} else {
				this.lockData = null;
			}
		},
		releaseLock: function(){
			var self = this;
			var user = $rootScope.loginService.getCurrentUser();
			if( self.getCurrentLockData() !== null && self.getCurrentLockData.lockedById !== null){
				if( user.uid == self.getCurrentLockData().lockedById && self.getCurrentPath() == self.getNormalizedPath(self.getCurrentPath())){
					firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('locks').child(self.getNormalizedPath(self.getCurrentPath()))).$remove();
					self.setCurrentLockData();
				}
			}
		},
		releaseLockByKey: function(key){
			firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('locks').child( key )).$remove();
		},
		releaseAllUserLocks: function(userid){
			var self = this;
			var allLocks = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('locks'));
			angular.forEach(allLocks, function(value,key){
				angular.forEach(value, function(data,id){
					if( id == userid ){
						self.releaseLockByKey(key);
					}
				});
			});
		},
		checkForLock: function(user){
			//initialize
			var self = this;
			var deferred = $q.defer();
			var currentLockPath = self.getNormalizedPath(self.getCurrentPath());
			if( currentLockPath === '' ){
				deferred.resolve();
			} else {
				var isLocked = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('locks').child( currentLockPath )).$asObject();
				isLocked.$loaded().then(
					function(lockData) {
						if( lockData && Object.keys(lockData).length > 0 ){
							deferred.resolve(lockData);
						} else {
							deferred.resolve();
						}
					}
				);
			}
			return deferred.promise;
		},
		/* Setter Method for currentPath */
		setCurrentPath: function(state) {
			this.currentPath = state;
		},

		/* Getter Method for currentPath */
		getCurrentPath: function() {
			return this.currentPath;
		}
	};
}])


.directive('lockStatus', [function () {

    return {
        restrict: 'EA',
        replace: true,
        templateUrl: 'Locking/lockStatus.tpl.html', 
        scope:{
            lockData: '='
        },
		controller: ['$scope', function($scope) {

			if ($scope.lockData){
				var current = new Date();
				var diff = current.getTime() - $scope.lockData.lockedSince;
				var inMinutes = diff / 1000 / 60;
				$scope.diffInMinutes = Math.floor(inMinutes);

				if ($scope.diffInMinutes < 1){
					$scope.diffInMinutes = 0;
				}
			}
		}]
	};
}])

;

