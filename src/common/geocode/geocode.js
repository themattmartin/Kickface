angular.module( 'Geocode', [] )

.factory('Geocode', ['$http', '$q', function($http, $q) {
	return {  
		fetch: function(address) {
			var deferred = $q.defer();
			var geocoder = new google.maps.Geocoder();
			geocoder.geocode({address: address}, function(result, status) {
				if (status === google.maps.GeocoderStatus.OK) {
					var latLng = {
						latitude: result[0].geometry.location.lat(),
						longitude: result[0].geometry.location.lng()
					};
					deferred.resolve(latLng);
				} else {
					deferred.reject("Google Maps API Return Code: " + status);
				}
			});			
			return deferred.promise;
		}
	};
}])

;