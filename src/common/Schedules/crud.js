 /**
* Data Item Module for Omniboard
*/
angular.module("omniboard.Schedules.crud", [])


/**
* Firebase Reference Factory
*/
.factory('SchedulesRef', ['FirebaseRootRef', 'initialFirebaseChild', function(FirebaseRootRef, initialFirebaseChild) {
	return {
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("dataItems/models/Schedules");
		}
	};
}])

/**
* CRUD Wrappers
*/
.factory('Schedules', ['$firebase', 'SchedulesRef', 'es', '$q', '$rootScope', '$filter', 'FirebaseRootRef', 'DataModels', 'firebaseManager', 'initialFirebaseChild', function($firebase, SchedulesRef, es, $q, $rootScope, $filter, FirebaseRootRef, DataModels, firebaseManager, initialFirebaseChild) {
	return {
		names: function(modelName) {
			return firebaseManager.buildRef(SchedulesRef.get().child('data'));
		},
		allSchedules: function(modelName) {
			var deferred = $q.defer();
			var schedRef = SchedulesRef.get().child('data');
			schedRef.once('value', function(data){
				deferred.resolve(data.val());
			});
			return deferred.promise;
		},
		saveDefault: function(data){
			SchedulesRef.get().child('default').update({Days: data});
			var user = $rootScope.loginService.getCurrentUser();
			DataModels.createAudit('Schedules', data, 'default', user.uid, 'Update', 'Updated Schedule');
		},

		addGroupToSchedule: function(schedID, groupData){
			var ref = SchedulesRef.child('data').child(schedID).child('group');
			ref.update(groupData);
		},

		getDefault: function(){
			return firebaseManager.buildRef(SchedulesRef.get().child('default').child('Days'));
		},
		getScheduleRef: function(id){
			return SchedulesRef.get().child('data').child(id);
		},
		getScheduleGroupRef: function(id){
			return SchedulesRef.get().child('data').child(id).child('group');
		},
		getGroupsRef: function() {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("/dataItems/models/Groups/data");
		},
		getScheduleMappingRef: function() {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("/scheduleMapping/");
		},
		getGroups: function() {
			var ref = firebaseManager.buildRef(this.getGroupsRef());
			return ref;
		},
		inactivateSchedule: function(id){
			var self = this;
			var schedRef = self.getScheduleRef(id).child('Inactive');
			schedRef.once('value', function(dataSnap){
				if( dataSnap.val() === false ){

					self.getScheduleRef(id).update({Inactive:true});
					var user = $rootScope.loginService.getCurrentUser();
					DataModels.createAudit('Schedules', '', id, user.uid, 'Update', 'Inactivate Schedule');

				}
			});

		},
		activateSchedule: function(id){
			this.getScheduleRef(id).update({Inactive:false});
			var user = $rootScope.loginService.getCurrentUser();
			DataModels.createAudit('Schedules', '', id, user.uid, 'Update', 'Activate Schedule');
		},

		getExceptionSchedule: function(id, eid){
			var ref = firebaseManager.buildRef(this.getScheduleRef(id).child("exception").child(eid));
			return ref;
		},

		getSchedule: function(id){
			var ref = firebaseManager.buildRef(this.getScheduleRef(id));
			return ref;
		},
		getScheduleList: function(id){
			return firebaseManager.buildRef(SchedulesRef.get().child('list'));
		},
		addNote: function(obj,id){
			var noteRef = this.getScheduleRef(id).child('Notes');
			noteRef.push(obj);

			var user = $rootScope.loginService.getCurrentUser();
			DataModels.createAudit('Schedules', obj, id, user.uid, 'Insert', 'Add Note');

		},
		saveLoad: function(obj){
			SchedulesRef.get().child('loads').add(obj);
			var user = $rootScope.loginService.getCurrentUser();
				DataModels.createAudit('Schedules', obj, '', user.uid, 'Insert', 'Save Load');
		},
		updateLoads: function(loadObj){
			SchedulesRef.get().update({loads: loadObj});
			var user = $rootScope.loginService.getCurrentUser();
			DataModels.createAudit('Schedules', loadObj, '', user.uid, 'Update', 'Update Loads');
		},
		updateLoad: function(loadId, obj){
			SchedulesRef.get().child('loads').child(loadId).update({points:obj});
			var user = $rootScope.loginService.getCurrentUser();
			DataModels.createAudit('Schedules', {points:obj}, loadId, user.uid, 'Update', 'Update Load');
		},
		saveSchedule: function(schedule){
			var deferred = $q.defer();
			var user = $rootScope.loginService.getCurrentUser();
			if (user) {
				schedule.creator = user.uid;
				var schedFBRef = firebaseManager.buildRef(SchedulesRef.get().child('data'));

					schedFBRef.$push(schedule).then(function(ref) {
					var id = ref.key();
					var schedRef = SchedulesRef.get().child('list');
					var obj = {};
					obj[id] = {Name: schedule.Name, mode: schedule.mode};
					schedRef.update(obj, function(err){
						deferred.resolve();
					});

				});
				DataModels.createAudit('Schedules', schedule, '', user.uid, 'Insert', 'Save Schedule');
			}
			return deferred.promise;
		},
		deleteGroupSchedule: function(scheduleId, schedule){
			var deferred = $q.defer();

			FirebaseRootRef.child(initialFirebaseChild.get()).child("/schedules/data").child(scheduleId).remove(function(err){
				if(err){

				} else {
					FirebaseRootRef.child(initialFirebaseChild.get()).child("/schedules/list").child(scheduleId).remove(function(err){
						if(err){

						} else {
							deferred.resolve();
						}
					});
				}
			});

			deferred.resolve();


			return deferred.promise;
		},
		deleteSchedule: function(scheduleid,schedule){
			var deferred = $q.defer();
			var groupRef = this.getGroupsRef();
			var user = $rootScope.loginService.getCurrentUser();
			if (user) {
				schedule.creator = user.uid;
				firebaseManager.buildRef(SchedulesRef.get().child('data').child(scheduleid)).$remove().then(function(ref) {
					firebaseManager.buildRef(SchedulesRef.get().child('list').child(scheduleid)).$remove().then(function(ref) {
						groupRef.once('value', function (dataSnap) {
							angular.forEach(dataSnap.val(), function(val, id){
								angular.forEach(val.schedules, function(schedule, sid){
									if(sid == scheduleid){
										DataModels.getModelItemsRef('Groups').child(id).child('schedules').child(sid).remove();
									}
								});
								angular.forEach(val.sites, function(site, siteId){
									angular.forEach(site.schedules, function(schedule, sid){
										if(sid == scheduleid){
											DataModels.getModelItemsRef('Groups').child(id).child('sites').child(siteId).child('schedules').child(sid).remove();
										}
									});
								});
								deferred.resolve();
							});
						});
						DataModels.createAudit('Schedules', schedule, '', user.uid, 'Delete', 'Deleted '+schedule.Name);
					});
				});

			}

			return deferred.promise;
		},
		saveMarker: function(marker, id){
			var currentTime = new Date(marker.date);
			var splitTime = new Date( marker.time );
			marker.dayNumber = currentTime.getDate();
			var hrs = splitTime.getHours().toString().length <2 ? "0"+splitTime.getHours().toString() : splitTime.getHours().toString();
			var mins = splitTime.getMinutes().toString().length <2 ? "0"+splitTime.getMinutes().toString() : splitTime.getMinutes().toString();
			marker.Time = hrs+":"+mins;
			var markerRef = this.getScheduleRef(id).child('Days').child(currentTime.getDay());
			markerRef.push(marker);
			var user = $rootScope.loginService.getCurrentUser();

				var sched = this.getScheduleRef(id);
				sched.$update({lastModified: Firebase.ServerValue.TIMESTAMP, lastModifiedBy: user.uid}).then(function(){
					sched.$off();
				});

				DataModels.createAudit('Schedules', marker, id, user.uid, 'Update', 'Save Marker');
		},
		updateMarker: function(marker, scheduleID, markerID){
			var currentTime = new Date(marker.date);
			var splitTime = new Date( marker.time );
			var hrs = splitTime.getHours().toString().length <2 ? "0"+splitTime.getHours().toString() : splitTime.getHours().toString();
			var mins = splitTime.getMinutes().toString().length <2 ? "0"+splitTime.getMinutes().toString() : splitTime.getMinutes().toString();
			delete marker.date;
			delete marker.time;
			//$firebase(this.getScheduleRef(scheduleID).child('Days').child(currentTime.getDay()).child(markerID)).$update(marker);
			this.getScheduleRef(scheduleID).child('Days').child(currentTime.getDay()).child(markerID).update(marker);
			var user = $rootScope.loginService.getCurrentUser();

				var sched = this.getScheduleRef(id);
				sched.$update({lastModified: Firebase.ServerValue.TIMESTAMP, lastModifiedBy: user.uid}).then(function(){
					sched.$off();
				});

				DataModels.createAudit('Schedules', marker, scheduleID, user.uid, 'Update', 'Update Marker');

		},
		getLoads: function(){
			return firebaseManager.buildRef(SchedulesRef.get().child('loads'));
		},
		getLoadName: function(id){
			return firebaseManager.buildRef(SchedulesRef.get().child('loads').child(id).child('name'));
		},
		getLoadColor: function(id){
			return firebaseManager.buildRef(SchedulesRef.get().child('loads').child(id).child('color'));
		},
		updateMarkerTime: function(eventKey, eventId, scheduleId, dayDelta, minuteDelta, fullEvent){
			var newDayNumber;
			if( ((eventKey + dayDelta) < 0) ){
				newDayNumber = 0;
			} else if ( ((eventKey + dayDelta) > 6) ) {
				newDayNumber = 6;
			} else {
				newDayNumber = parseInt(eventKey) + parseInt(dayDelta);
			}

			var newTime = new Date(fullEvent.start);
			var hours = newTime.getHours().toString().length<2 ? "0"+newTime.getHours().toString() : newTime.getHours().toString();
			var mins = newTime.getMinutes().toString().length<2 ? "0"+newTime.getMinutes().toString() : newTime.getMinutes().toString();

			var marker = this.getScheduleRef(scheduleId).child('Days').child(eventKey).child(eventId);
			var user;
			if( dayDelta !== 0){
				//move the data in firebase
				var newItem = firebaseManager.buildRef(this.getScheduleRef(scheduleId).child('Days').child(newDayNumber));
				var tempCopy = angular.copy(marker);
				newItem.add(tempCopy);
				marker.remove();

				user = $rootScope.loginService.getCurrentUser();
				DataModels.createAudit('Schedules', tempCopy, scheduleId, user.uid, 'Update', 'Update Marker');

			} else {
				var finalTime = hours+":"+mins;
				marker.update({Time:finalTime});

				user = $rootScope.loginService.getCurrentUser();
				DataModels.createAudit('Schedules', eventId, scheduleId, user.uid, 'Update', 'Update Marker');

			}
		}
	};
}])

;
