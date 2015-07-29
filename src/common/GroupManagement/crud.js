/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.GroupManagement.crud", [])

/**
* CRUD Wrappers
*/

.factory('Groupdata', ['$firebase', 'es', '$q', '$rootScope', '$filter', 'FirebaseRootRef', 'DataModels', 'initialFirebaseChild', 'firebaseManager', function($firebase, es, $q, $rootScope, $filter, FirebaseRootRef, DataModels, initialFirebaseChild, firebaseManager) {

	return {

		getGroupScheduleRef: function(groupid){
			return this.getGroupsRef().child(groupid).child("schedules");
		},

		getGroupScheduleData: function(groupid){
			//return $firebase(this.getGroupsRef().child(groupid).child("schedules"));
			var deferred = $q.defer();
			var schedRef = this.getGroupScheduleRef(groupid);
			schedRef.once('value', function(data){
				deferred.resolve(data.val());
			});
			return deferred.promise;

		},

		setSitesToGroup: function(groupid, data){
			var ref = this.getGroupsRef().child(groupid).child("sites");
			ref.set(data);
		},

		setGroupToSites: function(groupid, sites) {
			angular.forEach(sites, function(data,siteid) {
				var siteRef = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child("/dataItems/models/Site/data/"+siteid));
				var siteObj = siteRef.$asObject();
				siteObj.$loaded().then(function() {
					var Groups;
					if( typeof siteObj.Groups != 'undefined'){
						Groups = siteObj.Groups.split(',');
					} else {
						Groups = [];
					}
					Groups.push(groupid);
					Groups = Groups.filter(function(elem, pos, self) { return (elem !== '' && self.indexOf(elem) == pos); });
					siteRef.$update({ Groups: Groups.join(',') });
				});
			});
		},

		removeGroupFromRemovedSites: function(removedGroupSites) {
			angular.forEach(removedGroupSites, function(sites,groupid) {
				angular.forEach(sites, function(d,siteid) {
					var siteRef = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child("/dataItems/models/Site/data/"+siteid));
					var siteObj = siteRef.$asObject();
					siteObj.$loaded().then(function() {
						var Groups;
						if( typeof siteObj.Groups != 'undefined'){
							Groups = siteObj.Groups.split(',');
						} else {
							Groups = [];
						}
						Groups.splice(Groups.indexOf(groupid), 1);
						siteRef.$update({ Groups: Groups.join(',') });
					});
				});
			});
		},

		addScheduletoGroup: function(groupid, data){
			var ref = this.getGroupsRef().child(groupid).child("schedules");
			ref.set(data);
		},

		getGroupScheduleRefID: function(groupid, id){
			return firebaseManager.buildRef(this.getGroupsRef().child(groupid).child("schedules").child(id));
		},

		getGroupMemberRef: function(groupid){
			return this.getGroupsRef().child(groupid).child("sites");
		},

		getGroupMemberData: function(groupid){
			var deferred = $q.defer();
			var schedRef = this.getGroupMemberRef(groupid);
			schedRef.once('value', function(data){
				deferred.resolve(data.val());
			});
			return deferred.promise;
		},

		getGroup: function(groupid){
			return firebaseManager.buildRef(this.getGroupsRef().child(groupid));
		},

		getGroupsRef: function() {
			return FirebaseRootRef.child(initialFirebaseChild.get()).child("/dataItems/models/Groups/data");
		},
		deleteGroup: function(id){
			var ref = this.getGroupsRef().child(id);
			ref.remove();
		},
		getGroups: function() {
			var self = this;
			var deferred = $q.defer();
			var groups = firebaseManager.buildRef(this.getGroupsRef()).$asObject();
			groups.$loaded().then(
				function(){
					normalizedGroups = groups;
					angular.forEach(groups, function(val,id){
						if( id.indexOf('$') !== 0 ){

							self.getNumberOfMembers(id).then(
								function(ok){
									normalizedGroups[id].membersIn = ok;
								}
							);

							if( typeof val.User != 'undefined' ){
								var userName = DataModels.getNameAttr('User', val.User);
								userName.then(
									function(ok){
										normalizedGroups[id].User = ok;
									}
								);
							}
						}
					});
					deferred.resolve(normalizedGroups);
				}
			);
			return deferred.promise;
		},
		getNumberOfMembers: function(grp){

			var deferred = $q.defer();
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
									must: [
										{ term: {sites: grp } }
									]
								}
							}
						}
					}
				} 
			};

			es.get().search(searchObj)
				.then(
					function(resp) { 
						deferred.resolve(resp.hits.hits.length);
					},
					function(err) {
						
					}
				)
			;

			return deferred.promise;

		}

	};
}])

;
