angular.module( 'omniboard.Files.crud', [])


.factory('FileItem', ['$firebase', '$sce', '$rootScope', function($firebase, $sce, $rootScope) {
	// this will be needed for the viewing of the items stored in amazon web services.
	return {
		getURL: function(name){

		},
		trustSrc: function(src) {
		// this is needed to add the AWS URL to the trusted Resource URL within angular
			
			return $sce.trustAsResourceUrl(src);
		}
	};
}])

;