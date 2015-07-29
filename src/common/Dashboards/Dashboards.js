angular.module("omniboard.dashboards", [])

.factory('DashboardRef', ['FirebaseRootRef','initialFirebaseChild', function(FirebaseRootRef,initialFirebaseChild) {
	return {
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("predefined/dashboards");
		}
	};
}])

.factory('Dashboards', ['$firebase', 'DashboardRef', '$filter', 'UserRef', 'es', '$q', '$rootScope', 'FirebaseRootRef', 'DataModels', 'Perms', 'firebaseManager' , 'initialFirebaseChild', 'pageLevelData', function($firebase, DashboardRef, $filter, UserRef, es, $q, $rootScope, FirebaseRootRef, DataModels, Perms, firebaseManager, initialFirebaseChild, pageLevelData) {

	return {
		modelName: null,
		scopeID: null,
		boardName: null,
		scopedData: [],
		list: function() {
			var ref = firebaseManager.buildRef(DashboardRef.get()).$asObject();
			return ref;
		},
		orderedList: function() {
			//return $filter('orderByPriority')(this.list);
			return this.list.$asArray();
		},
		pushConfig: function(name,model,uid,queries){
			var data = Perms.permCheck('Admin', uid);
			data.then(function(isAllowed){
				if(isAllowed){
					var userData = firebaseManager.buildRef(UserRef);
					var jsonData = JSON.stringify(model);
					angular.forEach(userData, function(value,key){
						if( key.indexOf(':') > -1){
							var ref = firebaseManager.buildRef(UserRef.child(key).child('settings').child('dashboard').child(name));
							ref.$update({model: jsonData, queries: queries, active: true, menuLabel: model.title });
						}
					});
				}
			});
		},

		/**
		 * Gets the Firebase Ref for a dashboard that 
		 * has been personalized for a specific user.
		 */

		getUserViewRef: function(viewName, uid) {
			var ref = UserRef.get().child(uid).child('settings/dashboard').child(viewName);
			return firebaseManager.buildRef(ref);
		},

		/**
		 * Gets the Firebase ref for a predefined
		 * dashboard
		 */
		getPredefinedViewRef: function(viewName) {
			return firebaseManager.buildRef(DashboardRef.get().child(viewName));
		},

		userSettings: function(name, uid) {
			var self = this;
			var fbRef = UserRef.get().child(uid).child('settings/dashboard').child(name);
			var dashboardSettings = firebaseManager.buildRef(UserRef.get().child(uid).child('settings/dashboard').child(name)).$asObject();
			dashboardSettings.$loaded().then(
				function(dashboardSettings) {			
					if (!dashboardSettings.model) {
						var globalSettings = self.globalSettings(name);
						globalSettings.$loaded().then(
							function() {
								if(typeof globalSettings.model != 'undefined'){
									dashboardSettings.model = globalSettings.model;
									dashboardSettings.$save();
									//.$child("model").$set(globalSettings.$child("model"));
								}
							}
						);
					}
				}
			);
			return dashboardSettings;
		},
		globalSettings: function(name) {
			
			var ref = firebaseManager.buildRef( DashboardRef.get().child(name));
			
			return ref.$asObject();
		},
		saveUserSettings: function(name, model, uid, active, label, queries) {
			var self = this;
			var globalSettings = self.globalSettings(name);
			globalSettings.$loaded().then(
				function(globalSettings) {	
					if (!globalSettings.model) {
						self.saveGlobalSettings(name, model,queries,active,label);
					}
					globalSettings.$destroy("loaded");
				}
			);
		},
		saveGlobalSettings: function(name, model,queries,active,label) {
			var dashboardSettings = this.globalSettings(name);
			dashboardSettings.model = JSON.stringify(model);
		},
		cleanUpQuery: function(key){
			var self = this;
			var user = $rootScope.loginService.getCurrentUser();
			if (user) { 
				var references = UserRef.get().child(user.uid).child('settings/dashboard').child(self.boardName).child('queries').child(key);
				references.remove();
			}

		},
		createPersonalDashboard: function(name){
			var deferred = $q.defer();
			var initModel = {rows:[{columns:[{styleClass:'col-md-12',widgets:[]}]},{columns:[{styleClass:'col-md-2',widgets:[]},{styleClass:'col-md-2',widgets:[]},{styleClass:'col-md-2',widgets:[]},{styleClass:'col-md-2',widgets:[]},{styleClass:'col-md-2',widgets:[]},{styleClass:'col-md-2',widgets:[]}]},{columns:[{styleClass:'col-md-4',widgets:[]},{styleClass:'col-md-8',widgets:[]}]},{columns:[{styleClass:'col-md-2',widgets:[]},{styleClass:'col-md-10',widgets:[]}]}],structure:'40%/60% 2 Column Layout',title:name,hasMap:false,styleName:'Subtle Grayscale',customDashboard:true,mapPinModel:'Site',groupPinModel:'Region',navModel:null,navModelType:"-JUPkEVnFmN3XzZdeVzD"};
			var newDashboardName = name;

			var user = $rootScope.loginService.getCurrentUser();
			if (user) { 
				var newDashRef = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models/User/data').child(user.uid).child('settings/dashboard').child(newDashboardName)).$asObject();
				
				var newDashData = {'active':true,'menuLabel':name,'model':JSON.stringify(initModel)};
				//var newDashKey = name;
				newDashRef.active=true;
				newDashRef.menuLabel=name;
				newDashRef.model=JSON.stringify(initModel);
				newDashRef.$save().then(function(ref) {

					$rootScope.$broadcast('createDashboardComplete', newDashData);
					var htmlName = newDashboardName.replace(/ /g,"%20");
					var newDashPerms = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('permissions/Pages/dashboard')).$asObject();
					newDashPerms.$loaded().then(function(data){
						newDashPerms[htmlName] = {'*':{'requires': 'Admin'}};
						newDashPerms.$save().then(function(ref) {
							deferred.resolve({name: name, data: newDashData});
						}, function(error) {
							
						});
					});

				}, function(error) {
					
				});

			}
			return deferred.promise;
		},
		getQueries: function(name, userid){
			var ref = firebaseManager.buildRef(FirebaseRootRef.child('dataItems/models/User/data').child(userid).child('settings').child('dashboard').child(name));
			return ref;
		},
		savePreDefined: function(key,obj,objtype,type){
			var preDefinedRef, cleanModel, self;
			self = this;
			if( type == 'widgets'){
				preDefinedRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('predefined').child(type).child(objtype).child(key);
				cleanModel = angular.copy(obj);

				// need to add queries to this
				preDefinedRef.set({model: cleanModel});
			
			} else {
				preDefinedRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('predefined').child(objtype).child(key);
				cleanModel = angular.copy(JSON.stringify(obj));

				// need to add queries to this
				if( typeof type != 'undefined'){
					preDefinedRef.set({model: cleanModel, queries: type, active: true, menuLabel: obj.title});
				} else {
					preDefinedRef.set({model: cleanModel, active: true, menuLabel: obj.title});
				}

			}

		},
		getUserCustomDashboards: function(userid){
			var deferred = $q.defer();
			var predDefinedBoard = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models/User/data').child(userid).child('settings').child('dashboard'));
			deferred.resolve(predDefinedBoard);
			//predDefinedBoard.$off();
			return deferred.promise;
		},
		getPredefinedWidgets: function(type){
			var ref = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('predefined').child('widgets').child(type));
			return ref;
		},
		getData: function(searchQuery, key, returns, index) {
			var self = this;
			var deferred = $q.defer();
			es.get().search(searchQuery)
				.then(
					function(resp) {
						
						if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
							var searchResults = [];
							resp.hits.hits.forEach(function(hit, index) {

								if ($rootScope.userSites && hit._type === 'Point' && !$rootScope.userSites[hit._source.Site]) {
									return;
								}

								var ref;
								var modelName;
								var itemId;

								if( returns == "object"){
									if (hit.hasOwnProperty("_type") && hit.hasOwnProperty("_id")) {
										modelName = hit._type;
										itemId = hit._id;
										searchResults.push(DataModels.getItem(modelName, itemId, 3));
									}
									//ref = FirebaseRootRef.child("dataItems").child('models').child(hit._type).child("data").child(hit._id);
								} else {
									if (hit.hasOwnProperty("_type") && hit.hasOwnProperty("_id")) {
										modelName = hit._type;
										itemId = hit._id;
										searchResults.push(DataModels.getItem(modelName, itemId, 3));
									}
									//ref = FirebaseRootRef.child("dataItems").child(hit._type).child("data").child(hit._id).child(returns);
									//ref = FirebaseRootRef.child("dataItems").child('models').child(hit._type).child("data").child(hit._id);
								}
								
								//var afRef = $firebase( ref );
								//self.scopedData.push(afRef);

								//var result = hit._source;
								//result._id = hit._id;
								//searchResults.push($firebase( ref ));
							});
							
							// broadcast event and pass the array of firebase references to the widget
							var pld = pageLevelData.getRaw(key);
							if (!pld) { pld = {}; }
							pld[index] = searchResults;
							pageLevelData.set(key, pld);
							//$rootScope.$broadcast("dashboard:"+key+":complete", searchResults);
							deferred.resolve(searchResults);

						} else {
							//$rootScope.$broadcast("dashboard:"+key+":complete");
							deferred.resolve([]);
						}
					},
					function(err) {
						
						deferred.reject(err);
					}
				)
			;
			
			return deferred.promise;
		},
		setScopeID: function(scope) {
			var self = this;
			self.scopeID = scope;
		},
		setModelName: function(scope) {
			var self = this;
			self.modelName = scope;
		},
		setBoardName: function(scope) {
			var self = this;
			self.boardName = scope;
		},
		setQuery: function(key, queryArray, returns, model){
			console.log('setQuery ', key, queryArray, returns, model );
			var deferred = $q.defer();
			var self = this;
			var user = $rootScope.loginService.getCurrentUser();
			if( user ){
				var fbRef = UserRef.get().child(user.uid).child('settings/dashboard').child(self.boardName).child('queries').child(key);
				var query = firebaseManager.buildRef(fbRef).$asObject();
				//var obj = {"search": {"model": self.modelName, "properties": {"type": type}, "returns": returns}};
				var obj = {"search": angular.copy(queryArray)};
				query.search = queryArray;

				query.$save().then(function(ref) {
					deferred.resolve(fbRef);
				}, function(error) {
					deferred.resolve(fbRef);
				});
			}
			return deferred.promise;
		}
	};
	
}])

