angular.module("omniboard.search", [])

.constant('esIndexName', 'omniboard')

.factory('es', ['esFactory', '$rootScope', 'webStorage', function(esFactory, $rootScope, webStorage) {
	var hostKey = 'omniboard.es.host';
	var indexNameKey = 'omniboard.es.indexName';
	
	$rootScope.$on("logout:success", function(evt, stateLocation) {
		webStorage.remove(hostKey);
		webStorage.remove(indexNameKey);
	});
	
	return {
		host: webStorage.get(hostKey) || null,
		indexName: webStorage.get(indexNameKey) || null,
		getIndexName: function(){
			return this.indexName;
		},
		setIndexName: function(name){
			this.indexName = name;
			webStorage.add(indexNameKey, name);
		},
		get: function(){
			return esFactory({
				host: this.host
			});
		},
		set: function(host){
			this.host = host;
			webStorage.add(hostKey, host);
		}
	};
}])
;