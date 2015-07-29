/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.GroupManagement.states", [])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var main = {
		name: 'auth.GroupManagement',
		url: '/GroupManagement',
		templateUrl: 'GroupManagement/templates/GroupManagement.tpl.html',
		controller: 'GroupManagementCtrl',
		resolve: {
			groups: ['Groupdata', function(Groupdata){
				return Groupdata.getGroups();
			}]
		},
		data: {
			title: 'Group Management',
			iconClass: 'fa-cubes'
		}
	};

	var edit = {
		name: 'auth.GroupManagement/edit',
		url: '/GroupManagement/edit/:Groupid',
		templateUrl: 'GroupManagement/templates/editGroup.tpl.html',
		controller: 'editGroupManagementCtrl',
		resolve: {
			groups: ['Groupdata', '$stateParams', function(Groupdata, $stateParams){
				return Groupdata.getGroup($stateParams.Groupid).$asObject();
			}]
		},
		data: {
			title: 'Group Edit',
			iconClass: 'fa-cubes'
		}
	};


	$stateProvider
	.state(main)
	.state(edit)

	;

}])

.controller('GroupManagementCtrl', ['$scope', 'Groupdata', 'groups', '$modal', '$rootScope', 'FirebaseRootRef', 'DataModels', 'omniNavSettings', 'initialFirebaseChild', function($scope, Groupdata, groups, $modal, $rootScope, FirebaseRootRef, DataModels, omniNavSettings, initialFirebaseChild) {

	$scope.groups = groups;

	var unwatch = $scope.groups.$watch(function() {
		angular.forEach($scope.groups,function(val,id){
			if( id.indexOf('$')!==0){
				Groupdata.getNumberOfMembers(id).then(
					function(ok){
						$scope.groups[id].membersIn = ok;
					}
				);
				var userName = DataModels.getNameAttr('User', val.User );
				userName.then(
					function(ok){
						$scope.groups[id].User = ok;
					}
				);
			}
		});
	});

	$scope.deleteGroup = function(groupID) {
		var groupDelete = $scope.$new();
		groupDelete.groupID = groupID;

		groupDelete.closeDialog = function(){
			instance.close();
			groupDelete.$destroy();
		};

		var instance = $modal.open({
			scope: groupDelete,
			templateUrl: 'GroupManagement/templates/deleteGroup.tpl.html'
		});

		groupDelete.deleteGroup = function(groupID){
			Groupdata.deleteGroup(groupID);
			DataModels.deleteItem('Groups',groupID);
			groupDelete.closeDialog();
		};

		groupDelete.closeDialog = function(){
			instance.close();
			groupDelete.$destroy();
		};
	};

	$scope.totalMembers = function(item){
		if (typeof item == "undefined"){
				return 0;
		}
		else{
			return Object.keys( item ).length;
			}
	};

	$scope.addGroupDialog = function(){
		var addLoadScope = $scope.$new();
		var instance = $modal.open({
			scope: addLoadScope,
			templateUrl: 'GroupManagement/templates/addGroup.modal.tpl.html'
		});


		$rootScope.$on("logout:request", function(user) {
			instance.close();
			addLoadScope.$destroy();
		});


		addLoadScope.closeGroupDialog = function(){
			instance.close();
			addLoadScope.$destroy();
		};

		addLoadScope.save = function(obj){
			// build query object that will be need to fetch data
			var user = $rootScope.loginService.getCurrentUser();
			if (user) {
				$scope.newObj = {
					"Name": obj,
					"User": user.uid,
					"lastModified": (new Date()).getTime()
				};

				var grpsRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models/Groups/data');

				grpsRef.push($scope.newObj);

			}
			addLoadScope.closeGroupDialog();
		};

	};



}])


