angular.module("omniboard.settings.states", ["ngSanitize"])

.config(['$stateProvider', function($stateProvider) {
	var admin = {
		name: 'auth.admin',
		abstract: true,
		url: '/admin',
		templateUrl: 'Admin/templates/admin.tpl.html',
		controller: 'AdminCtrl',
		data: {
			dataModelName: "default"
		},
		resolve:{
			permScopes: ['Perms', function(Perms){
				return Perms.getScopes();
			}],
			availableUsers:['DataModels', function(DataModels){
				return DataModels.getItems('User').$asObject();
			}],
			pointLoad:['Settings', '$q', function(Settings, $q){
				var defer = $q.defer();
				Settings.getSetting('PointLoad','Model').then(
					function(success){
						defer.resolve(success);
					}
				);
				return defer.promise;
			}]
		}
	};

	var settings = {
		name: 'auth.admin.settings',
		parent: admin,
		url: '/settings',
		title: 'Configuration Settings',
		templateUrl: 'Admin/templates/settings.tpl.html',
		authRequired: true ,
		controller: 'AdminCtrl',
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			displayGroup: "Admin",
			displayName: "Configuration Settings",
			description: "Allows configuration of global Omniboard application settings.",
			subHeading: "Configuration Settings",
			title: "Configuration Settings"
		}
	};

	var models = {
		name: 'auth.admin.models',
		parent: admin,
		url: '/models',
		templateUrl: 'Admin/templates/models.tpl.html',
		authRequired: true ,
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			displayGroup: "Models",
			displayName: "List All Data Models",
			description: "Create data models; edit schema; add, edit, delete items; define relationships",
			subHeading: "Data Models",
			title: "Data Models"
		}
	};

	var security = {
		name: 'auth.admin.security',
		abstract: true,
		url: '/security',
		templateUrl: 'Admin/templates/security.tpl.html',
		authRequired: true
	};

	var assignments = {
		name: 'auth.admin.security.assignments',
		parent: security,
		url: '/assignments',
		templateUrl: 'Admin/templates/securityAssignments.tpl.html',
		authRequired: true ,
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			displayGroup: "Admin",
			displayName: "Assign User Rights",
			description: "Assign security rights to users.",
			subHeading: "Assign Rights to Users",
			title: "User Rights"
		}
	};

	var pages = {
		name: 'auth.admin.security.pages',
		parent: security,
		url: '/pages',
		templateUrl: 'Admin/templates/securityPages.tpl.html',
		authRequired: true ,
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			displayGroup: "Admin",
			displayName: "Assign Page Security",
			description: "Assign required security rights to pages.",
			subHeading: "Set Required Rights for Pages",
			title: "Group Rights"
		}
	};

	$stateProvider
		.state(admin)
		.state(settings)
		.state(models)
		.state(security)
		.state(assignments)
		.state(pages)
	;

}])


