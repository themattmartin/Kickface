 /**
* Data Item Module for Omniboard
*/
angular.module("omniboard.DataModels.crud", [])


/**
* Firebase Reference Factory
*/
.factory('DataModelsRef', ['FirebaseRootRef','initialFirebaseChild', function(FirebaseRootRef,initialFirebaseChild) {
	return{
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("dataItems");
		}
	};
}])


/**
* CRUD Wrappers
*/

.factory('DataModels', ['$firebase', 'DataModelsRef', 'es', '$q', '$rootScope', '$filter', 'FirebaseRootRef', '$log', 'Settings', 'initialFirebaseChild', 'firebaseManager', '$builder','$http', function($firebase, DataModelsRef, es, $q, $rootScope, $filter, FirebaseRootRef, $log, Settings, initialFirebaseChild, firebaseManager, $builder, $http) {

	return {
		getModelRef: function(modelName) {
			return DataModelsRef.get().child('models').child(modelName);
		},

		getModelSubStatusRef: function(modelName) {
			return this.getModelRef(modelName).child("isSub");
		},

		getModelAngularFireRef: function(modelName){
			var ref = firebaseManager.buildRef(this.getModelItemsRef(modelName));
			return ref;
		},

		getCommandQueueRef: function () {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("commandQueue");
		},

		getSecurityGroupRef: function () {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("securityGroups");
		},

		getModelAngularFireChildRef: function(modelName, id){
			var ref = firebaseManager.buildRef(this.getModelItemsRef(modelName).child(id));
			return ref;
		},

		getModelSubStatus: function(modelName) {
			var ref = firebaseManager.buildRef(this.getModelSubStatusRef(modelName));
			return ref;
		},

		getModelNamesRef: function() {
			return DataModelsRef.get().child('modelNames');
		},

		getModelPluginsRef: function() {
			return DataModelsRef.get().child('plugins');
		},

		getModelPluginsListRef: function(pluginName) {
			return this.getModelPluginsRef().child(pluginName);
		},

		getModelPluginsList: function(pluginName) {
			var ref = firebaseManager.buildRef(this.getModelPluginsListRef(pluginName));
			return ref;
		},

		getModelTypesRef: function(modelName) {
			return this.getModelRef(modelName + "Type");
		},

		getModelTypes: function(model){
			var ref = firebaseManager.buildRef(this.getModelTypesRef(model).child('data'));
			return ref;
		},

		getPointTypes: function(){
			var ref = firebaseManager.buildRef(this.getModelTypesRef('Point').child('data'));
			return ref;
		},

		getDeviceTypes: function(){
			var ref = firebaseManager.buildRef(this.getModelTypesRef('Device').child('data'));
			return ref;
		},

		getModelItemsRef: function(modelName) {
			return this.getModelRef(modelName).child('data');
		},

		getModelFormRef: function(modelName) {
			return this.getModelRef(modelName).child('form');
		},

		getModelTrendablesRef: function(modelName) {
			return this.getModelRef(modelName).child('trendables');
		},

		listTrendables: function(modelName){
			var ref = firebaseManager.buildRef(this.getModelTrendablesRef(modelName));
			return ref;
		},

		getModelRelationsRef: function(modelName) {
			var ref = this.getModelRef(modelName).child('relations');
			return ref;
			/*

			return $firebase(ref).$asObject();
			*/
		},

		getModelItemRef: function(modelName, itemId) {
			var ref = this.getModelItemsRef(modelName);
			return this.getModelItemsRef(modelName).child(itemId);
		},

		getModelItemRefAngularFire: function(modelName, itemId) {
			return firebaseManager.buildRef(this.getModelItemsRef(modelName).child(itemId));
		},

		list: function() {
			var ref = firebaseManager.buildRef(DataModelsRef.child("models"));
			return ref;
		},

		createNew: function(name,isPrimary) {
			if(isPrimary){
				var obj = {children: {}};
				obj.children[name+'Note'] = true;
				obj.children[name+'Type'] = true;
				obj.children[name+'Status'] = true;
				this.getModelNamesRef().child(name).set(obj);
			} else {
				this.getModelNamesRef().child(name).set(true);
			}
		},

		getModelForm: function(modelName) {
			var ref = firebaseManager.buildRef(this.getModelFormRef(modelName));
			return ref;
		},

		getModelFormAsArray: function(modelName) {
			var deferred = $q.defer();
			var frmRef = this.getModelFormRef(modelName);
			frmRef.once('value', function(data){
				deferred.resolve(data.val());
			});
			return deferred.promise;
		},

		deleteItem: function(modelName, itemId) {
			var self = this;
			var user = $rootScope.loginService.getCurrentUser();
				if (user) {
					self.getModelItemRef(modelName, itemId).remove(function(err) {
						if (!err) {
							self.createAudit(modelName, null, itemId, user.uid, "Delete", "Deleted a " + modelName);
						}
					});
				} else {
					//TO-DO: Should we send back a broken promise or something?
					return null;
				}
		},

		names: function() {
			var ref = firebaseManager.buildRef(this.getModelNamesRef());
			return ref;
		},

		addItemNote : function(model, note){
			var itemNotesRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('/dataItems/models/' + model + 'Note/data');
			itemNotesRef.push(note);
		},

		getItemNotes : function(model, itemId){
			var deferred = $q.defer();

			var filter = {};
			filter[model] = itemId;
			this.fetchFilteredDate(model + 'Note', filter).then(function(notes) {
				deferred.resolve(notes);
			});

			return deferred.promise;
		},

		clearOverride: function(gatewayId, pointId) {
			if (!gatewayId || !pointId) { return; }
			var self = this;
			this.getCommandQueueRef().child(gatewayId).once('value',function(commandsSnap) {
				var commands = commandsSnap.val();
				angular.forEach(commands,function(data,id){
					if (data.pointId === pointId) {
						if(!data.resetValue){
							return;
						}
						data.value = data.resetValue;
						data.time = Firebase.ServerValue.TIMESTAMP;
						delete data.resetValue;
						delete data.resetAfter;
						self.getCommandQueueRef().child(gatewayId+'/'+id).set(data);
					}
				});
			});
		},

		doesModelExist: function(modelName) {
			var names = this.names().$asObject();
			var deferred = $q.defer();
			names.$loaded().then(
				function(data) {
					deferred.resolve(names[modelName]);
				}
			);
			return deferred.promise;
		},

		getRelationTypes: function() {
			return [
				{ name: "hasMany", label: "has many", pluralize:true },
				{ name: "hasOne", label: "has one", pluralize:false },
				{ name: "belongsTo", label: "belongs to one", pluralize:false },
				{ name: "manyMany", label: "belongs to many & has many", pluralize:true }
			];
		},

		getRelationType: function(relationTypeName) {
			var ret;
			this.getRelationTypes().forEach(function(value, key) {
				if (value.name == relationTypeName) {
					ret = value;
				}
			});
			return ret;
		},

		getOppositeRelationType: function(relationTypeName) {
			var opposites = {
				hasMany: "belongsTo",
				hasOne: "belongsTo",
				belongsTo: "hasMany",
				manyMany: "manyMany"
			};
			return this.getRelationType(opposites[relationTypeName]);
		},

		//getModel: function(name) {
		//	return this.list().$child(name);
		//},

		//getForm: function(name) {
		//	return this.list().$child(name).$child("form");
		//},

		getModelRelations: function(modelName) {
			var ref = firebaseManager.buildRef(this.getModelRelationsRef(modelName));
			return ref;
		},

		getModelParent: function(modelName) {
			var deferred = $q.defer();
			var parentModels = [];
			var relationsRef = this.getModelRelationsRef(modelName);
			relationsRef.on('value', function (dataSnap) {
				angular.forEach(dataSnap.val(), function (r, key) {
					if (r.relationType && r.relationType.name == 'belongsTo') {
						parentModels.push(r.name);
					}
				});
				deferred.resolve(parentModels);
			});
			return deferred.promise;
		},

		getAllModelNames: function() {
			return this.names();
		},

		getAllModelTypes: function(modelName){
			var typeModelName = modelName + "Type";
			return this.getItems(typeModelName);
		},

		removeRelationFormFields: function(model) {
			var newForm = [];
			angular.forEach(model.form, function(formItem) {
				if (formItem.component && formItem.component != "select") {
					newForm.push(formItem);
				}
			});
			model.form = newForm;
		},

		addRelationFormFields: function(model) {
			var self = this;
			var deferred = $q.defer();
			var relations = self.getModelRelations(model.name).$asArray();
			var startIndex = model.form.length;
			relations.$loaded().then(
				function(data) {

					angular.forEach(data, function(r) {
						if (r.relationType.name == "belongsTo") {
							var parentModelName = r.name;
							var field = {
								isRelation: true,
								id: parentModelName,
								index: startIndex,
								component: "select",
								description: "The " + parentModelName + " this " + model.name + " belongs to.",
								editable: false,
								label: parentModelName,
								options: [],
								placeholder: "Select a " + parentModelName,
								required: true,
								validation: "/.*/"
							};
							model.form.push(field);
							startIndex++;
						}
					});
					deferred.resolve();
				}
			);
			return deferred.promise;
		},

		setRelations: function(modelName, newRelations, isParent) {
			var self = this;
			var deferred = $q.defer();
			var user = $rootScope.loginService.getCurrentUser();
				if (user) {
					//var arrRelations = $filter('orderByPriority')(newRelations);
					//var arrRelations = newRelations.$asObject();
					//var arrRelations = newRelations.$asObject();
					var arrRelations = newRelations;
					var relations = self.getModelRelations(modelName);
					relations.$set(newRelations).then(function(e) {
						angular.forEach(arrRelations, function(relation,key) {
							var newRelation = {
								name: modelName,
								relationType: self.getOppositeRelationType(relation.relationType.name)
							};
							self.getModelRelationsRef(relation.name).child(modelName).set(newRelation);
						});
						self.createAudit(modelName, newRelations, null, user.uid, "Modify Model Relations", "Modified Model Relations: " + modelName);
						deferred.resolve();

					}, function(err) {
						deferred.reject(err);
					});
				} else {
					deferred.reject("Must be logged in to manage relationships.");
				}
			return deferred.promise;
		},

		saveModel: function(model) {
			var self = this;
			var d = $q.defer();
			var user = $rootScope.loginService.getCurrentUser();
				if (user) {
					// TO-DO: (MBM)
					// Why am I required to check for this undefined value?
					// I have no idea, right now. Need to fix later.
					angular.forEach(model.form, function(formItem) {
						if (typeof formItem.hasMoved === 'undefined') {
							delete formItem.hasMoved;
						}
					});

					self.removeRelationFormFields(model);
					self.addRelationFormFields(model).then(
						function() {
							self.getModelRef(model.name).update(model, function() {
								self.doesModelExist(model.name).then(
									function(exists) {
										if (!exists) {
											self.createAudit(model.name, model, null, user.uid, "Create Model", "Created New Model: " + model.name);
											self.getModelNamesRef().child(model.name).set(true);
										} else {
											self.createAudit(model.name, model, null, user.uid, "Update Model", "Updated Model: " + model.name);
										}
										self.updateTrendables(model.name);
										$rootScope.$broadcast('model:save', model);
										d.resolve(model);
									},
									function(err) {
										d.reject(err);
									}
								);
							});
						}
					);

				} else {
					$rootScope.$broadcast('model:save:failed', model + ": Must be logged in to save change or create a model schema.");
				}
			return d.promise;
		},

		updateTrendables: function(modelName) {
			var trendablesRef = this.getModelTrendablesRef(modelName);
			var form = this.getModelForm(modelName).$asObject();
			form.$loaded().then(
				function(loadedForm) {
					angular.forEach(loadedForm, function(formItem) {
						if (formItem.trendable) {
							trendablesRef.child(formItem.label).set(true);
						}
					});
				}
			);
		},

		addMappingItem: function(model, modelID, path, firebaseID){
			var obj = {};
			obj[firebaseID] = path;
			return firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('driverMapping').child( modelID )).$update(obj);
		},

		writeData: function(modelName, item, newUserid) {
			var itemList;
			if( newUserid ){
				var itemRef = this.getModelItemsRef(modelName).child(newUserid);
				itemList = firebaseManager.buildRef(itemRef);
				var password = item.Password;
				delete item.Password;

				var user = $rootScope.loginService.getCurrentUser();
				if (user){
					item.customerKey = user.customerKey;
				}

				return itemList.$update(item).then(
					function() {
						$http({
							method: 'POST',
							url: '/createPasswordHash',
							data: { pass: password },
							headers: {'Content-Type': 'application/json'}
						}).success(function(passHash, status, headers, config) {
							var newUser = {};
							newUser.uid = newUserid;
							newUser.password = passHash;
							newUser.Name = item.Firstname + ' ' + item.Lastname;
							newUser.customerKey = item.customerKey;
							newUser.userid = item.Username;
							FirebaseRootRef.child('users').push(newUser);
						});
						return itemRef;
					}
				);
			} else {
				itemList = firebaseManager.buildRef(this.getModelItemsRef(modelName)).$asArray();

				return itemList.$add(item);
			}
		},

		createItem: function(modelName, item) {
			var deferred = $q.defer();
			var self = this;
			var user = $rootScope.loginService.getCurrentUser();
				if (user) {

					var needLoggingPolicy = modelName == 'Point';
					item = self.addAuditFields(item, user.uid, needLoggingPolicy);

					var cleanupFailure = $rootScope.$on('create:'+modelName+':preSave:failure', function(event, data) {
						$rootScope.$broadcast('create:'+modelName+':failure', data);
						cleanupFailure();
						cleanupSuccess();
					});

					var cleanupSuccess = $rootScope.$on('create:'+modelName+':preSave:success', function(event, data, newUserid) {
						// we need to make sure the user has an initial view to see. always copy in the predefined /home view
						// and copy it to settings/dashboard/home under data
						if( modelName == 'User'){
							var ref = FirebaseRootRef.child(initialFirebaseChild.get()).child('/predefined/dashboards/home');
							ref.once('value', function(predefinedSnap){
								data.settings = {dashboard: {home: predefinedSnap.val() } };

								self.writeData(modelName, data, newUserid).then(function(ref) {
									self.createAudit(modelName, null, ref.key(), user.uid, "Create", "Created New " + modelName);
									$rootScope.$broadcast('create:'+modelName+':afterSave', ref.key());
									cleanupFailure();
									cleanupSuccess();
									return deferred.resolve(ref.key());
								});
								
							});
						} else {

							self.writeData(modelName, data, newUserid).then(function(ref) {
								self.createAudit(modelName, null, ref.key(), user.uid, "Create", "Created New " + modelName);
								$rootScope.$broadcast('create:'+modelName+':afterSave', ref.key());
								cleanupFailure();
								cleanupSuccess();
								return deferred.resolve(ref.key());
							});

						}
						
					});

					var eventItem = $rootScope.$broadcast('create:'+modelName+':preSave', item);

					if( eventItem.defaultPrevented ) {

					} else {

						self.writeData(modelName, item).then(function(ref) {

							self.createAudit(modelName, null, ref.key(), user.uid, "Create", "Created New " + modelName);

							$rootScope.$broadcast('create:'+modelName+':afterSave', ref.key());

							cleanupFailure();
							cleanupSuccess();



							return deferred.resolve(ref.key());
						});
					}

				} else {

					$rootScope.$broadcast('create:'+modelName+':failure', "Must be logged in to create a " + modelName);

				}


			return deferred.promise;
		},

		setModelStatus: function(modelName, type, itemId, status){
			// setModelStatus('Point','Status', '-JQPBZ129j5PdZ0krrfh', 'Queued')
			var self = this;
			var availableStatus = firebaseManager.buildRef(this.getModelRef(modelName + type).child("data")).$asObject();
			availableStatus.$loaded(function(dataSnap){
				var createNew = true;
				var keepGoing = true;
				angular.forEach(availableStatus, function(val,key){
					if(keepGoing === true){
						if( key.indexOf('$')!== 0){
							if( val.Name == status ){
								statusId = key;
								createNew = false;
								keepGoing = false;
							}
						}
					}

				});

				if( createNew ){
					var fullModelName = modelName + type;
					statusId = this.writeData(fullModelName, {Name: status});
					statusId.then(
						function(result){
							var updateObj = {};
							updateObj[modelName + type] = result.key();
							var ref = firebaseManager.buildRef(self.getModelItemRef(modelName, itemId));
							ref.$update(updateObj);
						},
						function(err){
							$log.error('Problem - Unable to save a new status');
						}
					);
				} else {
					var updateObj = {};
					updateObj[modelName + type] = statusId;
					var ref = firebaseManager.buildRef(self.getModelItemRef(modelName, itemId));
					ref.$update(updateObj);
				}
			});
		},

		addModelItemWithSchedule: function(modelName, id, scheduleId){
			var ref = this.getModelRef(modelName).child('data').child(id).child('inSchedule');
			ref.set(scheduleId);
		},
		removeModelItemWithSchedule: function(modelName, id){
			var ref = this.getModelRef(modelName).child('data').child(id).child('inSchedule');
			ref.remove();
		},
		/**
		 * @item: should be a angularFire $firebase object
		 */
		updateItem: function(modelName, item) {
			var self = this;
			var user = $rootScope.loginService.getCurrentUser();
				if (user) {

					item = self.addAuditFields(item, user.uid);

					var cleanupFailure = $rootScope.$on('update:'+modelName+':preSave:failure', function(event, data) {
						$rootScope.$broadcast('update:'+modelName+':failure', data);
						cleanupFailure();
						cleanupSuccess();
					});

					var cleanupSuccess = $rootScope.$on('update:'+modelName+':preSave:success', function(event, data) {
						item.$update(data).then(
							function() {
								self.createAudit(modelName, item, item.$id, user.uid, "Update", "Updated " + modelName);
								$rootScope.$broadcast('update:'+modelName+':afterSave', item.$id);
								cleanupFailure();
								cleanupSuccess();
							},
							function(err) {
								$rootScope.$broadcast('update:'+modelName+':failure', err);
								cleanupFailure();
								cleanupSuccess();
							}
						);
					});

					var eventItem = $rootScope.$broadcast('update:'+modelName+':preSave', item);

					if( eventItem.defaultPrevented ) {
						//empty
					} else {
						var dataChange = {};
						angular.forEach(item,function(value,key) {
							if (!key.match(/^_/)) { dataChange[key] = value; }
						});
						item.$save(dataChange).then(
							function(data) {
								self.createAudit(modelName, item, item.$id, user.uid, "Update", "Updated " + modelName);
								$rootScope.$broadcast('update:'+modelName+':afterSave', item.$id);
								cleanupFailure();
								cleanupSuccess();
							},
							function(err) {
								$rootScope.$broadcast('update:'+modelName+':failure', err);
								cleanupFailure();
								cleanupSuccess();
							}
						);
					}

				} else {
					$rootScope.$broadcast('update:'+modelName+':failure', "Must be logged in to update a " + modelName);

				}
		},

		getName: function(modelName, itemId) {
			var self = this;
			var item = firebaseManager.buildRef(self.getModelItemRef(modelName, itemId)).$asObject();
			return item.Name;
		},

		getNameDirectly: function(modelName, itemId) {
			var self = this;
			var item = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems').child('models').child(modelName).child('data').child(itemId);
			item.once('value',function(dataSnap){
				return dataSnap.val().Name;
			});
			//$firebase(self.getModelItemRef(modelName, itemId));
			//return item.Name;
		},
		getFirstAndLast: function(modelName, itemId) {
			var deferred = $q.defer();
			if( typeof itemId != 'undefined' && itemId !== ''){		
				var self = this;
				var item = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems').child('models').child(modelName).child('data').child(itemId);
				item.once('value',function(dataSnap){
					deferred.resolve( dataSnap.val() );
				});
			} else {
				deferred.resolve();
			}
			return deferred.promise;
		},
		getNameAttr: function(modelName, itemId){
			var deferred = $q.defer();
			var self = this;
			var item = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems').child('models').child(modelName).child('data').child(itemId);
			item.once('value',function(dataSnap){
				deferred.resolve( dataSnap.val().Name );
			});
			return deferred.promise;
		},

		getItem: function(modelName, itemId, maxDepth, currentDepth) {
			if (!maxDepth) {
				maxDepth = 3;
			}

			if (currentDepth === null || typeof currentDepth == 'undefined') {
				currentDepth = 0;
			}

			var deferred = $q.defer();
			var item = {};
			var self = this;
			if (currentDepth <= maxDepth) {

				item = firebaseManager.buildRef(self.getModelItemRef(modelName, itemId)).$asObject();
				item.$loaded().then(
					function(loadedItem) {

						//var loadedItem = event.snapshot.value;

						var relations = self.getModelRelations(modelName).$asArray();
						relations.$loaded().then(
							function(loadedRelations) {

								var promises = [];
								//var relationsArray = $filter('orderByPriority')(loadedRelations);

								//var relationsArray = loadedRelations.$asArray();
								var relationsArray = loadedRelations;

								relationsArray.forEach(function(relation, index) {
									//var relation = snap.val();
									if (relation.relationType.name == "belongsTo" && loadedItem) {
										if (loadedItem.hasOwnProperty(relation.name)) {
											var relatedModelId = loadedItem[relation.name];
											item['$' + relation.name] = self.getItem(relation.name, relatedModelId, maxDepth, currentDepth + 1);
											promises.push(item['$' + relation.name].$relationsPromise);
										}
									}
								});
								$q.all(promises).then(
									function(val) {
										//item.$off("loaded");
										deferred.resolve(val);
									},
									function(err) {
										//item.$off("loaded");
										deferred.reject(err);
									}
								);
							}
						);
					}
				);

			} else {
				deferred.resolve({});
			}

			item.$relationsPromise = deferred.promise;
			return item;
		},

		getItems: function(modelName) {
			var ref = firebaseManager.buildRef(this.getModelItemsRef(modelName));
			return ref;
		},

		//removeRelation: function(modelName, relationName) {
		//	$firebase(this.getModelRelationsRef(modelName))
		//	return this.list().$child(modelName).$child("relations").$remove(relationName);
		//},

		getItemsPickList: function (modelName, labelProperty) {
			var deferred = $q.defer();

			var queryParams = {
				index: es.getIndexName(),
				type: modelName,
				fields: labelProperty,
				body: {
					size: 500,
					sort: ['Name.raw'],
					query: { filtered: { filter: { match_all: {} } } }
				}
			};

			es.get().search(queryParams).then(
				function (resp) {
					var ret = [];
					resp.hits.hits.forEach(function (hit, index) {
						var label = null;
						if (hit.hasOwnProperty('fields') && hit.fields.hasOwnProperty(labelProperty)) {
							label = hit.fields[labelProperty][0];
						}
						ret.push({
							id: hit._id,
							label: label
						});
					});
					deferred.resolve(ret);
				},
				function (err) {
					deferred.reject(err);
				}
			);

			return deferred.promise;
		},
		searchItems: function (modelName, query) {
			var deferred = $q.defer();
			var queryParams = {
				index: es.getIndexName(),
				type: modelName,
				body: {
					size: 5000,
					sort: ['Name.raw'],
					query: { filtered: {  query: { match_phrase_prefix : { } } } }
				}
			};
			Object.getOwnPropertyNames(query).forEach(function (property, index) {

				var o = { prefix: {} };
				o.prefix[property] = [query[property].toString().toLowerCase()];
				if (!queryParams.body.query.filtered.filter) {
					queryParams.body.query.filtered.filter = { bool: { must: [] }};
				}
				queryParams.body.query.filtered.filter.bool.must.push(o);

				queryParams.body.query.filtered.query.match_phrase_prefix[property] = query[property].toString();
			});
			if (Object.keys(query).length === 0) {
				delete queryParams.body.query;
				queryParams.body.query = { filtered: {  filter: { match_all : { } } } };
				//queryParams.body.query.filtered.filter.match_all = {};
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
		searchItemsUpdated: function (modelName, query) {
			var deferred = $q.defer();
			var must = [];
			angular.forEach(query, function (value, key) {
				var match = { 'term': {} };
				match.term[key] = value;
				must.push(match);
			});
			var searchObj;
			if (typeof query != 'undefined') {
				searchObj = {
					index: es.getIndexName(),
					type: modelName,
					explain: false,
					lowercaseExpandedTerms: false,
					body: {
						sort: ['Name.raw'],
						size: 500,
						query: { filtered: { filter: { bool: { must: must } } } }
					}
				};
			} else {
				searchObj = {
					index: es.getIndexName(),
					type: modelName,
					explain: false,
					lowercaseExpandedTerms: false,
					body: {
						size: 500,
						sort: ['Name.raw'],
						query: { filtered: { filter: { match_all: {} } } }
					}
				};
			}
			es.get().search(searchObj).then(function (resp) {
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

		fetchFilteredDate: function(modelName,query,expressionKey){

			var deferred = $q.defer();
			var mustFilter;
			if( typeof expressionKey != 'undefined' ){
				mustFilter = [
					{ exists: { field: expressionKey } },
					{ term : query }
				];
			} else if( Object.keys(query).length > 0) {
				mustFilter = [];
				angular.forEach(query,function(value,column) {
					var singleTerm = {};
					singleTerm[column] = value;
					if (Array.isArray(value)) {
						mustFilter.push({ terms: singleTerm });
					} else {
						mustFilter.push({ term: singleTerm });
					}
				});
			} else {
				mustFilter = [
					{ match_all: {} }
				];
			}

			var searchObj = {
				index: es.getIndexName(),
				type:  modelName,
				explain: false,
				lowercaseExpandedTerms: false,
				body: {
					size: 500000,
					sort: [ "Name.raw" ],
					query: {
						filtered: {
							filter: {
								bool: {
									must: mustFilter
								}
							}
						}
					}
				}
			};

			es.get().search(searchObj).then(function (resp) {
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

		fetchRegexFilteredData: function(modelName,query){

			if (Object.keys(query).length > 0) {
				angular.forEach(query,function(value,column) {
					query[column] = '.*' + value + '.*';
				});
			} else {
				query = { Name: '.*' };
			}

			var deferred = $q.defer();

			var searchObj = {
				index: es.getIndexName(),
				type:  modelName,
				explain: false,
				lowercaseExpandedTerms: false,
				body: {
					size: 500000,
					sort: [ "Name.raw" ],
					query: {
						filtered: {
							filter: {
								regexp: query
							}
						}
					}
				}
			};

			es.get().search(searchObj).then(function (resp) {
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

		searchAlarmsByValue: function(model,value,expressionKey, group){
			var deferred = $q.defer();
			var mustFilter;
			if( typeof expressionKey != 'undefined' ){
				var aggObj = {};
				aggObj[expressionKey] = value;
				if(group){
					aggObj.Region = group;
				}
				mustFilter = [
					{ exists: { field: expressionKey } },
					{ term : aggObj }
				];

			} else {
				mustFilter = [
					{ match_all: {} }
				];
			}
			var searchObj = {
				index: es.getIndexName(),
				type:  'Site',
				explain: false,
				lowercaseExpandedTerms: false,
				body: {
					size: 500000,
					sort: [ "Name.raw" ],
					query: {
						filtered: {
							filter: {
								bool: {
									must: mustFilter
								}
							}
						}
					}
				}
			};
			es.get().search(searchObj).then(
				function(resp) {
					var searchResults = [];
					resp.hits.hits.forEach(function (hit, index) {
						var result = hit._source;
						result._id = hit._id;
						searchResults.push(result);
					});
					deferred.resolve(searchResults);
				},
				function(err) {
					deferred.resolve([]);
				}
			);
			return deferred.promise;
		},

		createAudit: function(modelName, item, itemId, uid, type, name) {
			var deferred = $q.defer();

			var self = this;
			var allSettings = Settings.getAllSettings().$asObject();
			allSettings.$loaded().then(
				function(data){

					//Lookup type of audit log and get the status
					var auditTypesRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('/dataItems/models/AuditLogType/data');
					auditTypesRef.once('value', function(dataSnap){

						var unknown;
						var found = false;
						var typeID;
						angular.forEach(dataSnap.val(), function(val,id){

							if( val.Name === type ){
								found = true;
								typeID = id;
							}
							if( val.Name === 'Unknown'){
								unknown = id;
							}
						});

						if( !found ){
							typeID = unknown;
						}


						var edit = data["AuditLogs"]["Log Item Edits"];
						var inserts = data["AuditLogs"]["Log Item Inserts"];
						var logModelChanges = data["AuditLogs"]["Log Model Changes"];

						var doAudit = false;
						if( type == 'Create' || type == 'Update'){
							if( edit.value ){
								doAudit = true;
							}
						} else if ( type == 'Delete' || type == 'Insert' ){
							if( inserts.value ){
								doAudit = true;
							}
						} else if ( type == 'Modify Model Relations' || type == 'Create Model' || type == 'Update Model' ){
							if( logModelChanges.value ){
								doAudit = true;
							}
						}

						if( doAudit ){

							if (!(modelName == "AuditLog" && type == "Create")) {

								self.createItem("AuditLog",
									self.addAuditFields({
										modelName: modelName,
										Name: name,
										AuditLogType: typeID,
										AuditLogStatus: '-JY0h6hi79OWZqv7hIw_',
										itemId: itemId,
										item: item
									}, uid)
								);

								deferred.resolve();
							}
						}

					});

				}
			);
			return deferred.promise;
		},

		addAuditFields: function(item, uid, needLoggingPolicy) {
			item.User = uid;
			item.lastModified = Firebase.ServerValue.TIMESTAMP;
			if (needLoggingPolicy) {
				item.LoggingPolicy = "-JQnpdrHOMl8hnYOUeF-";
			}
			return item;
		},

		getModelNameForm: function(){
			var defaultNameField = $builder.components.textInput;
			var newField = {};
			newField.id = 'Name';
			newField.index = 0;
			newField.editable = true;
			newField.hasMoved = false;
			newField.description = 'Required Name field';
			newField.label = 'Name';
			newField.name = 'Name';
			newField.component = 'textInput';
			newField.placeholder = defaultNameField.placeholder;
			newField.required = defaultNameField.required;
			newField.trendable = defaultNameField.trendable;
			newField.hasMoved = defaultNameField.hasMoved;
			newField.options = defaultNameField.options;
			newField.validation = defaultNameField.validation;
			return newField;
		}

	};

}])

;