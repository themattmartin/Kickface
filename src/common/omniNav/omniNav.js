angular.module('omniboard.omniNav', [])

.factory('omniNavSettings', function(){
	return {
		isSelected: null,
		showNav: true,
		currentModel: null,
		scopeID: '',
		getSiteSelected: function(){
			return this.isSelected;
		},
		setSiteSelected: function(a){
			this.isSelected = a;
		},
		getScopeID: function(){
			return this.scopeID;
		},
		getCurrentModel: function(){
			return this.currentModel;
		},
		setState: function(model, ID){
			this.currentModel = model;
			this.scopeID = ID;
		},
		isShown: function(){
			return this.showNav;
		},
		toggleNav: function(){
			this.showNav = !this.showNav;
		},
		hide: function(){
			this.showNav = false;
		},
		show: function(){
			this.showNav = true;
		},
		set: function(val){
			this.showNav = val;
		}
	};
})

.directive('omniNav', ['$modal', 'Dashboards', '$state','DataModels', '$rootScope', '$builder', '$location', '$http', function ($modal, Dashboards, $state, DataModels, $rootScope, $builder, $location, $http) {
	return {
		restrict: 'E',
		replace: true,
		templateUrl: 'omniNav/omniNav.tpl.html',
		scope: {
			userBoards: '=userBoards',
			preDefined: '=preDefined'
		},
		controller: function($scope, $modal, $builder, $state, $rootScope, omniNavSettings, FirebaseRootRef, initialFirebaseChild, $q) {

			$scope.hideView = false;
			var userPersonalizedViews = {};

			if($rootScope.superUser){
				$scope.superUser = $rootScope.superUser;
			}

			if($rootScope.userModuleViews){
				$scope.userModuleViews = $rootScope.userModuleViews;
			}
			
			$scope.isAllowed = function(menuItem){
				if($rootScope.superUser || ($rootScope.userModuleViews && $rootScope.userModuleViews[menuItem])){
					return true;
				}
				return false;
			};

			//TO-DO: Need to add a button that switches the menu bar into edit mode
			// This toggles the visibility of Delete button
			$scope.deleteMode = true;

			$scope.showMore = false;
			$scope.splitName = function(str){
				return str.replace( $scope.viewModel, $scope.viewModel+" ");
			};

			$scope.showWizard = false;
			$scope.siteDiscovery =  FirebaseRootRef.child(initialFirebaseChild.get()).child("discoveryResults");
			$scope.siteDiscovery.once("value",function(snapShot){
				if (snapShot.val() && Object.keys(snapShot.val()).length > 0) {
					$scope.showWizard = true;
				}
			});

			$scope.currentModel = $state.params.modelName;
			$scope.currentModelId = $state.params.scopeID;

			$scope.omniNavSettings = omniNavSettings;
			$scope.showNav = omniNavSettings.showNav;



			$rootScope.toggleNav = function(){
				omniNavSettings.toggleNav();
				$rootScope.$broadcast('toggleNav', omniNavSettings.showNav);
			};

			$rootScope.$on('toggleNav', function(evt, dataFromEvent) {
				omniNavSettings.set(dataFromEvent);
				//$scope.showNav = dataFromEvent;
				//$scope.setMapStyle();
			});

			$scope.adminSelected = function(stateName){
				//omniNavSettings.hide();
				$state.go("auth.admin." + stateName);
			};

			$scope.thisSelected = function(params,dashboard){
				dashboard.selected=true;
				params.name = dashboard.$name;
				$rootScope.dashboardName = dashboard.$name;

				omniNavSettings.setSiteSelected(dashboard.menuLabel);

				var scopeID = omniNavSettings.getScopeID();
				if( typeof params.sectionName != 'undefined' && params.sectionName != 'Views'){
					if( scopeID === '' || ($state.params.modelName !== dashboard.navModel.navModel) ){
						var fbModeDataRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models/' + params.modelName + '/data/');

						fbModeDataRef.once('value', function(dataSnap){

							var modalScope = $scope.$new();
							modalScope.dataLoaded = false;
							modalScope.viewName = params.modelName;

							modalScope.closeDialog = function(data){
								instance.close();
								modalScope.$destroy();
								if(typeof data != 'undefined'){
								params.scopeID = data.id;
								$state.go("auth.dashboard.ready", params);
							}
							};

							var instance = $modal.open({
								scope: modalScope,
								templateUrl: 'omniNav/templates/selectViewItem.tpl.html',
								size: 'sm'
							});

							modalScope.dataList = [];

							for( var ID in dataSnap.val() ){

								if (params.modelName == 'Site' && $rootScope.userSites && !$rootScope.userSites[ID]) { continue; }

								var ptData = dataSnap.val()[ID];

								var data = {};
								data['id'] = ID;
								data['value'] = ptData.Name;
								modalScope.dataList.push(data);

							}

							modalScope.dataLoaded = true;
						});
					} else {
						if(params.name == 'home'){
							params.scopeID = '';
							omniNavSettings.setState(params.modelName,'');
						}
						$state.go("auth.dashboard.ready", params);
					}
				} else {
					if(params.name == 'home'){
						params.scopeID = '';
						omniNavSettings.setState(params.modelName,'');
					}

					$state.go("auth.dashboard.ready", params);
				}

			};

			$scope.removePersonalizedView = function(viewName) {
				var modalScope = $scope.$new();
				modalScope.viewName = viewName;
				// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
				var instance = $modal.open({
					scope: modalScope,
					templateUrl: 'omniNav/templates/confirmViewDelete.tpl.html',
					size: 'sm'
				});

				modalScope.closeDialog = function(){
					instance.close();
					modalScope.$destroy();
				};

				$scope.confirm = function() {

					var user = $rootScope.loginService.getCurrentUser();
					var ref = Dashboards.getUserViewRef(viewName, user.uid);
					ref.$remove().then(function(ref) {
						// A predefined copy of every view a user creates is automatically
						// created, so, for now, we'll remove the predefined copy too.
						// TO-DO: Really need a perms checks here to ensure user has sufficient access

						var predefinedRef = Dashboards.getPredefinedViewRef(viewName);
						
						predefinedRef.$remove().then(function(ref) {
							modalScope.closeDialog();
							$state.go('auth.dashboard.ready', {name:'home', modelName:'Site', scopeID: ''}, { reload:true });
						});
					});
				};

				$rootScope.$on("logout:request", function(user) {
					instance.close();
					modalScope.closeDialog();
				});
			};

			$scope.isPersonalizedView = function(viewName) {
				if (userPersonalizedViews.hasOwnProperty(viewName)) {
					return userPersonalizedViews[viewName];

				} else {
					userPersonalizedViews[viewName] = false;

					// Get Ref to menuLabel property of custom view for better performance as
					// opposed to fetching whole dashboard definition and watching it
					// Watch dashboard with "on" so that if user customized dashboard in future, the
					// boolean for isPersonalizedView will update with true
					var user = $rootScope.loginService.getCurrentUser();
					var ref = Dashboards.getUserViewRef(viewName, user.uid).$asObject();
					ref.$loaded().then(function(snap){
						userPersonalizedViews[viewName]	= (snap.menuLabel !== null);
					});

					return userPersonalizedViews[viewName];
				}
			};

			/* Required for Perms factory that checks permissions on each page */
			$rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {
				//console.log('omniNav - stateChangeStart ', toState);
				if ( toParams.scopeID !== '' && toParams.modelName && toParams.scopeID ){
					$scope.model = toParams.modelName;
					$scope.viewModel = toParams.modelName;
					$scope.modelId = toParams.scopeID;
					DataModels.getNameAttr($scope.model, toParams.scopeID).then(function(ok){
						$scope.nameOfModelItem = ok;
					});

					// get relations hasMany
					$scope.relations = {};
					var relations = DataModels.getModelRelations($scope.model).$asObject();
					relations.$loaded().then(
						function(loadedRelations) {
							angular.forEach(loadedRelations, function(val,id){
								if( id.indexOf($scope.model) === 0 && val.relationType.name == 'hasMany'){
									$scope.relations[id] = val;
								}
							});
						}
					);
				} else {
					$scope.model = null;
					$scope.nameOfModelItem = null;
					$scope.modelRelations = null;
				}
			});

			$scope.viewLoaded = true;	
			$scope.addDash = function(name){
				$scope.viewLoaded = false;
				$rootScope.WizStep = 2;
				Dashboards.createPersonalDashboard(name).then(
					function(data){
						$scope.viewLoaded = true;
						$rootScope.$broadcast('createDashboardComplete', data);
						// redirect to dashboard
						$location.path('/dashboard/'+data.name+'/Site/');
					}
				);
			};

			$scope.clear = function(id){
				$state.go('auth.dashboard.ready', {name:'home', modelName:'Site', scopeID: ''});
			};
			$scope.show = function(id){
				$scope.showMore = !$scope.showMore;
			};

			$scope.openModelModal = function(modelName,viewModel,modelId){
				var modalScope = $scope.$new();

				modalScope.modalTitle = modelName;
				modalScope.modalTitle = modalScope.modalTitle.replace( viewModel, viewModel+" ");

				/**
				 * Re-Initialize Form Builder with No Fields
				 */
				while($builder.forms["default"].length > 0) {
					$builder.removeFormObject("default", $builder.forms["default"].length - 1);
				}

				modalScope.saved = false;
				modalScope.modelName = modelName;
				modalScope.modelId = modelId;
				modalScope.viewModel = viewModel;
				modalScope.currentItem = {};


				var itemExists = function(arr, col, val) {
					return arr.some(function(element, index, array) {
						return (element[col] == val);
					});
				};

				modalScope.dataItemForm = DataModels.getModelForm(modelName);

				modalScope.dataItemForm.$asObject().$loaded().then(function (data) {

					angular.forEach(data, function(field,id) {

						if (!itemExists($builder.forms['default'], 'id', field.id)) {

							field.hasMoved = false;

							if (field.component === "select") {
								var modelName = field.label;
								var srchPromise = DataModels.getItemsPickList(modelName, "Name");
								srchPromise.then(function (pickListArray) {
									field.options = pickListArray;
									$builder.insertFormObject("default", field.index, field);
								});
							} else {
								$builder.insertFormObject("default", field.index, field);
							}
						}

					});

				});

				var instance = $modal.open({
					scope: modalScope,
					templateUrl: 'omniNav/templates/modal.tpl.html'
				});

				$rootScope.$on("logout:request", function(user) {
					instance.close();
					modalScope.$destroy();
				});

				modalScope.closeAlert = function(index) {
					modalScope.alerts.splice(index, 1);
				};
				
				modalScope.submit = function(item, files){
					modalScope.alerts = [];
					var reg = /[^A-Za-z0-9. ]/;

					if(item.saveFiles && item.saveFiles.length > 0 && item.saveFiles[0].type != "image/png" && item.saveFiles[0].type != "image/jpg" && item.saveFiles[0].type != "image/jpeg" && item.saveFiles[0].type != "application/pdf"){
						modalScope.alerts.push({type:"danger", msg: "Incorrect file type. Acceptable types are pdf, jpg, jpeg and png."});
						return;
					}else if(item.saveFiles && item.saveFiles.length > 0 && item.saveFiles[0].name && reg.test(item.saveFiles[0].name)){
						modalScope.alerts.push({type: 'danger', msg: 'Invalid file name. Only alphabets, numbers and spaces are allowed.'});
						return;
					}

					var verb = '';
					item[modalScope.viewModel] = modalScope.modelId;
					if (item.hasOwnProperty('$id')) {
						verb = 'update';
						DataModels.updateItem(modalScope.modelName, item);
					} else {
						verb = 'create';
						DataModels.createItem(modalScope.modelName, item);
					}
					var cleanUpAfterSave = $rootScope.$on(verb + ':' + modalScope.modelName + ':afterSave', function (event, itemId) {
							if (item.saveFiles) {
								$scope.uploading = true;
								var fd = new FormData();
								fd.append('folder', 'floorPlans');
								angular.forEach(item.saveFiles, function (file) {
									console.log(file);
									fd.append('file', file);
								});
								$http.post('/uploadS3', fd, {
									transformRequest: angular.identity,
									headers: { 'Content-Type': undefined }
								}).success(function (data, status, headers, config) {
									var copyOfItem = DataModels.getItem($scope.modelName, item._id);
									if (copyOfItem.saveFiles) {
										delete copyOfItem.saveFiles;
									}
									copyOfItem.URL = data.key;
									copyOfItem.type = 'floorPlan';
									DataModels.updateItem($scope.modelName, copyOfItem);
								}).error(function (data, status, headers, config) {
									console.log("Status:" + status + "\nError Data:" + JSON.stringify(data));
							});
						}
					});
					modalScope.closeDialog();
				};

				modalScope.closeDialog = function(){
					instance.close();
					modalScope.$destroy();
				};
			};


		}

	};
}])
.directive('omniNavHistory', ['$rootScope', '$location', '$state', function ($rootScope, $location, $state) {
	var historyDepth = 4;

	var omniNavCurrent = $rootScope.omniNavCurrent;
	var omniNavHistory = $rootScope.omniNavHistory || [];

	function addState(state, stateParams) {
		if (omniNavCurrent) {
			if(omniNavHistory.length > 0 && omniNavHistory[0].title === omniNavCurrent.title){
				// duplicate entry, do nothing
			}else{
				omniNavHistory.splice(0, 0, omniNavCurrent);

				if (omniNavHistory.length > historyDepth) {
					omniNavHistory.splice(omniNavHistory.length - 1, 1);
				}
			}
		}

		omniNavCurrent = {
			state: state,
			stateParams: stateParams,
			url: $state.href(state, stateParams),
			title: state.data ? state.data.navtitle || state.data.title || state.data.displayName : 'Page'
		};
	}

	$rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams) {
		addState(toState, toParams);
	});

	addState($state.current);

	return {
		restrict: 'EA',
		replace: true,
		transclude: false,
		templateUrl: 'omniNav/omniNavHistory.tpl.html',
		scope: {
			title: '@'
		},
		controller: ['$scope', function($scope){
			$scope.omniNavCurrent = omniNavCurrent;
			$scope.omniNavHistory = omniNavHistory;

			// Watching title value if it is being set after directive initialization
			$scope.$watch('title', function(newVal) {
				if (newVal) {
					$scope.omniNavCurrent.title = newVal;
				}
			});
		}]
	};
}]);
