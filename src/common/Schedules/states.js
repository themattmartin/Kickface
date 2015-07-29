/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.Schedules.states", ['ui.calendar', 'ui.bootstrap', 'mgcrea.ngStrap.timepicker', 'mgcrea.ngStrap.datepicker', 'angular.filter'])
.filter('range', function() {
	return function(input, total) {
		total = parseInt(total,10);
		for (var i=0; i<total; i++){
			input.push(i);
		}
		return input;
	};
})
/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
var schedules = {
		name: 'auth.schedules',
		abstract: true,
		url: '/schedules',
		templateUrl: 'Schedules/templates/schedules.tpl.html',
		controller: 'SchedulesCtrl',
		data: {
			schedulesName: "default"
		}
};

var scheduleDetail = {
	name: 'auth.schedules.fourMonth',
	parent: schedules,
	url: '/full', 
	templateUrl: 'Schedules/templates/fullView.tpl.html', 
	controller: 'SchedulesFullCtrl',
	authRequired: true , 
	resolve:{
		permissions: ['Perms', function(Perms) {
			return Perms.check();
		}],
		initialSched: [ 'Schedules', '$q', function(Schedules, $q){
			var deferred = $q.defer();
			var list = Schedules.getScheduleList().$asObject();

			list.$loaded().then(
				function(){
					var foundSched = false;
					angular.forEach(list, function(val, id){
						if( foundSched === false){
							if( id.indexOf('$') !== 0){
								//$scope.loadSchedule(id);
								deferred.resolve(id);
								foundSched = true;
							}
						}
					});
				}
			);
			return deferred.promise;

		}],

		pointTypes: ['$q', 'DataModels', 'Settings', function($q, DataModels, Settings){
			var deferred = $q.defer();

			Settings.getSetting('PointLoad','Model').then(
				function(pointLoadDataModel){

					var ptTypes = [];
					var allptTypes = [];
					var pointTypesRef = DataModels.getModelTypes(pointLoadDataModel).$asObject();		
					pointTypesRef.$loaded().then(
					function(event) {
						angular.forEach(event, function(val,id){
							if( id.indexOf('$') !== 0 ){
								var obj = {
									id: id,
									name: val.Name,
									modelTypeName: val.Name,
									model: pointLoadDataModel + 'Type'
									//reversedValue: val.reversedValue
								};
								if(typeof val.editorOptions != 'undefined'){
									obj.editorOptions = val.editorOptions;
								}

								if(typeof val.schedulableLoad != 'undefined' && val.schedulableLoad === true /*&& obj.editorOptions.type == 'binary'*/){
									ptTypes.push(obj);
								}
								allptTypes.push(obj);
							}
						});

						deferred.resolve({allPointTypes: allptTypes, cleanPtTypes: ptTypes, model: pointLoadDataModel});

					});

				}
			);
			return deferred.promise;
		}]

	},
	data: {
		subHeading: "Create a New Type of Data Item",
		title: 'Schedules'
	} 
};

	$stateProvider
		.state(schedules)
		.state(scheduleDetail)
	;
}])


/**
* Controller
*/
.controller('SchedulesCtrl', ['$scope', 'Schedules', '$stateParams', '$state', '$modal', '$rootScope','Perms', 'DataModels','omniNavSettings', function($scope, Schedules, $stateParams, $state, $modal, $rootScope, Perms, DataModels, omniNavSettings) {

	// controller for the parent state
	//omniNavSettings.hide();

}])