.run(['$rootScope', 'Dashboards',  function($rootScope, Dashboards) {
	$rootScope.dashboards = Dashboards.list();
}])

.config(['$stateProvider', function($stateProvider) {
	var dashboard = {
		name: 'auth.dashboard',
		abstract: true,
		url: '/dashboard/:name',
		templateUrl: 'Dashboards/index.tpl.html',
		controller: 'DashboardCtrl'
	};

	var ready = { 
		name: 'auth.dashboard.ready',
		url: '/:modelName/:scopeID', 
		templateUrl: 'Dashboards/ready.tpl.html', 
		authRequired:true, 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		}
	};

	$stateProvider
		.state(dashboard)
		.state(ready)
	;
}])

.controller('DashboardCtrl', ['$scope', '$stateParams', 'Dashboards', 'DataModels', '$state', '$rootScope', function($scope, $stateParams, Dashboards, DataModels, $state, $rootScope) {
	if($stateParams.name){
		$scope.name = $stateParams.name;
		$scope.editMode = false;
		$scope.collapsible = true;
		$scope.scopeID = $stateParams.scopeID;

		Dashboards.setScopeID($stateParams.scopeID );
		Dashboards.setModelName($stateParams.modelName);
		Dashboards.setBoardName($stateParams.name);
	}
}])

;