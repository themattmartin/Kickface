angular.module('omniboard.Expressions.crud', [])

.factory('ExpressionsRef', ['FirebaseRootRef','initialFirebaseChild', function(FirebaseRootRef,initialFirebaseChild) {
	return {
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("expressions");
		}
	};
}])

/**
* CRUD Wrappers
*/
.factory('Expressions', ['$firebase', 'ExpressionsRef', '$q', 'FirebaseRootRef', 'Settings', '$timeout', 'firebaseManager', 'initialFirebaseChild', function($firebase, ExpressionsRef, $q, FirebaseRootRef, Settings, $timeout, firebaseManager, initialFirebaseChild) {
	return {
		getExpressionTypeRef: function(type) {
			return ExpressionsRef.get().child("type").child(type);
		},

		getNoficationProfile: function(type,category){
			return ExpressionsRef.get().child("type").child(type).child('categories').child(category).child('notificationProfiles');
		},

		updateKey: function(){

			var updateVal = function(){
				$timeout(function() {
					var ptRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models/Point/data/-JUt_f-uAOSSYzO9r0rD/');
					ptRef.once('value', function(data){
						var newVal = data.val().Value+1;
						ptRef.update( {'Value': newVal } );
					});
				}, 4000);
			};

			var ref = FirebaseRootRef.child(initialFirebaseChild.get()).child('/dataItems/models/Device/data/-JUt_eY_z1UQtDwa5qRr/expressions/values/alarm/HVAC/Lennox%20Error/notified');
			var cb = function(error){
				if( error){
					//console.log('problem');
				} else {
					updateVal();
				}
			};
			ref.remove(cb);
			
		},

		getExpressionTypeCategoriesRef: function(type) {
			return this.getExpressionTypeRef(type).child("categories");
		},

		getNextExpressionNumber: function() {
			var deferred = $q.defer();
			var ref = ExpressionsRef.get().child("nextNumber");

			ref.transaction(function(nextNumber) {
				if (!nextNumber) { nextNumber = 1000; }
				return nextNumber+1;
			}, function(error, committed, snapshot) {
				if (error) {
					deferred.reject('Transaction failed abnormally!');
				} else if (!committed) {
					deferred.reject('We aborted the transaction');
				} else {
					deferred.resolve(snapshot.val());
				}
			});			

			return deferred.promise;
		},

		getExpressionTypeCategories: function(type) {
			return firebaseManager.buildRef(this.getExpressionTypeCategoriesRef(type));
		},

		getExpressionRef: function(name) {
			return ExpressionsRef.get().child("data").child(name);
		},

		getExpression: function(name) {
			return firebaseManager.buildRef(this.getExpressionRef(name));
		},

		getExpressionNameRef: function(name) {
			return this.getExpressionNamesRef().child(name);
		},

		getExpressionName: function(name) {
			return firebaseManager.buildRef(this.getExpressionNameRef(name));
		},

		getExpressionNamesRef: function() {
			return ExpressionsRef.get().child("names");
		},

		getExpressionNames: function() {
			return firebaseManager.buildRef(this.getExpressionNamesRef());
		},

		getPredefinedExpressions: function(){
			return firebaseManager.buildRef(FirebaseRootRef.child('predefined/expressions'));
		},

		savePredefinedExpressions: function(name,value){
			var ref = firebaseManager.buildRef(FirebaseRootRef.child('predefined/expressions').child(name));
			ref.$update({'function': value});
		},

		saveExpression: function(name, type, category, query, fn, operands, edit, email, sms) {
			var self = this;
			var deferred = $q.defer();

			var expression = {
				type: type ? type : null,
				category: category ? category : null,
				query: query ? query : null,
				fn: fn ? fn : null,
				operands: operands ? operands : {}
			};

			var modelExists = self.getExpressionName(name).$asObject();
			modelExists.$loaded().then( 
				function(data) {
					if (modelExists.$value && !edit) {
						deferred.reject("An expression with that name already exists.");
					} else {
						self.getNextExpressionNumber().then(
							function(expressionNumber) {

								Settings.getSetting("General", "Customer Code").then(
									function(customerCode) {

										if (!expression.Number) {
											expression.Number = customerCode.value + "-" + expressionNumber;
										}
										
										if (!expression.category) {
											delete expression.category;
										}

										self.getExpressionRef(name).update(expression, function(err) {
											if (!err) {
												self.getExpressionNameRef(name).set(true, function(err) {
													if (!err) {
														deferred.resolve();
													} else {
														deferred.reject();
													}
												});
											} else {
												deferred.reject();
											}
										});
									}
								);
								
							}, function(err) {
								deferred.reject(err);
							}
						);
					}
				}
			);

			return deferred.promise;
		}

	};
}])
;