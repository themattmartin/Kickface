angular.module( 'firebaseConfig', [] )

.factory('FirebaseRootRef', [ function() {
	//return new Firebase();
}])

.factory('initialFirebaseChild', ['$rootScope', 'webStorage', function($rootScope, webStorage){

	var firebaseChildKey = 'omniboard.firebase.initialChild';
	
	$rootScope.$on("logout:success", function(evt, stateLocation) {
		webStorage.remove(firebaseChildKey);
	});
	
	return{
		firebaseChild: webStorage.get(firebaseChildKey) || '/',
		get: function(){
			return this.firebaseChild;
		},
		set: function(child){
			this.firebaseChild = child;
			webStorage.add(firebaseChildKey, child);
		}
	};
}]);