.controller('SchedulesFullCtrl', ['$scope', 'Schedules', '$stateParams', '$state', '$modal', '$rootScope', 'DataModels', 'pointTypes', 'initialSched', '$timeout', '$modalStack', 'Firebase', '$q', '$location', '$anchorScroll','es', function($scope, Schedules, $stateParams, $state, $modal, $rootScope, DataModels, pointTypes, initialSched, $timeout, $modalStack, Firebase, $q, $location, $anchorScroll, es) {

	var copyObj = function(obj){
		var newObj = {};
		angular.forEach(obj, function(val,id){
			if( id.indexOf('$') !== 0 ){
				newObj[id] = val;
			}
		});
		return newObj;
	};

	$scope.pendingSave = false;
	$scope.changesPending = [];

	//$scope.pendingSchedChanges = [];

	$scope.schedMappingChanges = function(){
		var pendingSchedChanges = Schedules.getScheduleMappingRef();

		pendingSchedChanges.once('value', function(dataSnap){
			$scope.changes = dataSnap.val();
			$scope.groupCount = 0;
			angular.forEach($scope.changes, function(id, val){
				angular.forEach(id, function(key, data){
					if(key.scheduleGroupID == $scope.scheduleGroupID){
						$scope.groupCount = $scope.groupCount +1;
					}
				});
			});
		});
	};

	$scope.availableModel = pointTypes.model;
	$scope.pointTypes = pointTypes.cleanPtTypes;

	$scope.pointsOriginal = angular.copy(pointTypes.cleanPtTypes);
	$scope.allPointTypes = angular.copy(pointTypes.allPointTypes);

	$rootScope.$on('calendar:add', function (evt, updateData) {
		$scope.schedData = updateData;
		$scope.processEvents(updateData);
	});

	$rootScope.$on('changesPending', function (evt, changesPending) {

		$scope.pendingSave = true;
		$scope.changesPending.push(changesPending);
	});

	$rootScope.$on('calendar:reload', function () {
		$scope.processEvents();
	});

	$rootScope.$on('refreshYearCalendar', function (evt, view) {
		if($scope.selectedView == "year"){
			$scope.returnToView = 'year';
			$scope.toggleLoading();
			$timeout($scope.toggleYear, 1000);
		} else if ($scope.selectedView == "month"){
			$scope.returnToView = 'month';
			$scope.toggleLoading();
			$timeout($scope.toggleMonth, 1000);
		} else if ($scope.selectedView == "week"){
			$scope.returnToView = 'week';
			$scope.toggleLoading();
			$timeout($scope.toggleWeek, 1000);
		}

	});

	$scope.tabs = [
		{ title:'Dynamic Title 1', content:'Dynamic content 1' },
		{ title:'Dynamic Title 2', content:'Dynamic content 2', disabled: true }
	];

	$scope.loadGroupSchedules = function(){
		var deferred = $q.defer();
		var scheduleData = {};
		var data = Schedules.getScheduleList().$asObject();
		data.$loaded().then(
		function(){
			angular.forEach(data, function(item,id){
				item.id = id;
				scheduleData[id] = item;
			});

			//$scope.schedules = scheduleData;
			$scope.schedules = data;
			$scope.groupSchedules = $scope.schedules;
			deferred.resolve();
		});
		return deferred.promise;
	};

	$scope.View = "calendar";
	$scope.viewName = "View Day Slider";
	$scope.selectedView = 'year';

	$scope.expandSchedule = false;
	$scope.expandDescription = false;
	$scope.returnToView = 'year';

	$scope.expandDetails = function(){
		if($scope.expandDescription === false){
			$scope.expandDescription = true;
		}else if($scope.expandDescription === true){
			$scope.expandDescription = false;
		}
	};
	
	$scope.toggleLoading = function(){
		var deferred = $q.defer();

		if($scope.selectedView == 'loading'){
			$scope.selectedView = $scope.returnToView;
		}else{
			$scope.selectedView = 'loading';
		}

		$timeout(function(){
			deferred.resolve();
		}, 1000);
		
		return deferred.promise;
	};

	//--This is the variable that tells the view whether the user is looking at group schedule or local schedules--//
	$scope.schedType = 'group';
	$scope.schedTypeChange = function(){
		
		if($scope.pendingSave === true){
			var pendingSaveScope = $scope.$new();

			var instance = $modal.open({
				scope: pendingSaveScope,
				templateUrl: 'Schedules/templates/pendingChangesModal.tpl.html',
				backdrop: 'static'
			});

			pendingSaveScope.closeError = function(){
					instance.close();
					pendingSaveScope.$destroy();
				};

			pendingSaveScope.yes =function(){
				$scope.schedules = {};
				$scope.eventSources = [];
				$scope.schedData = null;
				$rootScope.$broadcast('refreshYearCalendar');
				if($scope.schedType == 'group'){
					//reset time back to local time
					$rootScope.$broadcast('resetTimeToLocal');
					
					$scope.loadGroupSchedules();	
				}
				$scope.loadSchedule( initialSched );
				$scope.changesPending = [];
				$scope.pendingSave = false;
				pendingSaveScope.closeError();
			};

			pendingSaveScope.no =function(){
				pendingSaveScope.closeError();
				$scope.schedType = 'group';
			};
		}else{
			$scope.pendingSave = false;
			$scope.schedules = {};
			$scope.eventSources = [];
			$scope.schedData = null;
			$scope.schedSite = null;
			$rootScope.$broadcast('refreshYearCalendar');
			$scope.loadSchedule( initialSched );
			$scope.changesPending = [];
			
			if($scope.schedType == 'local'){
				
			}else if($scope.schedType == 'group'){

				//reset time back to local time
				$rootScope.$broadcast('resetTimeToLocal');

				$scope.loadGroupSchedules().then(function(){
					$scope.buildLocalSchedule().then(function(){
						$scope.getSchedulesForGroup();
					});
						
				});
				
			}
			$scope.loadSchedule( initialSched );


		}
	};

	//-This will be tied to the list of all schedules for a site, this will populate the box on the lower left of the first column-//
	$scope.buildLocalSchedule = function(){
		var d=$q.defer();
		var scheduleTypesRef = DataModels.getModelItemsRef('ScheduleType');
		scheduleTypesRef.once('value',function(typeSnap){
			var scheduleFirebaseRef = DataModels.getModelItemsRef('Schedule');
			scheduleFirebaseRef.once('value', function(dataSnap){
				$scope.localSchedules = {};
				angular.forEach(dataSnap.val(), function(data,id){
					if( typeof typeSnap.val()[data.ScheduleType] != 'undefined'){
						data.typeName = typeSnap.val()[data.ScheduleType].Name;

					}
					data.id = id;
					$scope.localSchedules[id] = data;
				});
				d.resolve();
			});
		});
		return d.promise;
	};
	$scope.buildLocalSchedule();
	//get all the schedules for this id
	$scope.getSchedulesForGroup = function(key){
		$scope.addedSchedule = [];
		angular.forEach($scope.localSchedules, function(data,val){
			if( data.scheduleGroupID && (data.scheduleGroupID == key) ){
				data.schedID = val;
				$scope.addedSchedule.push(data);
			}
		});
	};


	$scope.tempSchedules = [];

		
	//$scope.localSchedules = DataModels.getModelItemsRef('Schedule');
	//--this is the variable that needs to be tied to the Group schedule name that is controlling a local schedule--//
	$scope.groupSchedName = '454: All Lights On';

	//--if a local schedule is being controlled by a group schedule this flag needs to be set to true--//
	$scope.hasGroupSched = true;

	//--the view looks at this variable to decide which item to display (schedule in middle column or exceptions in middle column)--//
	$scope.groupView = 'schedules';
	//------------------------------//

	//--these two function toggle the view in the middle column when you click on the buttons labeled "scheduels" and "exceptions"--//
	$scope.viewSchedules = function(){
		$scope.groupView = 'schedules';
	};

	$scope.viewExceptions = function(){
		$scope.groupView = 'exceptions';
	};
	//-------------------------------------//

	// this array will hold any removes that are requested
	$scope.tempScheduleRemove = [];

	//----This function will release the site from the group controlled schedule and the local schedule should take back control---//
	$scope.releaseSched = function(scheduleID){
		var releaseSchedScope = $scope.$new();

		releaseSchedScope.schedID = scheduleID;

		var instance = $modal.open({
			scope: releaseSchedScope,
			templateUrl: 'Schedules/templates/releaseSchedModal.tpl.html',
			backdrop: 'static'
		});

		releaseSchedScope.closeWindow = function(){
			instance.close();
			releaseSchedScope.$destroy();
		};

		releaseSchedScope.release = function(){

			var scheduleMappingRef = Schedules.getScheduleMappingRef();

			$scope.tempScheduleRemove.push(releaseSchedScope.schedID);

			var schedGrpIDRef = DataModels.getModelItemRef('Schedule', releaseSchedScope.schedID).child('scheduleGroupID');
			schedGrpIDRef.set(null);
			
			var schedRef = DataModels.getModelItemRef('Schedule', releaseSchedScope.schedID);
			schedRef.once('value', function(dataSnap){
				// write the local schedule for the gateway ID to scheduleMapping
				var ref = scheduleMappingRef.child(dataSnap.val().Gateway);
				ref.push(dataSnap.val());
			});
				
			releaseSchedScope.closeWindow();
		};

		releaseSchedScope.cancel = function(){
			releaseSchedScope.closeWindow();
		};
	};
	//------------------------------------------------------//
	//--this function is fired when a schedule type is added to a group--//
	$scope.addScheduleToGroup= function(id,data){
		$scope.pendingSave = true;
		data.schedID = data.id;	
		$scope.tempSchedules.push(data);
		$scope.localSchedules[data.id].scheduleGroupID = $scope.schedID;
		$scope.changesPending.push({title:'added schedule ' + data.Name + ' to group'});
	};

	$scope.removeTempSchedule = function(id, scheduleID){
		$scope.tempSchedules.splice(id,1);
		delete $scope.localSchedules[scheduleID].schedID;
		delete $scope.localSchedules[scheduleID].scheduleGroupID;
		$scope.changesPending.push({title:'removed schedule from group'});
		$scope.pendingSave = true;
	};
	$scope.removeSchedule = function(id, scheduleID){
		$scope.tempScheduleRemove.push(scheduleID);
		$scope.addedSchedule.splice(id,1);
		//$scope.localSchedules[scheduleID].hide = false;
		delete $scope.localSchedules[scheduleID].schedID;
		delete $scope.localSchedules[scheduleID].scheduleGroupID;
		$scope.changesPending.push({title:'removed schedule from group'});
		$scope.pendingSave = true;
	};
	//--------------------------------------------------//

	$scope.sites = {};
	DataModels.fetchFilteredDate('Site', {}).then(function(sites) {
		angular.forEach(sites,function(site) {
			if($rootScope.superUser){
				$scope.sites[site._id] = site;
			}else if($rootScope.userSites && $rootScope.userSites[site._id]){
				$scope.sites[site._id] = site;
			}
		});
	});

	$scope.loadLocalSched = function(id){
		//-this is where the data for the local schedule will be loaded--//
		var filter = (id ? {Site: id} : {});
		DataModels.fetchFilteredDate('Schedule', filter).then(function(val){
			$scope.schedules = {};
			angular.forEach(val, function(data,key){
				data.id = data._id;
				$scope.schedules[data._id] = data;
			});
			if (val.length > 0) {
				$scope.loadSchedule(val[0]._id);
			}
		});
		$scope.viewExceptions(); 
		$rootScope.$broadcast('updateTimeInSched', id);
	};

	$scope.setValue = function(typeId, setValue){
		/*----checks to see what is passed to the function---*/
		var isFound = false;
		var returnData = setValue;
		angular.forEach($scope.allPointTypes, function(val, id){
			if(!isFound){
				var n = Number(setValue);
				if(val.id == typeId){
					if (val.editorOptions.type == 'binary'){
						returnData = val.editorOptions.binarylist[n];
						isFound = true;
					} else if (val.editorOptions.type == 'multivalue'){
						returnData = val.editorOptions.list[n];
						isFound = true;
					} 
				} 
			}
		});

		return returnData;
	};
	$scope.endValue = function(typeId, returnToValue){
		/*----checks to see what is passed to the function---*/
		var isFound = false;
		var returnData = returnToValue;
		angular.forEach($scope.allPointTypes, function(val, id){
			if(!isFound){
				var n = Number(returnToValue);
				if(val.id == typeId){
					if (val.editorOptions.type == 'binary'){
						returnData = val.editorOptions.binarylist[n];
						isFound = true;
					} else if (val.editorOptions.type == 'multivalue'){
						returnData = val.editorOptions.list[n];
						isFound = true;
					} 
				} 
			}
		});

		return returnData;
	};
	$scope.storeOriginalData = function (key, ref, forceSave){
		if(forceSave || typeof $scope.originalSchedDetails[key] == 'undefined'){
			$scope.originalSchedDetails[key] = {};
			$scope.originalSchedDetails[key].exception = [];
			$scope.originalSchedDetails[key].loads = [];
			$scope.originalSchedDetails[key].Days = [];
			$scope.originalSchedDetails[key].ref = ref;									
			if(typeof ref.exception != 'undefined'){	
				$scope.originalSchedDetails[key].exception = angular.copy(ref.exception);
			}
			if(typeof ref.Loads != 'undefined'){
				$scope.originalSchedDetails[key].loads = angular.copy(ref.Loads);	
			}		
			$scope.originalSchedDetails[key].Days = angular.copy(ref.Days);				
			$scope.originalSchedDetails[key].Name = ref.Name;
			$scope.originalSchedDetails[key].description = ref.description;
			$scope.originalSchedDetails[key].StartDay = ref.StartDay;
			$scope.originalSchedDetails[key].mode = ref.mode;
			$scope.originalSchedDetails[key].type = ref.type;
		}
	};
	
	$scope.eventSources = []; // holds all the events
	$scope.loadSchedule = function(key){

		$scope.scheduleGroupID = key;
		$scope.toggleLoading().then(
			function(){

				$scope.schedRef = Schedules.getScheduleRef(key);

				if($scope.schedType == 'local'){
					$scope.schedData = DataModels.getModelItemRefAngularFire('Schedule', key).$asObject();
				}else{
					$scope.schedData = Schedules.getSchedule(key).$asObject();
				}
				
				$scope.schedData.$loaded().then(
					
					function(){
						$scope.storeOriginalData(key, $scope.schedData);
						var shouldWeExpand = {};
						angular.forEach($scope.schedData.exception, function(val, id){
							shouldWeExpand[id] = false;
						});

						$scope.expandedException = shouldWeExpand;

						$scope.highlightActive = key;
						if($scope.schedType == 'group'){
							$scope.getSchedulesForGroup(key);
						}

						$scope.eventSources.slice(0, $scope.eventSources.length);

						$scope.events = [];
						$scope.processEvents();
						$scope.schedID = $scope.schedData.$id;
						$scope.calendarStartDay = $scope.schedData.StartDay;
						$scope.schedMappingChanges();

						if(typeof $scope.schedData.exception == 'undefined'){
							$scope.schedData.exception = [];
						}

						// handle hour format
						if(typeof $scope.schedData.hourFormat == 'undefined'){
							// default to 12
							$scope.calendarHourFormat = 'hh(:mm)t';
							$scope.angularHourFormat = 12;
						} else {
							if( $scope.schedData.hourFormat == '24'){
								$scope.calendarHourFormat = 'HH(:mm)';
								$scope.angularHourFormat = 24;
							} else {
								$scope.calendarHourFormat = 'hh(:mm)t';
								$scope.angularHourFormat = 12;
							}
						}

						$scope.uiConfig = {
							
							calendar:{
								editable: true,
								defaultView: 'agendaWeek',
								firstDay: $scope.calendarStartDay,
								eventOverlap: false,
								weekend: true,
								header:{
									left: 'title',
									center: '',
									right: 'today prev,next'
								},
								timeFormat: $scope.calendarHourFormat, // uppercase H for 24-hour clock
								dayClick: function(date, jsEvent, view) {},
								eventClick: function( calEvent, jsEvent, view ){
								//$scope.scheduleDetails = Schedules.getSchedule(calEvent.id);
								},

								eventDrop: function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view){
									var start = new Date(event.start);
									var end = new Date(event.end);

									var startMinutes = start.getMinutes().toString().length < 2 ? "0"+start.getMinutes().toString() : start.getMinutes().toString();
									var startHours = start.getHours().toString().length < 2 ? "0"+start.getHours().toString() : start.getHours().toString();

									var endMinutes = end.getMinutes().toString().length < 2 ? "0"+end.getMinutes().toString() : end.getMinutes().toString();
									var endHours = end.getHours().toString().length < 2 ? "0"+end.getHours().toString() : end.getHours().toString();

									var startTime = startHours+":"+startMinutes;
									var endTime = endHours+":"+endMinutes;

									if( event.exception ){
										$scope.schedData.exception[event.exceptionID].Days[event.dayNumber].timeblocks[event.timeblockIndex].end = {hr: endHours, mn: endMinutes};
										$scope.schedData.exception[event.exceptionID].Days[event.dayNumber].timeblocks[event.timeblockIndex].start = {hr: startHours, mn: startMinutes};
									} else {
										$scope.schedData.Days[event.dayNumber].timeblocks[event.timeblockIndex].end = {hr: endHours, mn: endMinutes};
										$scope.schedData.Days[event.dayNumber].timeblocks[event.timeblockIndex].start = {hr: startHours, mn: startMinutes};
									}

									$scope.pendingSave = true; 
									$scope.changesPending.push({title:'updated timeblock'});
								},
								eventResize: function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ){
									var start = new Date(event.start);
									var end = new Date(event.end);

									var startMinutes = start.getMinutes().toString().length < 2 ? "0"+start.getMinutes().toString() : start.getMinutes().toString();
									var startHours = start.getHours().toString().length < 2 ? "0"+start.getHours().toString() : start.getHours().toString();

									var endMinutes = end.getMinutes().toString().length < 2 ? "0"+end.getMinutes().toString() : end.getMinutes().toString();
									var endHours = end.getHours().toString().length < 2 ? "0"+end.getHours().toString() : end.getHours().toString();

									var startTime = startHours+":"+startMinutes;
									var endTime = endHours+":"+endMinutes;

									if( event.exception ){
										$scope.schedData.exception[event.exceptionID].Days[event.dayNumber].timeblocks[event.timeblockIndex].end = {hr: endHours, mn: endMinutes};
										$scope.schedData.exception[event.exceptionID].Days[event.dayNumber].timeblocks[event.timeblockIndex].start = {hr: startHours, mn: startMinutes};
									} else {
										$scope.schedData.Days[event.dayNumber].timeblocks[event.timeblockIndex].end = {hr: endHours, mn: endMinutes};
										$scope.schedData.Days[event.dayNumber].timeblocks[event.timeblockIndex].start = {hr: startHours, mn: startMinutes};
									}

									$scope.pendingSave = true; 
									$scope.changesPending.push({title:'updated timeblock'});

								},
								eventMouseover: function(event, jsEvent, view){
								},
								eventMouseout: function(event, jsEvent, view){
								}
							}
						};
						$scope.toggleLoading().then(
							function(){
							}
						);
					}
				);	
			}
		);	
	};
	$scope.originalSchedDetails = {};
	// loads the initial schedule
	$scope.loadSchedule( initialSched );

	$scope.addPointType = function(id){
	};	

	$scope.openPanel = function(id){
		var currentYear = (new Date()).getFullYear();
		var exceptionStartDate = new Date( $scope.dateFromDay(currentYear,$scope.schedData.exception[id].Schedule[0].start));

		var month = exceptionStartDate.getMonth();
		var year = exceptionStartDate.getFullYear();
		var day =exceptionStartDate.getDate();
		var schedule = $scope.schedData.exception[id];
		
		$rootScope.$broadcast('openException', null, month, day, schedule, year, id  );
	};

	$scope.loadsToRemove = [];
	$scope.removeLoad = function(id){
		$scope.loadsToRemove.push($scope.schedData.Loads[id]);
		var loads = angular.copy($scope.schedData.Loads);
		loads.splice(id,1);
		$scope.schedData.Loads = loads;
		$rootScope.$broadcast('changesPending',{title:'removed load'});
	};

	$scope.initialYear = (new Date()).getFullYear();

	$scope.dateFromDay = function(year, day){
		var date = new Date(year, 0, 1); // initialize a date in `year-01-01`
		return (new Date(date.setDate(day))).getTime(); // add the number of days
	};

	$scope.configName = "Year View";

	$scope.toggleYear = function(){
		$scope.selectedView = 'year';
		$scope.returnToView = 'year';
	};

	$scope.toggleMonth = function(){
		$scope.selectedView = 'month';
		$scope.returnToView = 'month';
	};

	$scope.toggleWeek = function(){
		$scope.selectedView = 'week';
		$scope.returnToView = 'week';
	};

	$scope.expandSchedDiv = function(){
		if($scope.expandSchedule === false){
			$scope.expandSchedule = true;
		} else if ($scope.expandSchedule === true){
			$scope.expandSchedule = false;
		}
	};

	$scope.expandException = function(id){

		if( $scope.expandedException[id] === true){
			$scope.expandedException[id] = false;
		} else {
			$scope.expandedException[id] = true;
		}
	};

	$scope.loadsToAdd = [];
	$scope.hasBeenAccepted = false;
	$scope.rightsTreeOptions = {
		accept: function(sourceNode, destNodes, destIndex) {
			
			$scope.hasBeenAccepted = true;	
			var retVal = false;
			var data = $scope.schedData;
			var dest = destNodes.$modelValue;
			
			$scope.acceptedDrop = true;

			$scope.listItem = false;

			angular.forEach($scope.schedData.Loads, function(val,id){
				
					if (sourceNode.$modelValue.name == val.name) {
						$scope.listItem = true;
					}
			});

			
				return !dest.some(function(value,key) {
					
					
					
					if ($scope.listItem === true) {

						$scope.hasBeenAccepted = false;
						$scope.acceptedDrop = false;
						
						var errorScope = $scope.$new();
						
						var instance2 = $modal.open({
						scope: errorScope,
						templateUrl: 'Schedules/templates/error.tpl.html',
						size: 'sm'
						});

						errorScope.closeError = function(){
							instance2.close();
							errorScope.$destroy();
						};
			
						return true;
					}
				});
			
		},
		dropped: function(event) {
			// PUT THE ELEMENT BACK INTO THE INITIAL ARRAY
			//event.source.nodesScope.$modelValue.push( event.source.nodeScope.user );

			var addPointTypeDialog = function(event){
				var addPointTypeScope = $scope.$new();
				addPointTypeScope.original = event;
				addPointTypeScope.destination = event.dest.nodesScope.$modelValue;
				addPointTypeScope.sourceList = event.source.nodesScope.$modelValue;
				addPointTypeScope.sourceValue = angular.copy(event.source.nodeScope.$modelValue);

				
				var instance = $modal.open({
					scope: addPointTypeScope,
					templateUrl: 'Schedules/templates/addPointType.tpl.html',
					backdrop: 'static'
				});
			

				$rootScope.$on("logout:request", function(user) {
					instance.close();
					angularddPointTypeScope.$destroy();
				});

				addPointTypeScope.cancelDialog = function(){
					$scope.pointTypes = angular.copy($scope.pointsOriginal);
				
					addPointTypeScope.destination.splice(event.dest.index,1);
					$scope.acceptedDrop = false;
					$scope.hasBeenAccepted = false;
					instance.close();
					//addPointTypeScope.$destroy();
				};
			

				addPointTypeScope.closeDialog = function(){
					
					instance.close();

					addPointTypeScope.$destroy();
				};

				addPointTypeScope.save = function(set){
				//save data
					$scope.pointTypes = angular.copy($scope.pointsOriginal);
					var ptData = addPointTypeScope.sourceValue;
					$scope.loadsToAdd.push(ptData);					
					ptData.setValue = set; 
					$scope.acceptedDrop = false;
					$scope.hasBeenAccepted = false;
					//ptData.displayReturnValue = $scope.endValue(ptData.id, returnTo);
					ptData.displaySetValue = $scope.setValue(ptData.id, set);
					//ptData.returnToValue = returnTo;
					addPointTypeScope.destination[event.dest.index] = ptData;
					addPointTypeScope.closeDialog();
					$rootScope.$broadcast('changesPending', {title:'added point type'});

				};
			};
			if( $scope.hasBeenAccepted ){
				addPointTypeDialog(event);
			}

		},
		beforeDrop: function(event) {

			var sourceList = event.source.nodesScope.$modelValue;
			var sourceValue = angular.copy(event.source.nodeScope.$modelValue);
			var alreadyInList = !sourceList.some(function(value,key) {
				if (value.modelTypeName === sourceValue.modelTypeName) {
					return true;
				}
			});

			if (alreadyInList) { 
				event.source.nodeScope.$$apply = false;
			}
		}
	};

	$scope.deleteException = function(id){
		// TODO we need a way to delete the item in the 
		var deleteExceptionScope = $scope.$new();
		deleteExceptionScope.exceptionID = id;
		var instance = $modal.open({
			scope: deleteExceptionScope,
			templateUrl: 'Schedules/templates/deleteExceptionModal.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			deleteExceptionScope.$destroy();
		});

		deleteExceptionScope.closeDialog = function(){
			instance.close();	
			deleteExceptionScope.$destroy();
		};

		deleteExceptionScope.save = function(){

			var copy = angular.copy( $scope.schedData.exception );
			copy.splice(deleteExceptionScope.exceptionID, 1);
			$scope.schedData.exception = copy;
			$scope.pendingSave = true;
			$scope.changesPending.push({title:'removed exception'});
			deleteExceptionScope.closeDialog();

		};

	};

	$scope.deleteScheduleDialog = function(scheduleId, scheduleData){
		var deleteScheduleScope = $scope.$new();
		deleteScheduleScope.schedule = scheduleData;
		deleteScheduleScope.scheduleId = scheduleId;
		deleteScheduleScope.patternMatch = "/^"+deleteScheduleScope.schedule.Name+"$/";
		var instance = $modal.open({
			scope: deleteScheduleScope,
			templateUrl: 'Schedules/templates/deleteScheduleModal.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			deleteScheduleScope.$destroy();
		});
		deleteScheduleScope.closeDialog = function(){
			instance.close();	
			deleteScheduleScope.$destroy();
		};

		deleteScheduleScope.removeSchedule = function(scheduleName, scheduleId){

			if( scheduleName == deleteScheduleScope.schedule.Name){
				var deletedGroupID = scheduleId;
				var queryParams = {
					index: es.getIndexName(),
					type: 'Schedule',
					explain: false,
					lowercaseExpandedTerms: false,
					body: {
						size: 50000,
						sort: [ "Name.raw" ],
						query: {
							filtered: {
								filter: {
									bool: {
										must: [
											{ match_all: {}}
										]
									}
								}
							}
						}
					}
				};
				es.get().search(queryParams).then(function (resp) {
					if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
						var scheduleMappingRef = Schedules.getScheduleMappingRef();
						resp.hits.hits.forEach(function (hit, index) {

							if(typeof hit._source.scheduleGroupID != 'undefined' && hit._source.scheduleGroupID == deletedGroupID){
								// after we cleanup the groupID from the schedule we will need to write the local schedule to the scheduleMapping firebase ref so that the device will pick up the schedule change
								var schedGrpIDRef = DataModels.getModelItemRef('Schedule', hit._id).child('scheduleGroupID');
								schedGrpIDRef.set(null);
								
								var schedRef = DataModels.getModelItemRef('Schedule', hit._id);
								schedRef.once('value', function(dataSnap){
									// write the local schedule for the gateway ID to scheduleMapping
									var ref = scheduleMappingRef.child(dataSnap.val().Gateway);
									dataSnap.val().scheduleGroupID = $scope.schedID;
									var newID = dataSnap.val();
									newID.scheduleGroupID = $scope.schedID;
									ref.push(newID);
								});

								Schedules.deleteSchedule(scheduleId, deleteScheduleScope.schedule).then(
									function(){

										deleteScheduleScope.closeDialog();
										
										if(deleteScheduleScope.scheduleId == $scope.highlightActive){
											$scope.loadSchedule(initialSched);						
										}
										$scope.loadGroupSchedules();

									}
								);									

							}

						});

					} else {
						// there is not a matching schedule in the data model so it is time to delete
						Schedules.deleteGroupSchedule(scheduleId, deleteScheduleScope.schedule).then(
							function(){

								deleteScheduleScope.closeDialog();
								
								if(deleteScheduleScope.scheduleId == $scope.highlightActive){
									$scope.loadSchedule(initialSched);						
								}
								$scope.loadGroupSchedules();

							}
						);	
					}
				}, function (err) {
					// there was an error
				});

				// put delete back									
			}



		};
	};

	$scope.editScheduleDialog = function(){
		var editScheduleScope = $scope.$new();

		editScheduleScope.alerts = [];

		editScheduleScope.schedule =  copyObj($scope.schedData);
		// CHECK THE TIMEBLOCKS FOR PROPERLY FORMATTED TIMES
		// IF THEY ARE MISSING LEADING ZEROS THEN ADD THEM
		angular.forEach(editScheduleScope.schedule.Days, function(dayData,dayNum){
			angular.forEach(dayData.timeblocks, function(timeblock,id){
				if( timeblock.start.hr.length < 2 && timeblock.start.hr != null){
					editScheduleScope.schedule.Days[dayNum].timeblocks[id].start.hr = "0"+timeblock.start.hr;
				}
				if( timeblock.start.mn.length < 2 && timeblock.start.mn != null){
					editScheduleScope.schedule.Days[dayNum].timeblocks[id].start.mn = "0"+timeblock.start.mn;
				}
				if( timeblock.end.hr.length < 2 && timeblock.end.hr != null){
					editScheduleScope.schedule.Days[dayNum].timeblocks[id].end.hr = "0"+timeblock.end.hr;
				}
				if( timeblock.end.mn.length < 2 && timeblock.end.mn != null){
					editScheduleScope.schedule.Days[dayNum].timeblocks[id].end.mn = "0"+timeblock.end.mn;
				}
			});
		});

		$scope.sliderValue = false;	

		if($scope.schedData.mode === "online"){
			$scope.sliderValue = true;
		}else{
			$scope.sliderValue = false;
		}

		editScheduleScope.insertUniqueAlerts = function(inType, inMsg){
			for(var i = 0; i < editScheduleScope.alerts.length; i++)
			{
				if(editScheduleScope.alerts[i]['msg'] == inMsg){
					return;
				}
			}
			editScheduleScope.alerts.push({type: inType,msg: inMsg});
			// set the location.hash to the id of
			// the element you wish to scroll to.
			$location.hash('alerts');

			// call $anchorScroll()
			$anchorScroll();
		};

		editScheduleScope.closeAlert = function(index) {
			editScheduleScope.alerts.splice(index, 1);
		};

		editScheduleScope.time = {Name: editScheduleScope.schedule.Name, date: editScheduleScope.schedule.date, Time: editScheduleScope.schedule.Time, description: editScheduleScope.schedule.description, type: editScheduleScope.schedule.type ? editScheduleScope.schedule.type : "control", mode: editScheduleScope.sliderValue, timeblocks: {}};
		angular.forEach(editScheduleScope.schedule.Days, function(val, id){
			editScheduleScope.scheduleSchedule = function(){

				Date.prototype.getDOY = function() {
					var onejan = new Date(this.getFullYear(),0,1);
					return Math.ceil((this - onejan) / 86400000);
				};

				editScheduleScope.schedule.Schedule = [];
				editScheduleScope.schedule.Schedule.push( {start: editScheduleScope.schedule.schedStart.getDOY(), end: editScheduleScope.schedule.schedEnd.getDOY()} );
			};

			editScheduleScope.editScheduleWarning = function(timeData, changesPending){
				editScheduleScope.alerts = [];
				angular.forEach(editScheduleScope.schedule.Days, function (val, data) {
					var timeslots = [];
					angular.forEach(editScheduleScope.schedule.Days[data].timeblocks, function (time, timeblocks) {
						if(time.start.hr == null || time.start.mn == null){
								editScheduleScope.insertUniqueAlerts("danger", "Start time of a timeblock cannot be after its end time.");
							}
						if(time.end.hr == null || time.end.mn == null){
								editScheduleScope.insertUniqueAlerts("danger", "Start time of a timeblock cannot be after its end time.");
							}
						if(time.start.hr !== null && time.start.mn !== null){
							var timeAsMinutesStart = parseInt((time.start.hr*60) + time.start.mn);
							var timeAsMinutesEnd = parseInt((time.end.hr*60) + time.end.mn);
							if(timeAsMinutesStart >= timeAsMinutesEnd){
								editScheduleScope.insertUniqueAlerts("danger", "Start time of a timeblock cannot be after its end time.");
							}
							for(var i = 0; i < timeslots.length; i++){
								slot = timeslots[i];

								if((timeAsMinutesStart > slot[0] && timeAsMinutesStart < slot[1]) || (timeAsMinutesEnd > slot[0] && timeAsMinutesStart < slot[1]) || (timeAsMinutesStart <= slot[0] && timeAsMinutesEnd >= slot[1])){
									editScheduleScope.insertUniqueAlerts("danger", "Timeblocks selected overlap with other timeblocks on the same day.");
								}
							}
							if(typeof timeslots[timeblocks] === 'undefined'){
								timeslots[timeblocks] = [];
							}

							timeslots[timeblocks][0] =  timeAsMinutesStart;
							timeslots[timeblocks][1] =  timeAsMinutesEnd;
						}
					});
				});	

				if(editScheduleScope.alerts.length){
					return;
				}
				var editScheduleWarningScope = $scope.$new();
				editScheduleWarningScope.changesPending = changesPending;
				$scope.thisTime = timeData;

				editScheduleWarningScope.schedule = editScheduleScope.schedule;
				var instance = $modal.open({
					scope: editScheduleWarningScope,
					templateUrl: 'Schedules/templates/editScheduleModal.tpl.html'
				});

				$rootScope.$on("logout:request", function(user) {
					instance.close();
					editScheduleWarningScope.$destroy();
				});

				editScheduleWarningScope.closeDialog = function(){
					instance.close();	
					editScheduleWarningScope.$destroy();
				};

				editScheduleWarningScope.saveBaseSchedule = function(timeData){		
					var cleanOutTimeblocks = function(){
						for( var i=0;i<7;i++){
							if( typeof copiedSchedule.Days[i].timeblocks != 'undefined'){
								delete copiedSchedule.Days[i].timeblocks;
							}
						}
					};

					var copiedSchedule = copyObj($scope.schedData);

					$scope.schedData.Name = timeData.Name;
					$scope.schedData.date = timeData.date;
					$scope.schedData.Time = timeData.Time;
					$scope.schedData.description = timeData.description;
					$scope.schedData.type = timeData.type;

					copiedSchedule.Days = editScheduleScope.schedule.Days;
					$scope.schedData.Days = editScheduleScope.schedule.Days;


					// We sort the timeblocks of each day in ascending order
					angular.forEach($scope.schedData.Days, function(data, id){
						if (data.timeblocks) {
							data.timeblocks.sort(function(a, b){
								return (a.start.hr + a.start.mn) - (b.start.hr + b.start.mn);
							});
						}
					});


					$scope.online = timeData.mode;

					if($scope.online){
						$scope.schedData.mode = "online";
					}else{
						$scope.schedData.mode = "offline";
					}

					editScheduleScope.closeEditDialog();
					editScheduleWarningScope.closeDialog();
					$scope.pendingSave = true;
					$scope.changesPending.push({title:'update to base schedule'});
				};

			};

			editScheduleScope.today = function() {
				editScheduleScope.schedule.time = new Date();
			};
			editScheduleScope.today();

			editScheduleScope.clear = function () {
				editScheduleScope.schedule.time = null;
			};

			// Disable weekend selection
			editScheduleScope.disabled = function(date, mode) {
				return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
			};

			editScheduleScope.toggleMin = function() {
				editScheduleScope.minDate = editScheduleScope.minDate ? null : new Date();
			};
			//editScheduleScope.toggleMin();

			editScheduleScope.openTime1 = function($event) {
				$event.preventDefault();
				$event.stopPropagation();

				editScheduleScope.opened1 = true;
			};

			editScheduleScope.openTime2 = function($event) {
				$event.preventDefault();
				$event.stopPropagation();

				editScheduleScope.opened2 = true;
			};

			editScheduleScope.openTime = function($event) {
				$event.preventDefault();
				$event.stopPropagation();

				editScheduleScope.opened = true;
			};

			editScheduleScope.dateOptions = {
				formatYear: 'yy',
				startingDay: 1
			};

			editScheduleScope.initDate = new Date('2016-15-20');
			editScheduleScope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
			editScheduleScope.format = editScheduleScope.formats[0];

			/* for time picker */
			editScheduleScope.hstep = 1;
			editScheduleScope.mstep = 1;
			editScheduleScope.ismeridian = true;


			if( typeof val.timeblocks != 'undefined' && val.timeblocks.length > 0){

				var startHrData = val.timeblocks[0].start.hr;
				var startMnData = val.timeblocks[0].start.mn;
				var endHrData = val.timeblocks[0].end.hr;
				var endMnData = val.timeblocks[0].end.mn;
				if( typeof editScheduleScope.time == 'undefined'){
					editScheduleScope.time = {};
				}
				if( typeof editScheduleScope.time.timeblocks == 'undefined'){
					editScheduleScope.time.timeblocks = {};
				}
				editScheduleScope.time.timeblocks[id] = {
					start :{hr: startHrData, mn: startMnData },
					end : {hr: endHrData, mn: endMnData}
				};

			}

		});

		editScheduleScope.TimesToUpdate = {};
		editScheduleScope.flagTime = function(dayId, timeblockId, checked){
			if( typeof editScheduleScope.TimesToUpdate[dayId] == 'undefined' ){
				editScheduleScope.TimesToUpdate[dayId] = {};
				if( typeof checked == 'undefined' ){
					editScheduleScope.TimesToUpdate[dayId][timeblockId] = true;
				}else{
					editScheduleScope.TimesToUpdate[dayId][timeblockId] = checked;
				}
			}else{
				if( typeof checked == 'undefined' ){
					editScheduleScope.TimesToUpdate[dayId][timeblockId] = !(editScheduleScope.TimesToUpdate[dayId][timeblockId]);
				}else{
					editScheduleScope.TimesToUpdate[dayId][timeblockId] = checked;
				}
			}
		};

		editScheduleScope.formChange = false;

		editScheduleScope.updateTime = function(rowID, time, timepart, newValue, id){
			editScheduleScope.formChange = true;
			//editScheduleScope.changesPending.push({title:'update base schedule'});
			// THIS MIGHT NEED TO BE ANGULAR.FOREACH
			if(editScheduleScope.TimesToUpdate[id] && editScheduleScope.TimesToUpdate[id][rowID]){
				for(var item in editScheduleScope.TimesToUpdate){
					if (editScheduleScope.schedule.Days[item].timeblocks[rowID] && editScheduleScope.TimesToUpdate[item][rowID]) {
						editScheduleScope.schedule.Days[item].timeblocks[rowID][time][timepart] = newValue;
					}
				}
			}
		};

		editScheduleScope.Change = function(){
			editScheduleScope.formChange = true;
		};

		editScheduleScope.applyChecked = function(checked){
			editScheduleScope.syncAllTimeblocks = checked;
			angular.forEach(editScheduleScope.schedule.Days,function(val, data){
				if (typeof editScheduleScope.schedule.Days[data].timeblocks != 'undefined') {
					angular.forEach(editScheduleScope.schedule.Days[data].timeblocks,function(time, timeblocks){
						editScheduleScope.flagTime(data, timeblocks, checked);
					});
				}
			});
		};

		editScheduleScope.addTimeblock = function(key){
			var obj = {
				end: {hr:null, mn:null},
				start: {hr:null, mn:null}
			};
			if(typeof editScheduleScope.schedule.Days[key].timeblocks == 'undefined'){
				editScheduleScope.schedule.Days[key].timeblocks = [];
			}
			if( editScheduleScope.schedule.Days[key].timeblocks.length == 3){
				editScheduleScope.insertUniqueAlerts("danger", "Hardware Limitation: Unable to add more than three timeblocks");
			} else {
				editScheduleScope.schedule.Days[key].timeblocks.push(obj);
				editScheduleScope.flagTime(key, editScheduleScope.schedule.Days[key].timeblocks.length - 1, editScheduleScope.syncAllTimeblocks);
			}

		};

		editScheduleScope.removeTimeblock = function(key, id){
			editScheduleScope.formChange = true;
			editScheduleScope.schedule.Days[key].timeblocks.splice(id, 1);
			if(typeof editScheduleScope.TimesToUpdate != 'undefined' && Object.keys(editScheduleScope.TimesToUpdate).length > 0){
					delete editScheduleScope.TimesToUpdate[key][id];
			}
		};

		editScheduleScope.saveBaseSchedule = function(timeData){
			var cleanOutTimeblocks = function(){
				for( var i=0;i<7;i++){
					if( typeof copiedSchedule.Days[i].timeblocks != 'undefined'){
						delete copiedSchedule.Days[i].timeblocks;
					}
				}
			};
			//var copiedSchedule = angular.copy($scope.schedData);
			var copiedSchedule = copyObj($scope.schedData);
			cleanOutTimeblocks();

			$scope.schedData.Name = timeData.Name;
			$scope.schedData.date = timeData.date;
			$scope.schedData.Time = timeData.Time;
			$scope.schedData.description = timeData.description;
			$scope.schedData.type = timeData.type;

			copiedSchedule.Days = editScheduleScope.schedule.Days;
			$scope.schedData.Days = editScheduleScope.schedule.Days;

			$scope.online = timeData.mode;

			if($scope.online){
				$scope.schedData.mode = "online";
			}else{
				$scope.schedData.mode = "offline";
			}

			$scope.pendingSave = true;
			$scope.changesPending.push({title:'update to base schedule'});
			editScheduleScope.closeEditDialog();
		};

		var instance = $modal.open({
			scope: editScheduleScope,
			templateUrl: 'Schedules/templates/baseScheduleModal.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			editScheduleScope.$destroy();
		});

		editScheduleScope.closeEditDialog = function(){
			instance.close();
			editScheduleScope.$destroy();
		};
	};

	$scope.addScheduleDialog = function(){
		var addScheduleScope = $scope.$new();
		addScheduleScope.scheduleEvent = {};
		addScheduleScope.scheduleEvent.mode ="online";
		addScheduleScope.saved = false;
		addScheduleScope.isEdit = false;
		addScheduleScope.actualYear = (new Date()).getFullYear();

		addScheduleScope.dateFromDay = function(year, day){
			var date = new Date(year, 0); // initialize a date in `year-01-01`
			return new Date(date.setDate(day)); // add the number of days
		};

		addScheduleScope.scheduleSchedule = function(){

			Date.prototype.getDOY = function() {
				var onejan = new Date(this.getFullYear(),0,1);
				return Math.ceil((this - onejan) / 86400000);
			};

			addScheduleScope.scheduleEvent.Schedule = [];
			addScheduleScope.scheduleEvent.Schedule.push( {start: addScheduleScope.scheduleEvent.schedStart.getDOY(), end: addScheduleScope.scheduleEvent.schedEnd.getDOY()} );
		};

		addScheduleScope.today = function() {
			addScheduleScope.scheduleEvent.time = new Date();
		};
		addScheduleScope.today();

		addScheduleScope.clear = function () {
			addScheduleScope.scheduleEvent.time = null;
		};

		// Disable weekend selection
		addScheduleScope.disabled = function(date, mode) {
			return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
		};

		addScheduleScope.toggleMin = function() {
			addScheduleScope.minDate = addScheduleScope.minDate ? null : new Date();
		};
		//addScheduleScope.toggleMin();

		addScheduleScope.openTime1 = function($event) {
			$event.preventDefault();
			$event.stopPropagation();

			addScheduleScope.opened1 = true;
		};
		addScheduleScope.openTime2 = function($event) {
			$event.preventDefault();
			$event.stopPropagation();
			addScheduleScope.opened2 = true;
		};
		addScheduleScope.openTime = function($event) {
			$event.preventDefault();
			$event.stopPropagation();


			addScheduleScope.opened = true;
		};

		addScheduleScope.dateOptions = {
			formatYear: 'yy',
			startingDay: 1
		};

		addScheduleScope.initDate = new Date('2016-15-20');
		addScheduleScope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
		addScheduleScope.format = addScheduleScope.formats[0];

		/* for time picker */
		addScheduleScope.hstep = 1;
		addScheduleScope.mstep = 1;
		addScheduleScope.ismeridian = true;

		var instance = $modal.open({
			scope: addScheduleScope,
			templateUrl: 'Schedules/templates/addSchedule.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			addScheduleScope.$destroy();
		});

		addScheduleScope.save = function(time){
			addScheduleScope.nameInUse = false;
			angular.forEach($scope.schedules, function (val, id) {
				if(addScheduleScope.scheduleEvent.Name == val.Name){
					addScheduleScope.nameInUse = true;
				}
			});
			
			if( addScheduleScope.scheduleEvent.Default ){
				//pull all the markers from the default and store them into the schedule
				addScheduleScope.scheduleEvent.Days = Schedules.getDefault();
				addScheduleScope.saved = true;
			}

			delete addScheduleScope.scheduleEvent.schedEnd;
			delete addScheduleScope.scheduleEvent.schedStart;
			delete addScheduleScope.scheduleEvent.time;
			delete addScheduleScope.scheduleEvent.Default;
			delete addScheduleScope.scheduleEvent.reason;
			addScheduleScope.scheduleEvent.hourFormat = 24;
			addScheduleScope.scheduleEvent.Schedule = [{start: 1, end: 365}];
			addScheduleScope.scheduleEvent.Days=[{Name:"Sunday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]},
			{Name:"Monday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]},
			{Name:"Tuesday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]},
			{Name:"Wednesday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]}, 
			{Name:"Thursday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]}, 
			{Name:"Friday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]}, 
			{Name:"Saturday", timeblocks: [{start: {hr:null, mn: null}, end: {hr:null, mn: null}}]}];
			//addScheduleScope.scheduleEvent.Loads =[{}];


			/*angular.forEach(time.timeblocks, function(val, id){

			var timeblk = [];

			timeblk.push({start: val.start.hr+":"+val.start.mn, end: val.end.hr+":"+val.end.mn});
			copiedSchedule.Days[id].timeblocks = timeblk;
			$scope.schedData.Days[id].timeblocks = timeblk;
			});*/

			if(!addScheduleScope.nameInUse){
				Schedules.saveSchedule(addScheduleScope.scheduleEvent).then(
					function(){

						$scope.loadGroupSchedules().then(
							function(){
								addScheduleScope.closeDialog();
								$scope.loadSchedule(initialSched);
							}
						);

					}
				);
			
			}
		};

		addScheduleScope.closeDialog = function(){
			instance.close();
			addScheduleScope.$destroy();
		};
	};

	$scope.renderCalendar = function(){

		$('#calendar').fullCalendar('render');
		$('#calendar').fullCalendar('refetchEvents');

	};

	$scope.incDate1 = 0;

	$scope.eventSources = [];

	var addToDaysOfEvents = function(dayOfYear,data){
		if( typeof $scope.daysOfEvents[dayOfYear] == 'undefined'){
			$scope.daysOfEvents[dayOfYear] = [];
		}
		$scope.daysOfEvents[dayOfYear].push(data);
	};

	var clearOutEvents = function(dayOfYear, data){
		if( typeof $scope.daysOfEvents[dayOfYear] != 'undefined' ){
			if( typeof $scope.daysOfEvents[dayOfYear][0].type == 'undefined' || ($scope.daysOfEvents[dayOfYear][0].type != 'one-time' && data.type == 'one-time') ){
				$scope.daysOfEvents[dayOfYear] = [];
			}
			addToDaysOfEvents(dayOfYear, data);
		}
	};

	var emptyEvents = function(dayOfYear, data){	
		$scope.daysOfEvents[dayOfYear] = [];
	};

	var buildEventsData = function(){
		$scope.events = [];
		angular.forEach( $scope.daysOfEvents, function(data, dayOfYear){

			angular.forEach( data, function(dayData, dayOfWeek){

				$scope.events.push( dayData );

			});
		});


		$scope.eventSources = [$scope.events];
	};

	var formatTimeStamp = function(currentDate, time){
		// this is where the time will get built
		var ts = currentDate;
		ts.setHours(time.hr);
		ts.setMinutes(time.mn);
		//"2014-10-20T15:00:38.830Z"
		var startMonth = (ts.getMonth()+1).toString().length < 2 ? "0"+(ts.getMonth()+1).toString() : (ts.getMonth()+1).toString();
		var startMinutes = ts.getMinutes().toString().length < 2 ? "0"+ts.getMinutes().toString() : ts.getMinutes().toString();
		var startDay = ts.getDate().toString().length < 2 ? "0"+ts.getDate().toString() : ts.getDate().toString();
		var startHours = ts.getHours().toString().length < 2 ? "0"+ts.getHours().toString() : ts.getHours().toString();
		return (ts.getFullYear()).toString()+"-"+startMonth+"-"+startDay+'T'+startHours+":"+startMinutes+":"+"00";
	};

	var compileEvents = function(processSchedule){
		var currentDay = new Date();

		$scope.itemcounter = 0;

		angular.forEach( processSchedule.Schedule, function(data, key){

			//the start and end days of the exception
			var start = $scope.dateFromDay( $scope.initialYear, data.start);
			var end = $scope.dateFromDay( $scope.initialYear, data.end) ;

			for( var i = data.start; i <= data.end;i++){

				var currentDate = new Date($scope.dateFromDay( $scope.initialYear, i));
				var currentDay = currentDate.getDay();

				if( typeof processSchedule.Days[currentDay].timeblocks != 'undefined' && processSchedule.Days[currentDay].timeblocks.length > 0 ){
					for( var j=0; j < processSchedule.Days[currentDay].timeblocks.length; j++){

						//function for ts
						var startTS = formatTimeStamp(currentDate, processSchedule.Days[currentDay].timeblocks[j].start);
						var endTS = formatTimeStamp(currentDate, processSchedule.Days[currentDay].timeblocks[j].end);
						var eventTitle = processSchedule.Days[currentDay].timeblocks[j].Name;
						var eventObj = {"timeblockIndex":j, "dayNumber": currentDay, "id":$scope.itemcounter, "key": j, title: eventTitle, start: startTS, end: endTS , allDay: false , exception: false};

						if( typeof schedule != 'undefined'){
							eventObj.type = schedule.type;
							emptyEvents(i, eventObj );
						}

						addToDaysOfEvents(i, eventObj);
						$scope.itemcounter += 1;

					}
				}
			}
		});	
		if(typeof processSchedule.exception != 'undefined'){
			angular.forEach( processSchedule.exception, function(exception, key){
				if( typeof exception != 'undefined' ){
					if(typeof exception.Schedule != 'undefined'){
						angular.forEach( exception.Schedule, function(data, id){
							//the start and end days of the exception
							var start = $scope.dateFromDay( $scope.initialYear, data.start);
							var end = $scope.dateFromDay( $scope.initialYear, data.end);

							for( var i = data.start; i <= data.end;i++){
								var currentDate = new Date($scope.dateFromDay( $scope.initialYear, i));
								var currentDay = currentDate.getDay();

								if( typeof exception.Days[currentDay].timeblocks != 'undefined' && exception.Days[currentDay].timeblocks.length > 0 ){
									for( var j=0; j< exception.Days[currentDay].timeblocks.length; j++){

										if( typeof exception.Days[currentDay].timeblocks[j] != 'undefined'){

											var startTS = formatTimeStamp(currentDate, exception.Days[currentDay].timeblocks[j].start);
											var endTS = formatTimeStamp(currentDate, exception.Days[currentDay].timeblocks[j].end);
											var eventTitle = 'exception';
											var colorCode = (exception.type == 'date-range') ? '#8A2BE2' : '#FF0000';
											var eventObj = {"timeblockIndex":j, "dayNumber": currentDay, "id":$scope.itemcounter, "key": j, title: eventTitle, start: startTS, end: endTS, allDay: false, color: colorCode, type: exception.type, exception: true, exceptionID:  key};
											clearOutEvents(i, eventObj );
											$scope.itemcounter += 1;
										}
									}
								}
							}
						});
					}
				}
			// this is where the time will get built
			});	
		}

		buildEventsData();
	};

	$scope.processEvents = function(schedule){
		$scope.daysOfEvents = {};
		$scope.events = [];
		$scope.selectedView = 'loading';

		var processSchedule;
		if( typeof schedule != 'undefined'){
			processSchedule = schedule;
			// TODO need to broadcast that the update happened and get it over to scheduler to add to the year calendar
			//$rootScope.$broadcast("calendar:update", startDate, endDate, exception, exceptionID);
			compileEvents(processSchedule);
		} else {
			processSchedule = $scope.schedData;
			processSchedule.$loaded().then(function(data){
				compileEvents(processSchedule);
			});
		}			
	};

	$scope.removeItemFromEventsArray = function(itemId){
		$scope.eventSources[0].splice(itemId, 1);
	};

	$scope.saveScheduleDialog = function(changes){
		var saveScheduleScope = $scope.$new();
		saveScheduleScope.changesPending = changes;

		var instance = $modal.open({
			scope: saveScheduleScope,
			templateUrl: 'Schedules/templates/saveScheduleModal.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			saveScheduleScope.$destroy();
		});

		saveScheduleScope.cancel = function(){
			$scope.loadSchedule($scope.schedID);
			$scope.changesPending = [];
			$scope.loadsToRemove = [];
			$scope.loadsToAdd = [];
			$scope.pendingSave = false;
			$scope.selectedView = $scope.returnToView;
			
			instance.close();
			saveScheduleScope.$destroy();				
			angular.forEach($scope.originalSchedDetails, function (val, key){
				val.ref.exception = angular.copy(val.exception);
				val.ref.Loads = angular.copy(val.loads);						
				val.ref.Days = angular.copy(val.Days);									
				val.ref.Name = val.Name;						
				val.ref.description = val.description;						
				val.ref.StartDay = val.StartDay;						
				val.ref.mode = val.mode;						
				val.ref.type = val.type;					
			});
			$rootScope.$broadcast('refreshYearCalendar');

			$scope.toggleLoading().then(
				function(){
				}
			);
		};

		saveScheduleScope.closeDialog = function(){
			instance.close();	
			saveScheduleScope.$destroy();
		};

		saveScheduleScope.save = function(){

			angular.forEach($scope.loadsToAdd, function(val){
				DataModels.addModelItemWithSchedule(val.model, val.id, $scope.schedData.$id);
			});
		
			if( typeof $scope.schedData.Time === 'undefined'){
				$scope.schedData.Time = Firebase.ServerValue.TIMESTAMP;
			}
			if( typeof $scope.schedData.description === 'undefined'){
				$scope.schedData.description = "";
			}
			$scope.schedData.date = Firebase.ServerValue.TIMESTAMP;

			$scope.storeOriginalData($scope.highlightActive, $scope.schedData, true);

			var listData = copyObj($scope.schedules);

			$scope.schedData.$save().then(
				function(ref){

					var scheduleMappingRef = Schedules.getScheduleMappingRef();
					// go through tempScheduleRemove and remove all scheduleID to release the schedule
					angular.forEach($scope.tempScheduleRemove, function(data, id){
						var schedGrpIDRef = DataModels.getModelItemRef('Schedule', data).child('scheduleGroupID');
						schedGrpIDRef.set(null);
						
						var schedRef = DataModels.getModelItemRef('Schedule', data);
						schedRef.once('value', function(dataSnap){
							// write the local schedule for the gateway ID to scheduleMapping
							var ref = scheduleMappingRef.child(dataSnap.val().Gateway);
							dataSnap.val().scheduleGroupID = $scope.schedID;
							var newID = dataSnap.val();
							newID.scheduleGroupID = $scope.schedID;
							ref.push(newID);
						});
						
					});

					var groupSchedRef = $scope.schedRef;
					groupSchedRef.once('value', function(schedSnap){

						angular.forEach($scope.tempSchedules, function(data, id){
							var schedGrpIDRef = DataModels.getModelItemRef('Schedule', data.schedID).child('scheduleGroupID');
							schedGrpIDRef.set($scope.scheduleGroupID);
							// write the group schedule for the gateway ID to scheduleMapping
							var schedRef = DataModels.getModelItemRef('Schedule', data.schedID);
							schedRef.once('value', function(dataSnap){
								// write the local schedule for the gateway ID to scheduleMapping
								var ref = scheduleMappingRef.child(dataSnap.val().Gateway);

								var GroupScheduleToWrite = schedSnap.val();

								GroupScheduleToWrite.key = dataSnap.val().key;
								if( typeof dataSnap.val().loadNum != 'undefined'){
									GroupScheduleToWrite.loadNum = dataSnap.val().loadNum;
								}
								if( typeof dataSnap.val().controlScheduleId != 'undefined'){
									GroupScheduleToWrite.controlScheduleId = dataSnap.val().controlScheduleId;
								}
								GroupScheduleToWrite.scheduleGroupID = $scope.schedID;

								ref.push(GroupScheduleToWrite, function(err){
									if (err) {

									} else {
										//$scope.addedSchedule.push(data);
									}
								});
							});

						});
			
						// needs to loop through added schedules to get an changes to the group
						angular.forEach($scope.addedSchedule, function(data, id){
							// write the group schedule for the gateway ID to scheduleMapping
							var schedRef = DataModels.getModelItemRef('Schedule', data.schedID);
							schedRef.once('value', function(dataSnap){
								// write the local schedule for the gateway ID to scheduleMapping
								var ref = scheduleMappingRef.child(dataSnap.val().Gateway);

								var GroupScheduleToWrite = schedSnap.val();

								GroupScheduleToWrite.key = dataSnap.val().key;
								if( typeof dataSnap.val().loadNum != 'undefined'){
									GroupScheduleToWrite.loadNum = dataSnap.val().loadNum;
								}
								if( typeof dataSnap.val().controlScheduleId != 'undefined'){
									GroupScheduleToWrite.controlScheduleId = dataSnap.val().controlScheduleId;
								}
								GroupScheduleToWrite.scheduleGroupID = $scope.schedID;

								ref.push(GroupScheduleToWrite, function(err){
									if (err) {
									} else {
										//$scope.addedSchedule.push(data);
									}
								});
							});

						});

					});

					$scope.toggleLoading().then(
						function(){
						}
					);
					$modalStack.dismissAll();
					$scope.processEvents();
					$scope.changesPending = [];
					$scope.loadsToRemove = [];
					$scope.loadsToAdd = [];
					$scope.pendingSave = false;
					$scope.tempSchedules = [];
					$scope.addedSchedule = [];
					$scope.tempScheduleRemove = [];
					$scope.loadSchedule($scope.schedID);
					$rootScope.$broadcast('refreshYearCalendar');
					$scope.selectedView = $scope.returnToView;
					$scope.toggleLoading().then(
						function(){
						}
					);
					

				}
			);

		};
	};

	$scope.loadGroupSchedules().then(
		function(){
			//console.log('schedules loaded');
		}
	);

	

}])

;