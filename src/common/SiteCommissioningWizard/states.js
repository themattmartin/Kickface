angular.module('omniboard.SCW.states', [ ])

.config(['$stateProvider', function($stateProvider) {
	var SCWEdit = {
		name: 'auth.SCWEdit',
		url: '/SiteCommissioningWizard/edit/:name',
		templateUrl: 'SiteCommissioningWizard/templates/index.tpl.html',
		controller: 'SWCCtrl',
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}],
			locks: ['Locks', function(Locks) {
				return Locks.verify();
			}]
		},
		data: {
			dataModelName: "default"
		}
	};

	var SCWList = {
		name: 'auth.SCWList',
		url: '/SiteCommissioningWizard',
		templateUrl: 'SiteCommissioningWizard/templates/list.tpl.html',
		controller: 'SCWListCtrl',
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			dataModelName: "default"
		}
	};	

	$stateProvider
		.state(SCWEdit)
		.state(SCWList)
	;
}])

.controller('SCWListCtrl', ['$scope', 'Verify', '$state', 'DataModels', '$firebase', 'FirebaseRootRef', '$modal', '$rootScope', '$filter', '$q', '$timeout', '$http', 'firebaseManager', 'initialFirebaseChild', function($scope, Verify, $state, DataModels, $firebase, FirebaseRootRef, $modal, $rootScope, $filter, $q, $timeout, $http, firebaseManager, initialFirebaseChild) {
	$scope.loading = false;
	$scope.activeStep = 1;
	$scope.selectedItem = 0;
	$scope.filtered = null;
	$scope.verifyInProgress = false;
	$scope.search = null;
	$scope.searchSecondary = null;
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.deviceTypes = DataModels.getDeviceTypes().$asObject();
	$scope.pointTypes = DataModels.getPointTypes().$asObject();
	$scope.remainingPoints = 1000;
	$scope.remainingDevices = 0;
	$scope.discoveryResults = {};

	$scope.getCount = function(item) {
		if( typeof $scope.discoveryResults[$scope.selectedModelID][item] != 'undefined'){
			if( item == 'Device'){
				return Object.keys( $scope.discoveryResults[$scope.selectedModelID][item] ).length ;
			} else {
				var counter = 0;

				angular.forEach($scope.discoveryResults[$scope.selectedModelID][item],function(val,id){
					if( val && val.complete === false ){
						counter += 1;
					}
				});
				return counter;
			}
		} else {
			return 0;
		}
	};

	$scope.pickItemToWork = function(id){
		
		$scope.selectedItem = id;
		$scope.selectedModelID = $scope.itemsPending[$scope.selectedItem].$id;
		$scope.incActiveStep();
	};

	$scope.reserveItem = function() {
		var deferred = $q.defer();
	};
	$scope.getPendingStatusData = function(model){
		$scope.selectedModelName = model;
		$scope.loading = true;
		var data = Verify.getPendingStatusByName(model, 'Pending Verification');
		var discoveryResults = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child("discoveryResults")).$asObject();
		discoveryResults.$loaded().then(
			function(data){
				data.forEach(function(discoveryResult, name){
					$scope.discoveryResults[name] = discoveryResult;
				});
			}
		);

		data.then(
			function(success){
			
				var refs = [];
				angular.forEach(success,function(val,id){
					var refName = 'dataItems/models/'+model+'/data/'+val._id;
					var ref = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child(refName)).$asObject();
					ref.$loaded().then(
						function(data) {
							
							data.$id = ref.$id;
							data.$path = refName;
							data.$remove = function(path) {		
								FirebaseRootRef.child(initialFirebaseChild.get()).child(path).remove();
							};
							refs.push(data);
							//ref.$destroy();
						}
					);
					//refs.push(  );
				});
				$scope.itemsPending = refs;
				$scope.activeStep = 2;
				$scope.loading = false;
				
			},function(err){
				
			}
		);
	};
	$scope.updateAll = function(type) {
		$scope.verifyAllInProgress = true;
		var promises = [];
		var promise;

		$timeout(function() { 

			angular.forEach($scope.filteredData, function(val,id) {
				promises.push($scope.verify(val.Name, val.Path, type, $scope.selectedItem, id, 'Point', val.Device,false, val));

				var continueLoop = true;
				angular.forEach( $scope.discoveryResults[$scope.selectedModelID].Point, function(data,key){
					if( continueLoop ){
						if( val && data && ( data.Path === val.Path) ){
							promises.push(firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('/discoveryResults').child($scope.selectedModelID).child('/Point/'+key)).$update({complete:true}));
							$scope.discoveryResults[$scope.selectedModelID].Point[key].complete = true;
							continueLoop = false;
						}
					}
				});
			});

			$scope.filteredData = $scope.discoveryResults[$scope.selectedModelID].Point;
			promise = $q.all(promises);
			promise.then(
				function() {
					$scope.verifyAllInProgress = false;
				},
				function(err) {
					$scope.verifyAllInProgress = false;
				}
			);
		}, 100);

		return promise;
	};
	$scope.deleteAll = function(type){
		$scope.deleteAllInProgress = true;
		var promises = [];
		var promise;

		$timeout(function() {
			angular.forEach($scope.filteredData, function(val,id){
				angular.forEach( $scope.discoveryResults[$scope.selectedModelID].Point, function(data,key){
					if( val && data && (data.Path === val.Path) ){
						promises.push(firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('/discoveryResults').child($scope.selectedModelID).child('/Point/'+key)).$update({complete:true}));
						$scope.discoveryResults[$scope.selectedModelID].Point[key].complete = true;
						$scope.remainingPoints--;
					}
				});
			});

			$scope.filteredData = $scope.discoveryResults[$scope.selectedModelID].Point;
			promise = $q.all(promises);
			promise.then(
				function() {
					$scope.deleteAllInProgress = false;
				},
				function(err) {
					$scope.deleteAllInProgress = false;
				}
			);
		}, 100);

		return promise;		
	};
	$scope.primaryFilter = function(searchPhrase) {
		$scope.primarySearchPhrase = searchPhrase;
		$scope.searchInWait = true;
		//$scope.searchInProgress = false;

		if ($scope.primaryFilterPromise) {
			$timeout.cancel($scope.primaryFilterPromise);
		}

		$scope.primaryFilterPromise = $timeout(function() {
			delete $scope.primaryFilterPromise;
			$scope.searchInWait = false;
			$scope.searchInProgress = true;

			if( $scope.filteredData ){
				$scope.filteredData = null;
			}

			var filteredPoints = {};
			angular.forEach($scope.discoveryResults[$scope.selectedModelID].Point,function(point,key) {
				if (point.complete !== true) {
					point['Key'] = key;
					filteredPoints[key] = point;
				}
			});

			if( searchPhrase ) {
				$scope.filteredData = $filter('searchObject')(filteredPoints, {Name: searchPhrase, Path: searchPhrase, Value: searchPhrase, Key: searchPhrase});
			} else {
				$scope.filteredData = angular.copy(filteredPoints);
			}

			$scope.searchInProgress = false;
		},300);
	};
	$scope.secondaryFilter = function(searchPhrase) {
		$scope.secondarySearchInWait = true;
		//$scope.searchInProgress = false;

		if ($scope.secondaryFilterPromise) {
			$timeout.cancel($scope.secondaryFilterPromise);
		}

		$scope.secondaryFilterPromise = $timeout(function() {
			delete $scope.secondaryFilterPromise;
			if( searchPhrase ) {
				$scope.secondarySearchInWait = false;
				$scope.secondarySearchInProgress = true;

				$scope.filteredData = $filter("searchObject")($scope.filteredData, {Name: searchPhrase, Path: searchPhrase, Value: searchPhrase, Key: searchPhrase});
				$scope.secondarySearchInProgress = false;
			} else {
				$scope.primaryFilter($scope.primarySearchPhrase);
			}
		},300);
	};
	$scope.verify = function(name,path,itemType,itemId,pointId,type,deviceID,doRemoval,data) {
		data.verifyInProgress = true;
		//var startTime = new Date().getTime();
		var deferred = $q.defer();
		
		deferred.promise.then(
			function() {
				if( doRemoval || type == 'Device') {
					$scope.remove(itemId,pointId,type,false);
				}
				data.verifyInProgress = false;
				data.hasError = false;
				//var endTime = new Date().getTime();
				
			},
			function(err) {
				data.verifyInProgress = false;
				data.hasError = true;
				//var endTime = new Date().getTime();
							
			}
		);

		//create the point	
		var obj = {
			Name: name,
			Path: path,
			Site: $scope.itemsPending[$scope.selectedItem].Site,
			Gateway: $scope.itemsPending[$scope.selectedItem].$id			
		};

		if( type != 'Device'){
			obj.Device = deviceID;
			obj.Value = data.Value;
		}

		obj[type+'Type'] = itemType;

		var creating = DataModels.createItem(type, obj);
		
		if( type == 'Point') {
			creating.then(
				function(success){

					

					DataModels.addMappingItem($scope.selectedModelName,$scope.itemsPending[$scope.selectedItem].$id,path,success).then(
						function() {
							$scope.remainingPoints--;
							deferred.resolve();
						},
						function(err) {
							deferred.reject(err);
						}
					);
				},
				function(err){
					deferred.reject(err);
				}
			);
		} else {
			// update all points that match the device name with the correct device
			creating.then(
				function(success){
					$scope.remainingDevices--;

					var todo = [];


					angular.forEach($scope.discoveryResults[$scope.selectedModelID].Point,function(val,id) {
						
						if( val.devicePath == path ) {
							
							todo.push({ 
								path: '/discoveryResults/' +$scope.selectedModelID+'/Point/'+id + "/Device",
								value: success
							});
							$scope.discoveryResults[$scope.selectedModelID].Point[id].Device = success;

						}
					});
					
					angular.forEach(todo,function(item,index) {
						FirebaseRootRef.child(initialFirebaseChild.get()).child(item.path).set(item.value);
					});

					deferred.resolve();
					/*
					//Firebase.goOffline();
					$http.post("/processPaths", todo).success(function(data,status) {
						//Firebase.goOnline();
					});
					*/


				},
				function(err){
					deferred.reject(err);
				}
			);
		}

		return deferred.promise;
	};
	$scope.remove = function(itemId,pointId,type,confirmMsg){

		
		var devicePathToDelete = null;
		if( confirmMsg ){
			var answer = confirm("Are you sure you want to delete this item?");
			if (answer){
				if( type == 'Device'){
					// delete associated points
					devicePathToDelete = angular.copy($scope.filteredData[pointId].Path); 
					angular.forEach($scope.discoveryResults[$scope.selectedModelID].Point,function(val,id){
						if( val && (val.devicePath === devicePathToDelete) ) {
							$scope.discoveryResults[$scope.selectedModelID].Point[id].complete = true;

							var completeRef = '/discoveryResults/' + $scope.selectedModelID +'/Point/'+id;
							firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child(completeRef)).$update({complete:true});

							$scope.remainingPoints--;
						}
					});
					$scope.itemsPending[itemId].$remove('discoveryResults/' + $scope.selectedModelID + '/' +type+'/'+pointId);
					delete $scope.filteredData[pointId];
					$scope.remainingDevices--;
					devicePathToDelete = null;
				} else {
						var completeRef = '/discoveryResults/' + $scope.selectedModelID +'/'+  type +'/'+pointId;
						firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child(completeRef)).$update({complete:true});

						$scope.discoveryResults[$scope.selectedModelID][type][pointId].complete = true;
						$scope.filteredData[pointId].complete = true;
						$scope.remainingPoints--;
				}
			}
		} else {
			if( type == 'Device'){

				// delete associated points
				devicePathToDelete = angular.copy($scope.filteredData[pointId].Path);
				//angular.forEach($scope.discoveryResults[$scope.selectedModelID].Point,function(val,id){
				//	if( val.devicePath === devicePathToDelete){
				//		$scope.discoveryResults[$scope.selectedModelID].Point[id].complete = true;
				//
				//		//$scope.remainingPoints--;
				//	}
				//});
				$scope.itemsPending[itemId].$remove('/discoveryResults/' + $scope.selectedModelID +'/'+type+'/'+pointId);
				delete $scope.filteredData[pointId];
				//$scope.remainingDevices--;
				devicePathToDelete = null;
			} else {

				firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('/discoveryResults/' + $scope.selectedModelID +'/'+ type+'/'+pointId)).$update({complete:true});

				$scope.discoveryResults[$scope.selectedModelID][type].complete = true;
				$scope.filteredData[pointId].complete = true;
				
				//$scope.remainingPoints--;
			}
		}
		$scope.verifyInProgress = false;	
	};
	$scope.incActiveStep = function(){
		$scope.activeStep += 1;
		if( $scope.activeStep == 3){
			$scope.filteredData = $scope.discoveryResults[$scope.selectedModelID].Device;
			$scope.remainingDevices = $scope.getCount('Device');
			$scope.remainingPoints = $scope.getCount('Point');
		} else if( $scope.activeStep == 4){
			$scope.filteredData = $scope.discoveryResults[$scope.selectedModelID].Point;
			$scope.remainingDevices = $scope.getCount('Device');
			$scope.remainingPoints = $scope.getCount('Point');
		}
		
	};
	$scope.addTypeDialog = function(type){
		var addTypeScope = $scope.$new();
		addTypeScope.type = type+"Type";
		addTypeScope.requestedType = type;
		addTypeScope.typeName = {};
		var instance = $modal.open({
			scope: addTypeScope,
			templateUrl: 'SiteCommissioningWizard/templates/modalAddType.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			addTypeScope.$destroy();
		});

		addTypeScope.closeDialog = function(){
			instance.close();	
			addTypeScope.$destroy();
		};

		addTypeScope.save = function(){
			var obj = {Name: addTypeScope.typeName.Name};
			DataModels.createItem(addTypeScope.type,obj);
			addTypeScope.closeDialog();
		};
	};	
	$scope.completeProcess = function(){
		Verify.getStatusByName($scope.selectedModelName, 'Online').then(
			function(success){
				var obj = {};
				obj[$scope.selectedModelName+'Status'] = success.key;
				$scope.itemsPending[$scope.selectedItem].$update(obj);
				$scope.activeStep = 1;
				$scope.selectedModelName = null;
				$scope.itemsPending[$scope.selectedItem].$remove('discoveryResults');
			},function(err){
				
			}
		);	
	};

	//schedules
	$scope.schedules = $firebase(FirebaseRootRef.child('customers/-Jf43oJVLUqsjPf5dF79/application/discoveryResults/-JmtN_IjfCajipZgD9_F/Schedules')).$asArray();

	$scope.scheduleTypeNames = {};
	$scope.scheduleTypes = DataModels.getModelTypes('Schedule').$asObject();
	$scope.scheduleTypes.$loaded().then(function(data) {
		angular.forEach(data, function(val, key) {
			$scope.scheduleTypeNames[val.Name] = key;
		});
	});

	$scope.saveSchedules = function() {
		$scope.schedules.forEach(function(schedule) {
			schedule.type = $scope.scheduleTypeNames[schedule.type.Name];
			console.log('schedule', schedule);
			DataModels.createItem('Schedules', schedule).then(
				function(newItemId){
					console.log('newItemId', newItemId);
				},
				function(err){
					console.error('on saveSchedules.createItem', err);
				}
			);
		});
	};

}])

.controller('SCWCtrl', ['$scope', 'DataModels', '$q', 'Verify', '$rootScope', '$stateParams', '$timeout', 'locks', function($scope, DataModels, $q, Verify, $rootScope, $stateParams, $timeout, locks) {
	$scope.lockData = locks;
		
	$scope.data = Verify.getPendingStatusByName('Gateway', 'Pending Verification');
	// here is where the guts will happen

}])
;