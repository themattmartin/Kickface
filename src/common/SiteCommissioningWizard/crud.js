angular.module('omniboard.SCW.crud', [])
/*
.factory('ExpressionsRef', ['FirebaseRootRef', function(FirebaseRootRef) {
	return FirebaseRootRef.child("expressions");
}])
*/
/**
* CRUD Wrappers
*/

.factory('Verify', ['$firebase', '$q', 'FirebaseRootRef', 'Settings', 'es', 'initialFirebaseChild', function($firebase, $q, FirebaseRootRef, Settings, es, initialFirebaseChild) {
	return {
		getPendingStatusByName: function(model,name){
			var self = this;
			var deferred = $q.defer();
			var items = $firebase(FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models').child(model+'Status/data')).$asObject();
			items.$loaded().then(
				function(dataSnap){
					console.log('dataSnap ', dataSnap );
					angular.forEach(dataSnap, function(val,key){
						if( val.Name == name){
							deferred.resolve(self.getPendingModels(model, key));
						}
					});
					deferred.resolve();
				}
			);			
			return deferred.promise;
		},
		getStatusByName: function(model,name){
			var self = this;
			var deferred = $q.defer();
			var items = $firebase(FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models').child(model+'Status/data')).$asObject();
			items.$loaded().then(
				function(dataSnap){
					angular.forEach(dataSnap, function(val,key){
						if( val.Name == name){
							deferred.resolve({'key': key, 'data': val});
						}
					});
				}
			);			
			return deferred.promise;
		},

		getPendingModels: function(model, pendingStatusID) {
			var deferred = $q.defer();

			var matchObj = { term: {} };
			matchObj.term[model+"Status"] = pendingStatusID;

			var searchObj = {
				index: es.getIndexName(),
				type:  model,
				explain: false,
				lowercaseExpandedTerms: false,
				body: {
					size: 500,
					sort: [ "Name.raw" ],					
					query: { filtered: { filter: { bool: { must: matchObj } } } }
				}
			};

			es.get().search(searchObj)
				.then(
					function(resp) {
						if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
							var searchResults = [];
							resp.hits.hits.forEach(function(hit, index) {
								var result = hit._source;
								result._id = hit._id;
								searchResults.push(result);
							});

							// we need to return an array of firebase objects so that we are able to manipulate the data directly

							deferred.resolve(searchResults);
						} else {
							deferred.resolve([]);
						}
					},
					function(err) {
						deferred.reject(err);
					}
				)
			;
			return deferred.promise;


		}

	};
}])
;