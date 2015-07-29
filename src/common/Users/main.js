angular.module( 'omniboard.Users', ['omniboard.Users.crud'])

.run(['$rootScope', 'FirebaseRootRef', 'UserItem', 'Locks', 'DataModels', 'initialFirebaseChild', function($rootScope, FirebaseRootRef, UserItem, Locks, DataModels, initialFirebaseChild) {

	$rootScope.$on("create:User:preSave", function(event, user) {
		//whenever a event is broadcast create the user
		event.preventDefault();

		FirebaseRootRef.child(initialFirebaseChild.get()).createUser({
			email: user.Username,
			password: user.Password
		}, function(err, uidRef) {
			if (!err) {
				//delete user.Password;
				user.showMapInstructions = true;
				$rootScope.$broadcast('create:User:preSave:success', user, uidRef.uid);
			} else {
				var cleanMessage = err.message.split(':');
				$rootScope.$broadcast('create:User:preSave:failure', cleanMessage[2]);
			}
		});
	});

	audit = function( userIndex, userObj, evtDisplayName, evtType ){
		// write to the 
		var auditLog = FirebaseRootRef.child(initialFirebaseChild.get()).child('/auditLog/id');
		//var auditLog = new Firebase('https://ccbac-test.firebaseIO.com/auditLog/id');
		var currentDT = new Date();
		var Month = ['January','February','March','April','May','June','July','August','September','October','November','December'];
		var timeFormat =  currentDT.toTimeString();
		var t = timeFormat.split(' ');

		var auditObj = {
			date: Month[currentDT.getMonth()] + ' ' + currentDT.getDate() + ', ' + (currentDT.getYear()+1900),
			device: '',
			display: userObj.firstname + ' ' + userObj.lastname + ' ' + evtDisplayName,
			time:  t[0] + ' ' + t[2].substr(1,3),
			timestamp: Firebase.ServerValue.TIMESTAMP,
			type: evtType,
			user: userIndex,
			userFullName: userObj.firstname + ' ' + userObj.lastname
		};
		auditLog.push( auditObj );
	};
	
	var cleanupLoginSuccess = $rootScope.$on("login:success", function(event, user) {
		if( user.uid !== ''){
			var userProf = UserItem.read(user.uid).$asObject();
			userProf.$loaded().then(
				function(profile){
					UserItem.update(user.uid, {lastOnline: Firebase.ServerValue.TIMESTAMP,online:true});

					//check the password Age
					if( typeof profile.passwordAge != 'undefined'){
						// TEST THE PASSWORD AGE ON THIS USER IF IT IS TOO OLD HAVE THEM RESET THEIR PASSWORD
						var currentDate = new Date();
						var passAge = new Date(dataSnapshot.val().passwordAge);
						if( addToDate.days(passAge, $rootScope.passwordPolicy.ageInDays).getTime() <= currentDate.getTime() ){
							//$location.path('/admin/users/'+user.uid+'/editPassword');
						}
					} else {
						if( typeof profile.homeView != 'undefined' ){
							$rootScope.$broadcast("login:complete:success", dataSnapshot.val().homeView, user.uid, profile);
						} else {
							$rootScope.$broadcast("login:complete:success", 'auth.dashboard.ready', user.uid, profile);
						}
					}

					//cleanupLoginSuccess();
				}
			);

		}

	});

	var cleanUpLogoutRequest = $rootScope.$on("logout:request", function(evt, user) {
		if( typeof user != 'undefined' ){
			UserItem.update(user, {lastOnline: Firebase.ServerValue.TIMESTAMP,online:false});
			DataModels.createAudit('Logout', user, 'Logout Event', user.uid, 'Update', 'Logout Success');
			var logoutRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('online').child(user);
			logoutRef.remove();
			Locks.releaseAllUserLocks(user);
			//remove the connections item so they do not have any connections hanging out on the firebase server
			UserItem.delete(user, 'connections');
		}
		FirebaseRootRef.unauth();
		$rootScope.$broadcast('logout:success', 'noauth.login');	
	});

}])
;