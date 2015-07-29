angular.module( 'omniboard.Users.crud', [])

.factory('UserRef', ['FirebaseRootRef','initialFirebaseChild', function(FirebaseRootRef,initialFirebaseChild) {
	return{
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems').child('models').child("User").child("data");
		}
	};
	
}])

.factory('UserItem', ['$firebase', 'UserRef', 'es', '$q', '$rootScope', function($firebase, UserRef, es, $q, $rootScope) {
	return {
		user: function(){
			return UserRef.get();
		},
		create: function(name, key, data){
			return $firebase(this.user().child(name).child(key)).$update(data);
		},
		read: function(name){
			return $firebase(this.user().child(name));
		},
		update: function(name, data){
			var ref = this.user().child(name);
			return $firebase(this.user().child(name)).$update(data);
		},
		delete: function(name, key){
			var ref = this.user().child(name).child(key);
			//$firebase(ref).$asObject().$destroy();
		},
		searchItems: function (modelName, query) {
			var deferred = $q.defer();

			var queryParams = {
				index: es.getIndexName(),
				type: dataItemName,
				body: {
					size: 500,
					sort: ['Name.raw'],
					query: { filtered: { filter: { bool: { must: [] } } } }
				}
			};

			Object.getOwnPropertyNames(query).forEach(function (property, index) {
				var o = { prefix: {} };
				o.prefix[property] = [query[property].toString().toLowerCase()];
				queryParams.body.query.filtered.filter.bool.must.push(o);
			});

			if (queryParams.body.query.filtered.filter.bool.must.length === 0) {
				delete queryParams.body.query.filtered.filter.bool;
				queryParams.body.query.filtered.filter.match_all = {};
			}

			es.get().search(queryParams).then(function (resp) {
				if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
					var searchResults = [];
					resp.hits.hits.forEach(function (hit, index) {
						var result = hit._source;
						result._id = hit._id;
						searchResults.push(result);
					});
					deferred.resolve(searchResults);
				} else {
					deferred.resolve([]);
				}
			}, function (err) {
				deferred.reject(err);
			});
			
			return deferred.promise;
		},

		searchOnline: function(dataItemName, query) {
			var deferred = $q.defer();

			es.get().search(query)
				.then(
					function(resp) {
						if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
							var searchResults = [];
							resp.hits.hits.forEach(function(hit, index) {
								var result = hit._source;
								result._id = hit._id;
								searchResults.push(result);
							});
							
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