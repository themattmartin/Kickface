angular.module("omniboard.settings.crud", [])

/**
* Firebase Reference Factory
*/
.factory('SettingsRef', ['FirebaseRootRef', 'initialFirebaseChild', function(FirebaseRootRef, initialFirebaseChild) {
	return{
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("settings");
		}
	};
}])

.factory('Settings', ['$firebase', 'SettingsRef', 'firebaseManager', '$q', function($firebase, SettingsRef, firebaseManager, $q) {
	return {
		getSettingRef: function(group, name) {
			return SettingsRef.get().child(group).child(name);
		},
		getSetting: function(group, name) {
			var defer = $q.defer();
			var ref = this.getSettingRef(group, name);
			ref.once('value', function(dataSnap){
				defer.resolve(dataSnap.val());
			});		
			return defer.promise;
		},
		getAllSettings: function() {
			var ref = firebaseManager.buildRef( SettingsRef.get() );
			return ref;
		},
		saveSettings: function(settings) {
			return settings.$save();
		},
		saveSettingItem: function(settingName,object){
			var ref = SettingsRef.get().child(settingName);
			console.log("settingRef ", ref.toString() );
			ref.set(object);
		}
	};
}])

;