.controller('editGroupManagementCtrl', ['$scope', 'Groupdata', '$modal', '$rootScope', 'FirebaseRootRef', 'groups', 'DataModels', '$stateParams', 'Schedules', '$q', 'es', 'initialFirebaseChild', function($scope, Groupdata, $modal, $rootScope, FirebaseRootRef, groups, DataModels, $stateParams, Schedules, $q, es, initialFirebaseChild) {

	$scope.pendingSave = false;
	$scope.changesPending = [];
	$rootScope.$on('changesPending', function (evt, changesPending) {

		$scope.pendingSave = true;
		$scope.changesPending.push(changesPending);
	});
	// get all of the sites  ** this could be dangerous if a lot of sites exist
	$scope.siteNames = DataModels.getModelAngularFireRef('Site').$asObject();
	$scope.siteNames.$loaded().then(
		function(){
			$scope.addedsite = {};
			$scope.sightsassigned = {};
			$scope.addedSchedule = {};

			angular.forEach($scope.siteNames, function(val, id){
				//Remove all unecessary information
				
				if(id.indexOf("$")!==0){
					if (typeof val.groups == "undefined"){
						$scope.addedsite[id] = {Name: val.Name, ID: id, Groups:[]};
					} else {
						$scope.addedsite[id] = {Name: val.Name, ID: id, Groups:val.Groups};
					}
				}
			});

			// gets the groups from the resolve object in the config at the top of this file
			$scope.groups = groups;
			// pulls back all the schedules
			$scope.updateSchedulesData = function(){
				Schedules.allSchedules().then(
					function(success){
						$scope.schedules = success;
					}
				);
			};

			$scope.Groupid = $stateParams.Groupid;

			$scope.updateSchedulesData();
			$scope.updateScheduleList = function(){
				// this gets the schedules that are in the group
				Groupdata.getGroupScheduleData($stateParams.Groupid).then(
					function(success){
						$scope.scheduleList = success;
						angular.forEach($scope.scheduleList, function(val, id){
							$scope.addedSchedule[id] = {Name: val.Name, ID: id, Groupid: $scope.Groupid};
						});
					}
				);
			};

			$scope.updateScheduleList();

			$scope.addSchedule = function(schedId, schedule) {

				$scope.pendingSave = true;
				/*
					INPUT: schedId, schedule (the full schedule object)
					RESULT: Add a Schedule to a Group and add to the group attr in the schedule object
				*/
				var obj = {Name: schedule.Name, ID: schedId, Groupid: $scope.Groupid};
				if( typeof $scope.groups.schedules == 'undefined'){
					$scope.groups.schedules = {};
				}
				// make sure group has schedule
				$scope.groups.schedules[schedId] = obj;
				// update the right side

				$scope.addedSchedule[schedId] = (obj);

				// make sure the schedule knows what it is a part of
				if(typeof $scope.schedules[schedId].Groups == "undefined") {
					$scope.schedules[schedId].Groups = [];
				}
				$scope.schedules[schedId].Groups.push($stateParams.Groupid);
			};

			$scope.removeSchedule = function(id) {
				$scope.pendingSave = true;
				/*
					INPUT: scheduleID,
					RESULT: removes the schedule id in the group (scheduleList) and from the group attr in the schedule object
				*/
				var removeRef = Groupdata.getGroupScheduleRef($stateParams.Groupid).child(id);
				//removeRef.remove();
				var updateSchedRef = Schedules.getScheduleGroupRef(id);
				//updateSchedRef.remove();
				delete $scope.schedules[$scope.addedSchedule[id].ID].group;
				// make sure group has schedule
				delete $scope.groups.schedules[$scope.addedSchedule[id].ID];

				delete $scope.addedSchedule[id];
			};

			$scope.groupSaveDialog = function(event){
				var groupSave = $scope.$new();

				var instance = $modal.open({
					scope: groupSave,
					templateUrl: 'GroupManagement/templates/savepopup.modal.tpl.html'
				});

				$rootScope.$on("logout:request", function(user) {
					instance.close();
					angularddPointTypeScope.$destroy();
				});

				groupSave.cancelDialog = function(){
					instance.close();
					location.reload();
				};

				groupSave.closeDialog = function(){
					instance.close();
					groupSave.$destroy();
				};

				groupSave.save = function(){

				//Add Schedule to Groups on Click of save button
				Groupdata.addScheduletoGroup($stateParams.Groupid, $scope.addedSchedule);

				//Add Sites to Groups on Click of save button
				Groupdata.setSitesToGroup($stateParams.Groupid, $scope.sightsassigned);

				//Add Group in all selected Sites
				Groupdata.setGroupToSites($stateParams.Groupid, $scope.sightsassigned);

				//Remove Group from all removed Sites
				Groupdata.removeGroupFromRemovedSites($scope.removedGroupSites);

				$scope.pendingSave = false;
				$scope.changesPending = [];
				groupSave.closeDialog();
				//groupSave.reloadpage();
				};
			};

			/*----Add a Site to a Group---*/


			$scope.updateGroupMemberData = function(){
				Groupdata.getGroupMemberData($stateParams.Groupid).then(
					function(success){
						$scope.membersRef = success;
						//used sightsassigned to that variable can be edited.
						$scope.sightsassigned = $scope.membersRef;
						//make sure sightsassined is not null
						if ($scope.sightsassigned == null){
						$scope.sightsassigned = {};
						}

					}
				);
			};

			$scope.updateGroupMemberData();

			$scope.addSite = function(siteID, site) {
				$scope.pendingSave = true;
				/*
					INPUT: siteID, site (complete object)
					RESULT: add the site id and name as a member to the current group
				*/

				$scope.sightsassigned[siteID] = {"name":site.Name, "id": site.ID, "Group":$stateParams.Groupid};

				if ($scope.removedGroupSites[$stateParams.Groupid] && $scope.removedGroupSites[$stateParams.Groupid][siteID]) {
					delete $scope.removedGroupSites[$stateParams.Groupid][siteID];
				}

			};

			$scope.removedGroupSites = {};
			$scope.removeSite = function(groupid, siteid) {
				$scope.pendingSave = true;
				/*
					INPUT: id, siteid
					RESULT: remove the member from the group and remove the Groups attr from the site
				*/

				delete $scope.sightsassigned[siteid];
				$scope.removedGroupSites[groupid] = ($scope.removedGroupSites[groupid] ? $scope.removedGroupSites[groupid] : {});
				$scope.removedGroupSites[groupid][siteid] = true;

			};

		}
	);

	//global point type elastic search
	$scope.populateCommandablePointTypes = function(){
		var deferred = $q.defer();
		var searchObj = {
			index: es.getIndexName(),
			type: 'PointType',
			fields: [
					'editorOptions.binarylist',
					'editorOptions.list',
					'editorOptions.type',
					'Name'
					],
			explain: false,
			lowercaseExpandedTerms: false,
			body: {
				size: 50000,
				sort: [ "Name.raw" ],
				query: {
					filtered: {
						filter: {
							bool: {
								must: [{ term: { global: true } }]
							}
						}
					}
				}
			}
		};

		es.get().search(searchObj)
			.then(
				function(resp) {
					$scope.commandablePointTypes = [];
					if (resp.hits.hits) {
						var thisGroupObj = Groupdata.getGroup($stateParams.Groupid).$asObject();
						thisGroupObj.$loaded().then(function(groupData){
							resp.hits.hits.forEach(function (hit) {
								var modelData = {};
								modelData.name = hit.fields.Name[0];
								modelData.editorOptions = {};
								modelData.editorOptions.type = hit.fields['editorOptions.type'][0];
								if(hit.fields['editorOptions.list']){
									modelData.editorOptions.list = hit.fields['editorOptions.list'];
								}
								if(hit.fields['editorOptions.binarylist']){
									modelData.editorOptions.binarylist = hit.fields['editorOptions.binarylist'];
								}
								modelData.id = hit._id;
								if (typeof groupData.pointTypeValues !== 'undefined' && typeof groupData.pointTypeValues[hit._id] !== 'undefined') {
									modelData.commandPointValue = groupData.pointTypeValues[hit._id];
									if (modelData.editorOptions.type === 'binary') {
										if (modelData.commandPointValue.value === 0) {
											modelData.commandPointValue.value = 'Off';
										} else if (modelData.commandPointValue.value === 1) {
											modelData.commandPointValue.value = 'On';
										}
									}	
								}
								$scope.commandablePointTypes.push(modelData);
							});
						}).catch(function(error) {
							
						});
						deferred.resolve($scope.commandablePointTypes);
					} else {
						deferred.reject();
					}
				},
				function(err) {
					deferred.reject(err);
				}
			);
		return deferred.promise;
	};

	$scope.commandablePointTypesLoading = true;

	// call to populate commandable point types
	$scope.populateCommandablePointTypes().then(function(commandablePointTypes){
		$scope.commandablePointTypesLoading = false;
	});

	$scope.pointTypePopupDialog = function (id, pointTypeId, name, pointTypeData) {

		$scope.auth = $rootScope.loginService.getCurrentUser();
		//$scope.auth = $firebaseSimpleLogin(FirebaseRootRef);

		var pointTypePopupScope = $scope.$new();
		$scope.pointTypeData = pointTypeData;
		pointTypePopupScope.name = name;
		pointTypePopupScope.command = {};
		if(pointTypeData.commandPointValue){
			pointTypePopupScope.command.resetValue = pointTypeData.commandPointValue.value;
			pointTypePopupScope.command.resetAfter = pointTypeData.commandPointValue.resetAfter;
			var now = new Date().getTime();
			
			var expiresIn = pointTypeData.commandPointValue.time + pointTypeData.commandPointValue.resetAfter * 60 * 1000 - now;
			
			pointTypePopupScope.expires = false;
			pointTypePopupScope.confirm = false;
					
			if(expiresIn > 0){
				
				pointTypePopupScope.expires = true;		
				pointTypePopupScope.overRideExpiresIn = Math.ceil(expiresIn / 60000);
			}	

		}
		pointTypePopupScope.editorOptions = pointTypeData.editorOptions;

		var instance = $modal.open({
			scope: pointTypePopupScope,
			templateUrl: 'GroupManagement/templates/pointTypePopup.tpl.html'
		});

		pointTypePopupScope.closeDialog = function () {
			instance.close();
			pointTypePopupScope.$destroy();
		};

		pointTypePopupScope.timedOverride = false;
		
		

		pointTypePopupScope.openOverride = function(){
					pointTypePopupScope.timedOverride = true;
					pointTypePopupScope.viewName = 'Timed Override';
				};
		pointTypePopupScope.backToCommand = function(){
					pointTypePopupScope.timedOverride = false;
					pointTypePopupScope.viewName = 'Back to Command';
					pointTypePopupScope.expires = false;
					pointTypePopupScope.command.resetAfterUnits = null;
					pointTypePopupScope.command.resetAfterValue = null;
			};

		pointTypePopupScope.editorTemplate = function () {
			if(pointTypePopupScope.editorOptions.type){
				return 'CommandPoint/editorType/' + pointTypePopupScope.editorOptions.type + '.tpl.html';
			}
			else{
				return 'CommandPoint/editorType/setpoint.tpl.html';
			}
		};
		
		$scope.editorOptionName = '';

		if(pointTypePopupScope.editorOptions.type == 'binary'){
			$scope.editorOptionName = 'On/Off';
		}else if (pointTypePopupScope.editorOptions.type == 'toggle'){
			$scope.editorOptionName = 'Toggle';
		}else{
			$scope.editorOptionName = '';
		}

		pointTypePopupScope.newCommand = function(c,v,toggle){
			pointTypePopupScope.confirm = true;
			$scope.c = c;
			$scope.v = v;
			$scope.toggle = toggle;
		};

		pointTypePopupScope.commandGroupPoint = function(){
			
			if( typeof $scope.c != 'undefined' && typeof $scope.v != 'undefined' && typeof $scope.toggle != 'undefined'){
				pointTypePopupScope.sendCommand($scope.c,$scope.v,$scope.toggle);
			} else if (typeof $scope.c != 'undefined' && typeof $scope.v != 'undefined'){
				pointTypePopupScope.toggleValue($scope.c,$scope.v);
			} else {
				pointTypePopupScope.save($scope.c);
			}
		};

		pointTypePopupScope.save = function (c) {
			pointTypePopupScope.sendCommand(c, c.value, false);
		};
		pointTypePopupScope.toggleValue = function (c, v) {
			pointTypePopupScope.sendCommand(c, v, true);
		};
		pointTypePopupScope.sendCommand = function (commandPointValue, v, toggle) {
			if(typeof toggle === 'undefined'){	//In case of binary type
				toggle = false;
				commandPointValue.resetValue = (v === 0 ? 1 : 0);
			}
		
			if(!toggle){
				toggle = false;
			}
			var resetValue = commandPointValue.resetValue;
			var resetAfter = (commandPointValue.resetAfterValue * 1) * (commandPointValue.resetAfterUnits * 1);
			
			commandPointValue = v;
			$scope.loading = true;
			if ($scope.userId) {
				$scope.pushCommandValue(commandPointValue, toggle, resetValue, resetAfter);
			} else {

				if ($scope.auth) {
					$scope.userId = $scope.auth.uid;
					$scope.pushCommandValue(commandPointValue, toggle, resetValue, resetAfter);
				}
			}
		};
	
		$scope.IntervalRanges = [];
		$scope.populateArray = function(amt){
			$scope.IntervalRanges = [];
			for(var i=1;i<amt;i++){
				$scope.IntervalRanges[i] = i;
			}
		};
		$scope.checkValues = function(val){
			
			if( val.toString() == '1'){
				
				$scope.IntervalRanges.splice(0, 5);
			} else {
				$scope.populateArray(100);
			}
			
		}; 
		$scope.populateArray(100);

		

		$scope.clearOverride = function (commandPointValue){
			$scope.clearing = true;
			Groupdata.getGroupMemberData($scope.Groupid).then(function(sites){
				var groupSites = [];
				angular.forEach(sites,function(site,id) {
					groupSites.push(site.id);
				});

				var searchObj = {
					index: es.getIndexName(),
					type: 'Point',
					explain: false,
					lowercaseExpandedTerms: false,
					body: {
						size: 50000,
						sort: [ "Name.raw" ],
						query: {
							filtered: {
								filter: {
									bool: {
										must: [{ terms: { Site: groupSites } }]
									}
								}
							}
						}
					}
				};
				es.get().search(searchObj).then(function(resp) {
					if (resp.hits.hits) {
						resp.hits.hits.forEach(function (hit, index) {
							if (hit._source.PointType !== pointTypeId) { return; }
							var point = hit._source;
							point._id = hit._id;
							DataModels.createAudit('Point', $scope.command, point._id, $scope.userId, 'Clear Override', 'Commanded Point');
							DataModels.clearOverride(hit._source.Gateway, point._id);
						});
					}	
					$scope.clearing = false;
					pointTypePopupScope.closeDialog();
				});
				var thisGroupObj = Groupdata.getGroup($scope.Groupid).$asObject();
				thisGroupObj.$loaded().then(function (groupData) {
					if (typeof groupData.pointTypeValues === 'undefined') {
						groupData.pointTypeValues = {};
					} 
					groupData.pointTypeValues[pointTypeId] = {};
					groupData.pointTypeValues[pointTypeId].value = $scope.pointTypeData.commandPointValue.value;
					delete $scope.pointTypeData.commandPointValue.resetAfter;						

					thisGroupObj.$save().then(function (ref) {
						if (ref.key() === thisGroupObj.$id) {
							if (typeof $scope.commandablePointTypes !== 'undefined' && typeof $scope.commandablePointTypes[id] !== 'undefined') {

								if (typeof $scope.commandablePointTypes[id].editorOptions.type !== 'undefined' && $scope.commandablePointTypes[id].editorOptions.type === 'binary') {
									if (commandPointValue === 0) {
										$scope.commandablePointTypes[id].commandPointValue.value = 'Off';
									} else if (commandPointValue === 1) {
										$scope.commandablePointTypes[id].commandPointValue.value = 'On';
									}
								} else {
									$scope.commandablePointTypes[id].commandPointValue.value = $scope.pointTypeData.commandPointValue.value;
								}
							}
						} else {
							
						}
					}, function (error) {
						
					});				
				});	
			});					
		};

		$scope.pushCommandValue = function (commandPointValue, toggle, resetValue, resetAfter) {
			if(typeof commandPointValue == 'undefined'){
				$scope.loading = false;
				pointTypePopupScope.closeDialog();				
				return;
			}			
			Groupdata.getGroupMemberData($scope.Groupid).then(function(sites){

				var groupSites = [];
				angular.forEach(sites,function(site,id) {
					groupSites.push(site.id);
				});

				var searchObj = {
					index: es.getIndexName(),
					type: 'Point',
					explain: false,
					lowercaseExpandedTerms: false,
					body: {
						size: 50000,
						sort: [ "Name.raw" ],
						query: {
							filtered: {
								filter: {
									bool: {
										must: [{ terms: { Site: groupSites } }]
									}
								}
							}
						}
					}
				};

				es.get().search(searchObj).then(function(resp) {
					if (resp.hits.hits) {
						var gatewayIDs = {};
						resp.hits.hits.forEach(function (hit, index) {
							if (hit._source.PointType !== pointTypeId) { 
								return; 
							}
							var point = hit._source;
							point._id = hit._id;

							if (toggle){
								if ( 0 === point.value){
									commandPointValue = 1;
								}
								else{
									commandPointValue = 0;
								}
							}

							var path = point.Path;
							path = path.replace(/\ /,'%20');
							$scope.command = {
								'pointId': point._id,
								'pointCommandType': 'Override',
								'priority': 10,
								'path': path,
								'userId': $scope.userId,
								'time': Firebase.ServerValue.TIMESTAMP,
								'value': commandPointValue
							};

							if( point.cmdAlias){
								// this is required for savvy points
								$scope.command.cmdAlias = point.cmdAlias;
							}

							if(resetAfter > 0){
								$scope.command.resetAfter = resetAfter;
								$scope.command.resetValue = resetValue;
							}
							
							DataModels.createAudit('Point', $scope.command, point._id, $scope.userId, 'Update', 'Commanded Point');
							if( typeof gatewayIDs[hit._source.Gateway] == 'undefined'){
								gatewayIDs[hit._source.Gateway] = {};
							}
							var d = new Date();
							var commandQueueRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('commandQueue').child(hit._source.Gateway);
							gatewayIDs[hit._source.Gateway]['grpCmd_'+d.getTime()+'_'+index] = $scope.command;
							DataModels.setModelStatus('Point', 'Status', point._id, 'Queued');
						});

						angular.forEach(gatewayIDs, function(val, id){		
							var commandQueueRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('commandQueue').child(id);							
							commandQueueRef.update(val, function (err) {
								$scope.$apply();
							});
						});

						var thisGroupObj = Groupdata.getGroup($scope.Groupid).$asObject();
						thisGroupObj.$loaded().then(function(groupData){
							if (typeof groupData.pointTypeValues === 'undefined') {
								groupData.pointTypeValues = {};
							} 
							groupData.pointTypeValues[pointTypeId] = {};
							if(!toggle){
								groupData.pointTypeValues[pointTypeId].value = commandPointValue;
							}
							if (typeof $scope.commandablePointTypes[id].editorOptions.type !== 'undefined' && $scope.commandablePointTypes[id].editorOptions.type === 'binary') {
									groupData.pointTypeValues[pointTypeId].value = commandPointValue === 0 ? 'Off' : 'On';
							}
							
							if(resetAfter > 0){
								if(!toggle){
									groupData.pointTypeValues[pointTypeId].resetValue = resetValue;
								}
								groupData.pointTypeValues[pointTypeId].resetAfter = resetAfter;
								groupData.pointTypeValues[pointTypeId].time = Firebase.ServerValue.TIMESTAMP;
								if(!$scope.pointTypeData.commandPointValue){
									$scope.pointTypeData.commandPointValue = {};
								}								
								$scope.pointTypeData.commandPointValue.resetAfter = resetAfter;										
								$scope.pointTypeData.commandPointValue.resetValue = resetValue;
								$scope.pointTypeData.commandPointValue.time = new Date().getTime();								
							}
							thisGroupObj.$save().then(function(ref) {
								console.log("ref", ref);
								if(ref.key() === thisGroupObj.$id){
									if(typeof $scope.commandablePointTypes !== 'undefined' && typeof $scope.commandablePointTypes[id] !== 'undefined'){
										if(typeof $scope.commandablePointTypes[id].commandPointValue == 'undefined'){
											$scope.commandablePointTypes[id].commandPointValue = {};
										}
										
										$scope.commandablePointTypes[id].commandPointValue.value = commandPointValue;
										console.log(commandPointValue);
										if (typeof $scope.commandablePointTypes[id].editorOptions.type !== 'undefined' && $scope.commandablePointTypes[id].editorOptions.type === 'binary') {
											if( typeof $scope.commandablePointTypes[id].editorOptions.binarylist != 'undefined' ){
												if (commandPointValue === 0) {
													$scope.commandablePointTypes[id].commandPointValue.value = $scope.commandablePointTypes[id].editorOptions.binarylist[0];
												} else if (commandPointValue === 1) {
													$scope.commandablePointTypes[id].commandPointValue.value = $scope.commandablePointTypes[id].editorOptions.binarylist[1];
												}
											}

										}
									}

								}else{

								}
							}, function(error) {
								
							});
						}).catch(function(error) {
							
						});
					}
					$scope.loading = false;
					pointTypePopupScope.closeDialog();
				}).catch(function(error) {
					
					$scope.loading = false;
					pointTypePopupScope.closeDialog();
				});
			}).catch(function(error) {
				
				$scope.loading = false;
				pointTypePopupScope.closeDialog();
			});
		};
	};
}
])
;