.controller('AdminCtrl', ['$scope', 'Dashboards', '$rootScope', 'FirebaseRootRef', 'initialFirebaseChild', 'UserItem', 'Settings', '$timeout', '$state', 'DataModels', 'Perms', '$q', 'es', 'permScopes', '$modal', 'omniNavSettings', 'availableUsers', 'pointLoad', '$location', '$anchorScroll', 'dashboard', function($scope, Dashboards, $rootScope, FirebaseRootRef, initialFirebaseChild, UserItem, Settings, $timeout, $state, DataModels, Perms, $q, es, permScopes, $modal, omniNavSettings, availableUsers, pointLoad, $location, $anchorScroll, dashboard) {


	//Label to Put in Header Describing Current State (pulls from state custom data above)
	$scope.stateLabel = $state.current.data.subHeading;

	$scope.loadModelNames = DataModels.names().$asObject();
	$scope.allModelNames = [];
	$scope.baseModelNames = [];
	$scope.loadModelNames.$loaded().then(function(data){
		angular.forEach(data, function(val,id){
			if( typeof val.children != 'undefined'){
				$scope.baseModelNames.push(id);
			}
			$scope.allModelNames.push(id);
		});
	});

	$scope.loadModelNamesPaged = {};
	$scope.modelHierarchy = {};
	$scope.currentPage = 0;
	$scope.pageSize = 40;

	$scope.childList = {};
	$scope.morePages = true;
	$scope.showSpinner = false;
	$scope.editorOptionsInfo = false;

	$scope.EOoption = function(){
		if ($scope.editorOptionsInfo === false){
			$scope.editorOptionsInfo = true;
		}else{
			$scope.editorOptionsInfo = false;
		}
	};

	$scope.searchCommandablePointTypes = function(model){
		$scope.pointTypes = DataModels.getModelTypes(model).$asObject();
		$scope.totalSchedulableLoads = 0;
		$scope.pointTypes.$loaded(function(dataSnap){
			$scope.pointTypesCount = 0;
			angular.forEach(dataSnap,function(val,id){
				$scope.pointTypesCount++;
				if(id.indexOf('$') !== 0){
					if(typeof val.schedulableLoad != 'undefined' && val.schedulableLoad === true){
						$scope.totalSchedulableLoads++;
					}
				}
			});
		});
	};
	$scope.settingPointLoads = pointLoad;
	$scope.searchCommandablePointTypes(pointLoad);
	$scope.markPointsAsSchedulableLoad = function(pointLoad) {
		$scope.pointTypes.$save().then(function(ref) {
			Settings.saveSettingItem('PointLoad',{Model:pointLoad});
		}, function(error) {
			
		});
	};

	$scope.selectedPointTypeSelected = function($event, pointTypeId) {
		var action = ($event.target.checked ? 'add' : 'remove');
		if( typeof $scope.pointTypes[pointTypeId].schedulableLoad != 'undefined' && $scope.pointTypes[pointTypeId].schedulableLoad === true){
			$scope.pointTypes[pointTypeId].schedulableLoad = false;
			$scope.totalSchedulableLoads--;
		} else {
			$scope.pointTypes[pointTypeId].schedulableLoad = true;
			$scope.totalSchedulableLoads++;
		}
		//setResetPointType(action, pointTypeId);
	};

	$scope.getChildren = function (modelName) {
		if ($scope.modelHierarchy[modelName]){
			if (Object.keys($scope.childList).length === 0) {
				$scope.childList = {};
				$scope.childList[modelName] = {};
				for(var i = 0; i < $scope.modelHierarchy[modelName].length; i++){
					$scope.childList[modelName][$scope.modelHierarchy[modelName][i]] = $scope.modelHierarchy[modelName][i];
				}
			} else {
				$scope.childList = {};
			}
		}
	};

	$scope.dataLength = 0;
	$scope.pageCount = 2;

	$scope.modelNames = {};
	$scope.updatePageModels = function () {

		$scope.loadModelNamesPaged = {};
		$scope.dataLoading = true;
		$scope.morePages = false;

		var count = 0;
		var index = 0;
		var deferCount=0;

		var deferred = $q.defer();

		$scope.loadModelNames.$loaded(function(dataSnap){
			angular.forEach(dataSnap, function(data, modelName){
				if(typeof data.children != 'undefined'){
					$scope.modelNames[modelName] = data.children;
					$scope.modelNames[modelName].showChildren = false;
				}
				/*
				if (!modelName.contains('$')){
					index++;
					if (index >= $scope.pageSize * $scope.currentPage) {
						deferCount++;
						DataModels.getModelParent(modelName).then(function(parentModels) {
							angular.forEach(parentModels,function(parentModel){
								if(!$scope.modelHierarchy[parentModels]){
									$scope.modelHierarchy[parentModel] = [];
								}
								$scope.modelHierarchy[parentModel].push(modelName);
							});

							if(Object.keys($scope.loadModelNamesPaged).length < $scope.pageSize){
								$scope.loadModelNamesPaged[modelName] = modelName;
							} else {
								$scope.morePages = true;
							}

							if (--deferCount === 0) { deferred.resolve(deferCount); }
						});
					}
				}
				*/
			});

			deferred.promise.then(function(deferCount) {
				$scope.dataLoading = false;
				$scope.dataLength = Object.keys(dataSnap).length;
				$scope.pageCount = Math.ceil($scope.dataLength/$scope.pageSize);
			});
		});

	};

	$scope.noPrevious = function () {
		return $scope.currentPage === 0;
	};

	$scope.noNext = function () {
		return !$scope.morePages;
	};

	$scope.nextPage = function () {
		if ($scope.morePages) {
			$scope.currentPage++;
			$scope.updatePageModels();
		}
	};

	$scope.prevPage = function () {
		if ($scope.currentPage > 0) {
			$scope.currentPage--;
		}
		$scope.updatePageModels();
	};

	$scope.updatePageModels();
	$scope.modulePerms = FirebaseRootRef.child(initialFirebaseChild.get()).child("permissions").child('Modules').child('Perms');
	$scope.settings = Settings.getAllSettings().$asObject();

	$scope.fetchSelectedModels = function (user) {

		if (!user || user.length === 0) {
			$scope.availableModules = null;
			$scope.selectedModules = null;
			return;
		}

		var User = DataModels.getItem('User', user.uid);
		User.$relationsPromise.then(function() {

			$scope.selectedModules = User.SelectedModules;

			if ($scope.selectedModules === undefined || $scope.selectedModules.length === 0) {
				$scope.selectedModules = ['Views','Sites','Alarms','Schedule Details'];
			}

			var uniqueSelections = [];

			$.each($scope.selectedModules, function(i, el){
				if($.inArray(el, uniqueSelections) === -1){
					uniqueSelections.push(el);
				}
			});

			$scope.selectedModules = angular.copy(uniqueSelections);

			var selectedMods = {};

			angular.forEach($scope.selectedModules, function (module) {
				selectedMods[module] = true;
			});

			var defaultModules = angular.copy($scope.settings.General.AvailableModules.value);

			$scope.availableModules = [];
			angular.forEach(defaultModules, function (module, index) {
				if (!selectedMods[module]) {
					$scope.availableModules.push(module);
				}
			});
		});
	};

	$scope.selectedUserModules = {};
	$scope.updateUserModules = function(selectedUser) {
		$scope.selectedUserModules[selectedUser.uid] = $scope.selectedModules;
	};

	$scope.moveLeftRight = function(from, to, control) {
		//Here from is returned as blank and to as undefined
		if (from && to && control ){
			angular.forEach(control, function( module ) {
				var moduleIndex = from.indexOf(module);
				if ( moduleIndex != -1 ) {
					from.splice(moduleIndex, 1);
					to.push(module);
				}
			});

		$scope.updateUserModules($scope.availableUsers[angular.element('select[name="User"]').val()]);
		}
	};

	$scope.moveUpDown = function (direction, control, moduleArray) {
		if (direction && control && moduleArray) {

			if (direction == 'DOWN') { control.reverse(); }
			var tempModule;

			angular.forEach(control, function (module) {
				var selectedModuleId = moduleArray.indexOf(module);
				if (selectedModuleId == -1) { return; }
				if (direction == 'DOWN' && selectedModuleId < (moduleArray.length - 1)) {
					tempModule = moduleArray[selectedModuleId];
					moduleArray[selectedModuleId] = moduleArray[selectedModuleId + 1];
					moduleArray[selectedModuleId + 1] = tempModule;
				}
				else if (direction == 'UP' && selectedModuleId > 0) {
					tempModule = moduleArray[selectedModuleId];
					moduleArray[selectedModuleId] = moduleArray[selectedModuleId - 1];
					moduleArray[selectedModuleId - 1] = tempModule;
				}
			});
		}
	};

	var sgRef = DataModels.getSecurityGroupRef();
	sgRef.once('value',function(dSnap) {
		$scope.securityGroups = dSnap.val();
	});

	DataModels.fetchFilteredDate('Site',{}).then(function (sites){
		$scope.availableSites = {};
		angular.forEach(sites,function(site){
			$scope.availableSites[site._id] = site.Name;
		});
	});

	$scope.availableWidgets = {};
	if(dashboard.widgets){
		angular.forEach(dashboard.widgets, function(widget, widgetId){
			$scope.availableWidgets[widget.title] = true;
		});
	}

	$scope.modulePerms.once('value', function (dSnap) {
		$scope.permissionHash = dSnap.val();
		$scope.availableGroupModules = angular.copy($scope.permissionHash);
    });

	$scope.selectedGroupUsers = {};
	$scope.selectedGroupViews = {};
	$scope.selectedGroupSites = {};
	$scope.selectedGroupModules = {};
	$scope.selectedGroupWidgets = {};

	//$scope.availableViews = { 'Home':'Home', 'Energy':'Energy', 'Site Details':'HVAC Details', 'Transit':'Transit', 'Savvy':'Savvy', 'Floorplans':'Floorplan/Docs', 'demo':'Lighting Details'};
	$scope.availableViews = {};
	Dashboards.list().$loaded(function(dashboardList){
		angular.forEach(dashboardList, function(dashboardData, dashboardName){
			$scope.availableViews[dashboardName] = dashboardData.menuLabel;
		});
	});

	var user = $rootScope.loginService.getCurrentUser();

	$scope.setupGroupSettings = function(selectedGroup) {
		if(selectedGroup == null){
			$scope.selectedGroupUsers = {};
			$scope.selectedGroupViews = {};
			$scope.selectedGroupSites = {};
			$scope.selectedGroupModules = {};
			$scope.selectedGroupWidgets = {};
			$scope.checkboxSettings = {};
			$scope.groupName = null;
		}else{
			var groupSettings = $scope.securityGroups[selectedGroup];
			$scope.groupName = selectedGroup;
			$scope.checkboxSettings = {};

			if(groupSettings.checkboxSettings){
				$scope.checkboxSettings = groupSettings.checkboxSettings;	
			}

			$scope.selectedGroupViews = {};

			angular.forEach($scope.availableViews,function(view,key){
				if (groupSettings.Views && groupSettings.Views[key]) {
					$scope.selectedGroupViews[key] = view;
				}
			});

			var selectedGroupUsers = {};

			angular.forEach($scope.allUsers,function(name,id){
				if (groupSettings.Users && groupSettings.Users[id]) {
					selectedGroupUsers[id] = name;
				}
			});

			$scope.selectedGroupUsers = selectedGroupUsers;

			var selectedGroupSites = {};

			angular.forEach($scope.availableSites,function(name,id){
				if (groupSettings.Sites && groupSettings.Sites[id]) {
					selectedGroupSites[id] = name;
				}
			});

			$scope.selectedGroupSites = selectedGroupSites;
			
			var selectedGroupModules = {};

			if (groupSettings.Modules) {
				selectedGroupModules = angular.copy(groupSettings.Modules);
				angular.forEach(selectedGroupModules,function(module, moduleName){
					$scope.showChildren[moduleName] = false;
				});
			}

			$scope.selectedGroupModules = selectedGroupModules;

			$scope.selectedGroupWidgets = {};

			if(groupSettings.Widgets){
				$scope.selectedGroupWidgets = angular.copy(groupSettings.Widgets);
			}
		}
	};

	$scope.addPermission = function(sel,availablePerms,selectedGroupPerms) {
		selectedGroupPerms[sel] = availablePerms[sel];
	};

	$scope.changeModulePemissions = function(moduleName, perm){
		if($scope.checkboxSettings[moduleName][perm] && $scope.selectedGroupModules[moduleName].search($scope.permissionHash[moduleName][perm]) > -1){ //unchecked
			$scope.selectedGroupModules[moduleName] = $scope.selectedGroupModules[moduleName].replace("," + $scope.permissionHash[moduleName][perm], "");
		}else if(!$scope.checkboxSettings[moduleName][perm] && $scope.selectedGroupModules[moduleName].search($scope.permissionHash[moduleName][perm]) === -1){ //checked
			$scope.selectedGroupModules[moduleName] += "," + $scope.permissionHash[moduleName][perm];
		}
	};

	$scope.removeCheckboxSettings = function(moduleName){
		if($scope.checkboxSettings[moduleName]){
			delete $scope.checkboxSettings[moduleName];
			delete $scope.showChildren[moduleName];
		}
	};

	$scope.removePermission = function(sel,selectedGroupPerms) {
		delete selectedGroupPerms[sel];
	};

	$scope.saveGroupSettings = function(selectedGroup, groupName, groupUsers, groupViews, groupSites, groupModules, groupWidgets) {
		//console.log('selectedGroup,groupName,groupUsers,groupViews,groupSites: ' , selectedGroup,groupName,groupUsers,groupViews,groupSites);

		if(!groupName || groupName === ''){
			$scope.alerts = [];
			$scope.alerts.push({type:"warning", msg: "Please enter group name."});
			return;
		}

		if (selectedGroup && selectedGroup != groupName) {
			$scope.securityGroups[groupName] = $scope.securityGroups[selectedGroup];
			delete $scope.securityGroups[selectedGroup];
		} else {
			$scope.securityGroups[groupName] = {};
		}

		var groupSettings = $scope.securityGroups[groupName];

		if(selectedGroup !== 'Guest'){
			groupSettings.Users = angular.copy(groupUsers);
		}
		groupSettings.Views = angular.copy(groupViews);
		groupSettings.Sites = angular.copy(groupSites);
		groupSettings.Modules = angular.copy(groupModules);
		groupSettings.Widgets = angular.copy(groupWidgets);
		groupSettings.checkboxSettings = angular.copy($scope.checkboxSettings);

		for (var key1 in groupSettings.Users) { groupSettings.Users[key1]=true; }
		for (var key2 in groupSettings.Views) { groupSettings.Views[key2]=true; }
		for (var key3 in groupSettings.Sites) { groupSettings.Sites[key3]=true; }

		//console.log('$scope.securityGroups: ' , $scope.securityGroups);

		var sgRef = DataModels.getSecurityGroupRef();
		sgRef.set($scope.securityGroups,function() {
			$scope.alerts = [];
			$scope.alerts.push({type:"success", msg: "Group settings have been applied."});
		});

		if (Object.keys($scope.selectedGroupModules).length > 0) {
			$rootScope.$broadcast('GroupModulesChanged', $scope.selectedGroupModules);
		}
	};

	$scope.moveAll = function(from, to) {
		angular.forEach(from, function(item) {
			to.push(item);
		});
		from.length = 0;
		$scope.updateUserModules($scope.availableUsers[angular.element('select[name="User"]').val()]);
	};

	$scope.saving = false;
	$scope.alerts = [];
	$scope.allRights = Perms.getRights().$asObject();
	//$scope.securityScopes = Perms.getScopes();
	$scope.securityScopes = permScopes.$asObject();

	$scope.saveSettings = function(settings) {

		$scope.saving = true;
		$scope.alerts = [];

		angular.forEach($scope.selectedUserModules, function(modules,uid) {
			UserItem.update(uid, { SelectedModules: modules });
		});

		Settings.saveSettings($scope.settings).then(
			function() {
				$scope.saving = false;
				$scope.alerts.push({type:"success", msg: "Your settings have been applied."});
				if (Object.keys($scope.selectedUserModules).length > 0) {
					$rootScope.$broadcast('UserModulesChanged', $scope.selectedUserModules);
				}
				// set the location.hash to the id of
				// the element you wish to scroll to.
				$location.hash('alerts');

				// call $anchorScroll()
				$anchorScroll();
			},
			function(err) {
				$scope.saving = false;
				$scope.alerts.push({type:"danger", msg: err});
				// set the location.hash to the id of
				// the element you wish to scroll to.
				$location.hash('alerts');

				// call $anchorScroll()
				$anchorScroll();
			}
		);
	};

	$scope.addModelDependents = function (name, dependent) {

		var dependentName = name + dependent;

		var autoRelationsType = {
			label: "belongs To One",
			name: "belongsTo",
			pluralize: false
		};
		var autoParentRelationsType = {
			label: "Has Many",
			name: "hasMany",
			pluralize: true
		};

		if( dependent == 'Type' || dependent == 'Status' ){
			autoRelationsType = {
				label: "Has Many",
				name: "hasMany",
				pluralize: true
			};
			autoParentRelationsType = {
				label: "belongs To One",
				name: "belongsTo",
				pluralize: false
			};
		}

		DataModels.createNew(dependentName,false);
		var autoRelations = {};
		autoRelations[name] = {
			name: name,
			relationType: autoRelationsType
		};

		var promise = DataModels.setRelations(dependentName, autoRelations);

		var autoRelationsParent = {};
		autoRelationsParent[dependentName] = {
			name: dependentName,
			relationType: autoParentRelationsType
		};

		DataModels.setRelations(name, autoRelationsParent);

		return promise;

	};

	$scope.newModelCheck = function(newModelName){

		console.log("newModelName", newModelName);

		var newModelCheckScope = $scope.$new();

		newModelCheckScope.newModelName = newModelName;
		
		var instance = $modal.open({
			scope: newModelCheckScope,
			templateUrl: 'Admin/templates/newModelCheckModal.tpl.html'
		});

		
		newModelCheckScope.closeDialog = function(){
			instance.close();
			newModelCheckScope.$destroy();
		};

		newModelCheckScope.addModel = function (name) {
			console.log('name', name);
			$scope.showSpinner = true;
			DataModels.createNew(name,true);
			var promises = [];

			promises.push($scope.addModelDependents(name,'Note'));
			promises.push($scope.addModelDependents(name,'Type'));
			promises.push($scope.addModelDependents(name,'Status'));

			$q.all(promises).then(function(){
				var model = {name: name, form: [DataModels.getModelNameForm()]};
				DataModels.saveModel(model).then(function(){
					$state.go('auth.admin.dataModel.edit', { modelName: name }, {reload:true});

				});
			});
			newModelCheckScope.closeDialog();
		};

	};

	

	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);
	};


	//===================================================================================================
	//Assignments
	//===================================================================================================
	$scope.rightsTreeOptions = {
		accept: function(sourceNode, destNodes, destIndex) {
			var retVal = false;
			var data = sourceNode.$modelValue;
			var dest = destNodes.$modelValue;
			return !dest.some(function(value,key) {
				if (value.uid === data.uid) {
					return true;
				}
			});
		},
		dropped: function(event) {
			// PUT THE ELEMENT BACK INTO THE INITIAL ARRAY
			event.source.nodesScope.$modelValue.push( event.source.nodeScope.user );
			$scope.rightsChanged = true;
		},
		beforeDrop: function(event) {
			
			var sourceList = event.source.nodesScope.$modelValue;
			var sourceValue = angular.copy(event.source.nodeScope.$modelValue);
			var alreadyInList = !sourceList.some(function(value,key) {
				
				if (value.uid === sourceValue.uid) {
					return true;
				}
			});
			
			if (alreadyInList) {
				event.source.nodeScope.$$apply = false;
			}
		}
	};

	$scope.rightsArray = {};
	$scope.rightsChanged = false;

	$scope.availableUsers = [];
	$scope.allUsers = {};

	availableUsers.$loaded(function (users) {
		angular.forEach(users, function (val, id) {
			if (id.indexOf('$') !== 0) {
				if (val.hasOwnProperty('Firstname') && val.hasOwnProperty('Lastname')) {
					var user = {
						uid: id,
						Firstname: val.Firstname,
						Lastname: val.Lastname,
						FullName: val.Firstname + " " + val.Lastname
					};
					$scope.availableUsers.push(user);
					$scope.allUsers[id] = user.FullName;
				}
			}
		});
	});

	angular.forEach($scope.allRights, function(val, id){
		if( id.indexOf('$') !== 0){
			$scope.rightsArray[right] = [];
		}
	});

	$scope.removeRight = function(index, right) {
		$scope.rightsChanged = true;
		$scope.rightsArray[right].splice(index, 1);
	};

	$scope.saveRights = function() {
		$scope.alerts = [];
		var rights = {};
		var scope = $scope.getCurrentSecurityScopePath();

		angular.forEach($scope.rightsArray, function(users,right) {
			angular.forEach(users, function(user) {
				if (!rights[right]) {
					rights[right] = { users: {} };
				}

				if (!rights[right].users) {
					rights[right].users = {};
				}

				rights[right].users[user.uid] = true;
			});
		});

		$scope.saving = true;

		Perms.setAssignments(scope, rights).then(
			function() {
				$scope.saving = false;
				$scope.alerts.push({type:"success", msg: "Your rights assignments have been applied."});
				// set the location.hash to the id of
				// the element you wish to scroll to.
				$location.hash('alerts');

				// call $anchorScroll()
				$anchorScroll();
			},
			function(err) {
				$scope.saving = false;

				$scope.alerts.push({type:"danger", msg: err});
				// set the location.hash to the id of
				// the element you wish to scroll to.
				$location.hash('alerts');

				// call $anchorScroll()
				$anchorScroll();
			}
		);
	};

	$scope.updateSecurityScope = function(securityScopeName) {
		var securityScope = $scope.securityScopes[securityScopeName];

		if (securityScope.hasOwnProperty("model")) {
			$scope.securityScopeModelItems = DataModels.getItems(securityScope.model).$asObject();
		} else {
			$scope.securityScopeModelItems = null;
		}

		$scope.securityScope = securityScope;
		$scope.securityScopeName = securityScopeName;
		$scope.securityScopeModelItem = null;
		$scope.currentSecurityScope = $scope.getCurrentSecurityScope();
		$scope.loadAssignments();
	};

	$scope.updateSecurityScopeModelItem = function(modelItemId) {
		$scope.securityScopeModelItemId = modelItemId;
		$scope.securityScopeModelItem = $scope.securityScopeModelItems[modelItemId];
		$scope.currentSecurityScope = $scope.getCurrentSecurityScope();
		$scope.loadAssignments();
	};

	$scope.getCurrentSecurityScopePath = function() {
		var scope = "";
		if ($scope.securityScopeName) {
			scope = $scope.securityScopeName;

			if ($scope.securityScope.model) {
				scope += "/" + $scope.securityScope.model;

				if ($scope.securityScopeModelItemId) {
					scope += "/" + $scope.securityScopeModelItemId;
				} else {
					scope += "/*";
				}
			}
		}
		return scope;
	};

	$scope.getCurrentSecurityScope = function() {
		var scope = "";
		if ($scope.securityScopeName) {
			scope = $scope.securityScopeName;

			if ($scope.securityScope.model) {
				//scope += "/" + $scope.securityScope.model;

				if ($scope.securityScopeModelItem && $scope.securityScopeModelItem.Name) {
					scope += "/" + $scope.securityScopeModelItem.Name;
				} else {
					scope += "/All " + attache.plural($scope.securityScope.model);
				}
			}
		}
		return scope;
	};

	$scope.loadAssignments = function() {
		$scope.rightsArray = {};
		$scope.rightsChanged = false;

		angular.forEach($scope.allRights, function(rightObject, right) {
			$scope.rightsArray[right] = [];
		});

		var rightsArray = Perms.getAssignments($scope.getCurrentSecurityScopePath()).$asObject();
		rightsArray.$loaded().then(
			function(event) {
				angular.forEach(rightsArray, function(rightObject, right) {
					if (rightObject.users) {
						angular.forEach(rightObject.users, function(assignment, uid) {
							var user = availableUsers[uid];
							if (!$scope.rightsArray[right]) {
								$scope.rightsArray[right] = [];
							}
							var o = {
								uid:uid ? uid : "",
								Firstname: user ? user.Firstname : "[Deleted User]",
								Lastname: user ? user.Lastname : ""
							};
							$scope.rightsArray[right].push(o);
						});
					}
				});
			}
		);
	};


	//===================================================================================================
	//Pages
	//===================================================================================================

	$scope.updateDashboardModelName = function(modelName) {
		var displayModelName = modelName;
		var itemDisplayName = "Any " + displayModelName;
		if (!modelName) {
			modelName = "*";
			displayModelName = "Any Model";
			itemDisplayName =  "Any Item";
		}
		var cpAvailablePages = angular.copy($scope.availablePages);

		angular.forEach(cpAvailablePages.Dashboards, function(page) {
			page.url = $state.href("auth.dashboard.ready", { name: page.dashboardName, modelName: "*1*", scopeID: "*2*" })
				.replace(/\*1\*/g, modelName)
				.replace(/\*2\*/g, "*");

			page.displayUrl = $state.href("auth.dashboard.ready", { name: page.dashboardName, modelName: "*1*", scopeID: "*2*" })
				.replace(/\*1\*/g, " <span class='label label-info'>" + displayModelName + "</span> ")
				.replace(/\*2\*/g, " <span class='label label-info'>" + itemDisplayName + "</span> ");

			page.alreadyAssigned = $scope.urlAssigned(page.url, false);
		});

		angular.forEach(cpAvailablePages.Models, function(page) {
			page.url =$state.href(page.state.name) + "/" + modelName;

			page.displayUrl = $state.href(page.state.name) +"/" +" <span class='label label-info'>" + displayModelName + "</span> ";
			page.pid = page.state.name + "." + modelName;

			page.alreadyAssigned = $scope.urlAssigned(page.url, false);
		});

		$scope.availablePages = cpAvailablePages;
		$scope.dashboardModelName = modelName;
		$scope.dashboardModelItems = DataModels.getItems(modelName);
	};

	$scope.updateDashboardModelItem = function(modelItemId) {
		angular.forEach($scope.availablePages.Dashboards, function(page) {
			page.url = $state.href("auth.dashboard.ready", { name: page.dashboardName, modelName: "*1*", scopeID: "*2*" })
				.replace(/\*1\*/g, $scope.dashboardModelName)
				.replace(/\*2\*/g, modelItemId);

			page.displayUrl = $state.href("auth.dashboard.ready", { name: dashboardName, modelName: "*1*", scopeID: "*2*" })
				.replace(/\*1\*/g, " <span class='label label-info'>" + $scope.dashboardModelName + "</span> ")
				.replace(/\*2\*/g, " <span class='label label-info'>" + modelItemId + "</span> ");
		});

		$scope.dashboardModelItemId = modelItemId;
		$scope.dashboardModelItem = $scope.dashboardModelItems[modelItemId];
	};

	$scope.pagesChanged = false;

	$scope.pagesTreeOptions = {
		accept: function(sourceNode, destNodes, destIndex) {
			var retVal = false;
			var data = sourceNode.$modelValue;
			var dest = destNodes.$modelValue;
			return !dest.some(function(value,key) {
				if (value.pid === data.pid) {
					return true;
				}
			});
		},
		dropped: function(event) {
			event.source.nodesScope.$modelValue.push( event.source.nodeScope.$modelValue );
			$scope.pagesChanged = true;

		},
		beforeDrop: function(event) {
			var sourceList = event.source.nodesScope.$modelValue;
			var sourceValue = angular.copy(event.source.nodeScope.$modelValue);
			var alreadyInList = !sourceList.some(function(value,key) {
				if (value.pid === sourceValue.pid) {
					return true;
				}
			});
			if (alreadyInList) {
				event.source.nodeScope.$$apply = false;
			}
		}
	};

	$scope.pagesArray = {};

	$scope.availablePages = {};

	// Add Existing Dashboards to Array
	var pagesPromises = [];
	var dashboardsDeferred = $q.defer();
	//pagesPromises.push(dashboardsDeferred.promise);

	// Add Existing States to Array
	var statesDeferred = $q.defer();
	pagesPromises.push(statesDeferred.promise);
	var states = $state.get();
	angular.forEach(states, function(state) {

		// State must:
		//  - have a url
		//  - not be abstract
		//  - have a resolve property (require security check)
		if (state.hasOwnProperty("url") && (!state.hasOwnProperty("abstract") || !state.abstract) && state.hasOwnProperty("resolve")) {
			if (!state.data) { state.data = {}; }
			var page = {};

			// Anything but dashboards
			if (state.name.indexOf('auth.dashboard') == -1) {
				page = {
					pid: state.name,
					url: $state.href(state.name),
					displayUrl: $state.href(state.name),
					state: state
				};
				if(state.data.displayName){
					page.displayName = state.data.displayName;
				}
				if(state.data.displayGroup){
					page.displayGroup = state.data.displayGroup;
				}
				if(state.data.description){
					page.description = state.data.description;
				}

				if (!state.data.displayGroup || state.data.displayGroup === "") { state.data.displayGroup = "Other"; }

				if (page.displayGroup == "Models") {
					page.url = $state.href(state.name, { modelName: "*1*" })
						.replace(/\*1\*/g, "*");

					page.displayUrl = $state.href(state.name, { modelName: "*1*" })
						.replace(/\*1\*/g, " <span class='label label-info'>Any Model</span> ");
				}

				if (!$scope.availablePages[state.data.displayGroup]) { $scope.availablePages[state.data.displayGroup] = []; }
				$scope.availablePages[state.data.displayGroup].push(page);
			}
		}
	});

	statesDeferred.resolve();

	$q.all(pagesPromises).then(
		function() {

			$scope.loadPageAssignments();
		}
	);

	/*
	DUPLICATE
	$scope.allRights.$on("child_added", function(event) {
		var right = event.snapshot.name;
		$scope.pagesArray[right] = [];

	});
	*/

	$scope.removePageRight = function(index, right) {
		$scope.pagesArray[right].splice(index, 1);
		$scope.pagesChanged = true;
	};

	var clearRightPageData = function(rightPage){
		if(rightPage.$$hashKey){
			delete rightPage.$$hashKey;
		}
		if(rightPage.state && rightPage.state.resolve){
			delete rightPage.state.resolve;
			if(rightPage.state.parent && rightPage.state.parent.resolve){
				delete rightPage.state.parent.resolve;
			}
		}

	};

	$scope.savingPages = false;

	$scope.savePageRights = function() {
		$scope.alerts = [];
		var pages = {};
		var scope = $scope.getCurrentSecurityScopePath();

		angular.forEach($scope.pagesArray, function(rightPages, right) {
			angular.forEach(rightPages, function(rightPage) {
				clearRightPageData(rightPage);
				var pageKey = rightPage.url;
				if(pages[pageKey]){
					pages[pageKey].requires.push(right);
				}
				else{
					pages[pageKey] = { page: rightPage };
					pages[pageKey].requires = [];
					pages[pageKey].requires.push(right);
				}
			});
		});

		var adminAccess = "#/*";
		pages[adminAccess] = { requires: "Admin" };

		$scope.savingPages = true;
		Perms.setPageAssignments(pages).then(
			function() {
				$scope.savingPages = false;
				$scope.pagesChanged = false;
				$scope.alerts.push({type:"success", msg: "Your rights assignments have been applied."});
			},
			function(err) {
				$scope.savingPages = false;
				$scope.pagesChanged = false;

				$scope.alerts.push({type:"danger", msg: err});
			}
		);
	};

	$scope.loadPageAssignments = function() {
		$scope.allRights.$loaded(function(allRights){
			angular.forEach(allRights, function(rightObject, right) {
				$scope.pagesArray[right] = [];
			});
			var pagesArray = Perms.getPageAssignments().$asObject();
			pagesArray.$loaded().then(
				function (data) {
					angular.forEach(data, function (obj, pageUrl) {
						var rights = obj.requires;
						var page = obj.page;
						if (Array.isArray(rights)) {
							angular.forEach(rights, function (right, index) {
								fillPageRight(right, page, pageUrl);
							});
						} else {
							fillPageRight(rights, page, pageUrl);
						}
					});
				}
			);
		});
	};

	var fillPageRight = function(right, page, pageUrl){
		var url = "#/" + pageUrl.replace(/\|/g, "/");
		if (page) {
			page.alreadyAssigned = true;
			$scope.pagesArray[right].push(angular.copy(page));
		}
	};

	$scope.urlAssigned = function(url, remove) {
		var retVal = false;
		angular.forEach($scope.pagesArray, function(pages,right) {
			var o = null;
			angular.forEach(pages, function(page) {
				if (page.url == url) {
					retVal = true;
					o = page;
				}
			});
			if (remove && o) {
				var index = pages.indexOf(o);
				pages.splice(index, 1);
			}
		});
		return retVal;
	};

	$scope.getPageFromUrl = function(url) {
		var retVal = null;
		angular.forEach($scope.availablePages, function(group) {
			angular.forEach(group, function(page) {

				if (page.url == url) {
					retVal = page;
				}
			});
		});
		return retVal;
	};

	$scope.isEmpty = function (obj) {
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				return false;
			}
		}
		return true;
	};

	$scope.showUserDetail = function(uid) {
		var modalScope = $scope.$new();
		modalScope.userId = uid;

		availableUsers.$on("value", function(event) {
			angular.forEach(event.snapshot.value, function(val,id){
				if ( id == uid){
					modalScope.name = val.Name;
					modalScope.userName = val.Username;
					modalScope.lastOnline = val.lastOnline;
					modalScope.online = val.online;
				}
			});
		});

		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'Admin/templates/userDetails.tpl.html',
			size: 'md'
		});

		modalScope.closeDialog = function(){
			instance.close();
			modalScope.$destroy();
		};
	};

	$scope.checkboxSettings = {};
	$scope.showChildren = {};

    $scope.showModulePermsModal = function (moduleName, availableGroupModules, selectedGroupModules) {
		if (Object.keys($scope.permissionHash[moduleName]).length <= 1) {
			$scope.addPermission(moduleName, availableGroupModules, selectedGroupModules);
			selectedGroupModules[moduleName] = $scope.permissionHash[moduleName]['Base'];
			return;
		}

		var modalScope = $scope.$new();
		modalScope.module = {};
		modalScope.permissions = [];

		if (!$scope.checkboxSettings[moduleName]) {
			$scope.checkboxSettings[moduleName] = {};
		}

		angular.forEach($scope.permissionHash[moduleName], function (permission, permName) {
			if(permName !== 'Base'){
				modalScope.permissions[permName] = 'true';
			}
		});

		modalScope.savePermissionChoices = function () {
			$scope.showChildren[moduleName] = false;
			$scope.addPermission(moduleName, availableGroupModules, selectedGroupModules);

			if (selectedGroupModules[moduleName]) {
				for(var permName in modalScope.permissions) {
					$scope.checkboxSettings[moduleName][permName] = false;
				}

				selectedGroupModules[moduleName] = "";
				if($scope.permissionHash[moduleName]['Base']){
						selectedGroupModules[moduleName] += $scope.permissionHash[moduleName]['Base'];
				}

				if (modalScope.module.add) {
					selectedGroupModules[moduleName] += ',' + $scope.permissionHash[moduleName]['Add'];
					$scope.checkboxSettings[moduleName]['Add'] = true;
				}

				if (modalScope.module.edit) {
					selectedGroupModules[moduleName] += ',' + $scope.permissionHash[moduleName]['Edit'];
					$scope.checkboxSettings[moduleName]['Edit'] = true;
				}

				if (modalScope.module.del) {
					selectedGroupModules[moduleName] += ',' + $scope.permissionHash[moduleName]['Delete'];
					$scope.checkboxSettings[moduleName]['Delete'] = true;
				}
			}
			instance.close();
			modalScope.$destroy();
		};

		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'Admin/templates/modulePermissions.tpl.html',
			size: 'sm'
        });

		modalScope.closeDialog = function () {
			instance.close();
			modalScope.$destroy();
		};
    };
	
	//==========================================
	// Editor Options
	//==========================================

	$scope.eoItems = [];
	$scope.eoItem = {}; //then changes by select-box
	$scope.eo = {};

	$scope.eoRawItems = DataModels.getModelTypes('Point').$asObject();
	$scope.eoRawItems.$loaded().then(function(data){
		angular.forEach(data, function(val){
			$scope.eoItems.push(val);
		});
	});

	$scope.getEditorOptions = function(item){
		if (item && item.editorOptions !== undefined) {
			$scope.eo = item;
		}else {
			$scope.eo = {editorOptions:{}};
		}
		$scope.eoItemName = item.Name;
	};

	$scope.saveEditorOptions = function(){
		function normalizeToArray(list){
			if (!angular.isArray(list)) {
				return list.replace(/\s+/g, '').split(',');
			} else {
				return list;
			}
		}

		$scope.alerts = [];

		var eoNormalized = {
			binarylist: $scope.eo.editorOptions.binarylist,
			list: $scope.config.displayValues,
			maxValue: +$scope.eo.editorOptions.maxValue,
			minValue: +$scope.eo.editorOptions.minValue,
			type: $scope.eo.editorOptions.type
		};

		if($scope.eo.editorOptions.binarylist == null){
			delete eoNormalized.binarylist;
		}

		if($scope.config.displayValues == null){
			delete eoNormalized.list;
		}

		angular.forEach($scope.eoRawItems, function(val){
			if (val.Name == $scope.eoItemName) {
				
				val.editorOptions = eoNormalized;
				val.commandable = $scope.eo.commandable;
				$scope.eoRawItems.$save();
				$scope.alerts.push({type:"success", msg: "Your settings have been applied."});
				// set the location.hash to the id of
				// the element you wish to scroll to.
				$location.hash('alerts');

				// call $anchorScroll()
				$anchorScroll();
			}
		});

	};

	$scope.config={};
	$scope.config.displayValues = {};
	
	$scope.editTypeChange = function(typeData){
		
		if(typeData == 'binary'){
			$scope.eo.binarylist=[];
			$scope.config.displayValues = null;
			
		}

		if(typeData == 'multivalue'){
			$scope.config.displayValues ={};
			$scope.eo.binarylist = null;
			
		}
	};

	$scope.deleteDisplayValue = function(key) {
		delete $scope.config.displayValues[key];
	};

	$scope.addDisplayValue = function(key, value) {
		$scope.config.displayValues[key] = value;
	};

}])

;
