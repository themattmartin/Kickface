angular.module('omniboard.scheduler', [])

.directive('ngRightClick', function($parse) {
	return function(scope, element, attrs) {
		var fn = $parse(attrs.ngRightClick);
		element.bind('contextmenu', function(event) {
			scope.$apply(function() {
				event.preventDefault();
				fn(scope, {$event:event});
			});
		});
	};
})

.directive('calendar', function() {
	return {
		restrict: 'E',
		scope: {
			data: '=',
			month: '=',
			schedule: '=',
			selectedView: '=',
			dec: '&',
			inc: '&',
			year: '=',
			pendingSave: '=',
			changesPending: '='
		},
		templateUrl: 'Schedules/templates/calendar.tpl.html',
		controller: function($scope, $element, $attrs, $modal, $rootScope, FirebaseRootRef, $modalStack) {
			$scope.incrementMonth = function(){
				$scope.inc();
			};

			$scope.decrementMonth = function(){
				$scope.dec();
			};

			$scope.monthID = $scope.month;

			$scope.openPanel = function($event, monthID, item, object, year, key)	{
				var month = monthID;
				var day = item;
				var schedule = object;
				var id = key;

				$rootScope.$broadcast('openException', null, month, day, schedule, year, id);				
			};
			
		}
	};
})

.directive('scheduler', function() {
	return {
		restrict: 'E',
		scope: {
			schedule: '=',
			selectedView: '=',
			pendingSave: '=',
			changesPending: '='
		},

		templateUrl: 'Schedules/templates/scheduler.tpl.html',
		controller: function($scope, $element, $attrs, $rootScope, $modal, $timeout, $modalStack, $location, $anchorScroll) {     

			var copyObj = function(obj){
				var newObj = {};
				angular.forEach(obj, function(val,id){
					if( id.indexOf('$') !== 0 ){
						newObj[id] = val;
					}
				});
				return newObj;
			};

			$rootScope.exceptionModalOpen = false;
			$rootScope.$on("calendar:update", function(evt, startDate, endDate, exception, exceptionID) {
				$scope.getEachDays(data.start, data.end, val , id);
			});

			$scope.startMonth = 1;
			$scope.totalMonths = 12;
			$scope.today = new Date();
			$scope.month = $scope.today.getMonth();
			$scope.currentYear = $scope.today.getFullYear();
			//$scope.currentView = $scope.selectedView;
			
			$rootScope.$on('openException', function (evt, event, month, day, type, year, key) {
				$scope.openUp(event, month, day, type, year, key);
			});

			$scope.openUp = function(event, month, day, type, year, key){
				// we are going to need to show the nav menu
				// we are going to need to show the nav menu
				 
				var exceptionModal = $scope.$new();
				exceptionModal.alerts = [];
				exceptionModal.syncAllTimeblocks = false;
				exceptionModal.selectedDate = new Date(year, month, day);
				exceptionModal.selectedEndDate = new Date(year, month, day);
				exceptionModal.endDate = new Date(exceptionModal.selectedEndDate.setDate(day + 1));
				exceptionModal.exceptionToUpdate = key;
				if( typeof exceptionModal.time == 'undefined'){
					exceptionModal.time = {};
					exceptionModal.time.frequency = 'Once';
				}
				exceptionModal.time.schedStart = exceptionModal.selectedDate;
				exceptionModal.time.schedEnd = exceptionModal.endDate;
				exceptionModal.exceptionToUpdate = day;
				exceptionModal.buildModelData = function(){
					if( typeof exceptionModal.time == 'undefined'){
						exceptionModal.time = {};
						exceptionModal.time.frequency = 'Once';
					}
					if( typeof exceptionModal.time.timeblocks == 'undefined'){
						exceptionModal.time.timeblocks = {};
					}
				};
				//exceptionModal.exceptionType = angular.copy(type);
				exceptionModal.exceptionType = angular.copy(type);
				if( typeof exceptionModal.exceptionType != 'undefined'){
					exceptionModal.update = true;
				}
				exceptionModal.addOneTime = function(){
					//Since we allow a one-time exception over a range, it is no longer an update
					if(exceptionModal.exceptionType.type == 'date-range'){
						exceptionModal.update = false;
					}
					exceptionModal.addException = 'newOneTime';
					exceptionModal.newExceptionType = 'One Time';
					exceptionModal.exceptionTypeShort = 'one-time';
					
					for( var i = 0; i <= 6; i++){
						if( exceptionModal.selectedDate.getDay() != i ){
							if( typeof exceptionModal.exceptionType.Days[i].timeblocks != 'undefined'){
								delete exceptionModal.exceptionType.Days[i].timeblocks;
							} 
						}
					}
				};
				exceptionModal.addDateRange = function(){
					// As per comment above
					if(exceptionModal.exceptionType.type == 'date-range'){
						exceptionModal.update = true;
					}
					exceptionModal.addException = 'newDateRange';
					exceptionModal.newExceptionType = 'Date Range';
					exceptionModal.exceptionTypeShort = 'date-range';
					for( var i = 0; i <= 6; i++){
						if( typeof exceptionModal.exceptionType.Days[i].timeblocks == 'undefined'){
							exceptionModal.exceptionType.Days[i].timeblocks = [];
						}
					}
				};
				if(typeof exceptionModal.exceptionType == "undefined"){
					//exceptionModal.exceptionType = angular.copy($scope.schedule);
					exceptionModal.exceptionType = copyObj($scope.schedule);
					exceptionModal.exceptionType.Days=[{Name:"Sunday", timeblocks: []},
												{Name:"Monday", timeblocks: []},
												{Name:"Tuesday", timeblocks: []},
												{Name:"Wednesday", timeblocks: []}, 
												{Name:"Thursday", timeblocks: []}, 
												{Name:"Friday", timeblocks: []}, 
												{Name:"Saturday", timeblocks: []}];

					exceptionModal.addOneTime();
					exceptionModal.update = false;
				}
				if( exceptionModal.update === true ){

					if( exceptionModal.exceptionType.type == 'one-time'){
						exceptionModal.addException = 'newOneTime';
						
						exceptionModal.initialYear = (new Date()).getFullYear();
						exceptionModal.exceptionTypeShort = 'one-time';
						exceptionModal.dateFromDay = function(year, day){
							var date = new Date(year, 0); // initialize a date in `year-01-01`
							return new Date(date.setDate(day)); // add the number of days
						};
						exceptionModal.time = {Name:exceptionModal.exceptionType.Name, frequency: exceptionModal.exceptionType.frequency,  timeblocks: {}, schedStart: exceptionModal.dateFromDay(exceptionModal.initialYear, exceptionModal.exceptionType.Schedule[0].start),schedEnd: exceptionModal.dateFromDay(exceptionModal.initialYear, exceptionModal.exceptionType.Schedule[0].start)};
						angular.forEach(exceptionModal.exceptionType.Days, function(val, id){


							if( typeof val.timeblocks != 'undefined' && val.timeblocks.length > 0){

								var startHrData = val.timeblocks[0].start.hr;
								var startMnData = val.timeblocks[0].start.mn;
								var endHrData = val.timeblocks[0].end.hr;
								var endMnData = val.timeblocks[0].end.mn;

								exceptionModal.time.timeblocks = {
										
									start : {hr: startHrData, mn: startMnData },
									end : {hr: endHrData, mn: endMnData}
									
								};

							}


						});

					} else {

						exceptionModal.initialYear = (new Date()).getFullYear();
						
						exceptionModal.dateFromDay = function(year, day){
							var date = new Date(year, 0); // initialize a date in `year-01-01`
							return new Date(date.setDate(day)); // add the number of days
						};

						exceptionModal.time = {
							Name: exceptionModal.exceptionType.Name,
							frequency: exceptionModal.exceptionType.frequency,
							timeblocks : [],
							schedStart: exceptionModal.dateFromDay(exceptionModal.initialYear, exceptionModal.exceptionType.Schedule[0].start),
							schedEnd: exceptionModal.dateFromDay(exceptionModal.initialYear, exceptionModal.exceptionType.Schedule[0].end)
						};

						angular.forEach(exceptionModal.exceptionType.Days, function(val, id){
							if( typeof val.timeblocks != 'undefined' && val.timeblocks.length > 0){
								//buildModelData();

								var startHrData = val.timeblocks[0].start.hr;
								var startMnData = val.timeblocks[0].start.mn;
								var endHrData = val.timeblocks[0].end.hr;
								var endMnData = val.timeblocks[0].end.mn;

								exceptionModal.time.timeblocks[id] = {
									start :{hr: startHrData, mn: startMnData },
									end : {hr: endHrData, mn: endMnData}
								};
							}
						});
						exceptionModal.addDateRange();
					}
				}
				exceptionModal.openTime1 = function($event) {
					$event.preventDefault();
					$event.stopPropagation();

					exceptionModal.opened1 = true;
					
				};
				exceptionModal.openTime2 = function($event) {
					$event.preventDefault();
					$event.stopPropagation();

					exceptionModal.opened2 = true;
				};
				exceptionModal.formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
				exceptionModal.format = exceptionModal.formats[0];

				exceptionModal.newData = [{Name:"", Show:"", end:"", start:""}];

				exceptionModal.schedule = $scope.schedule;

				//exceptionModal.schedFormData = angular.copy($scope.schedule);
				exceptionModal.schedFormData = copyObj($scope.schedule);

				exceptionModal.monthAbbrs = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sept", "Oct", "Nov", "Dec" ];
				exceptionModal.month = exceptionModal.monthAbbrs[month];
				exceptionModal.day = day;
				
				exceptionModal.initialYear = (new Date()).getFullYear();

				exceptionModal.dateFromDay = function(year, day){
					var date = new Date(year, 0, 1); // initialize a date in `year-01-01`
					return (new Date(date.setDate(day))).getTime(); // add the number of days
				};

				exceptionModal.addTimeblock = function(key){
					var obj = {
						end: {hr:null, mn:null},
						start: {hr:null, mn:null}
					};
					if( typeof exceptionModal.exceptionType.Days[key].timeblocks == 'undefined'){
						exceptionModal.exceptionType.Days[key].timeblocks = [];
					}
					if( exceptionModal.exceptionType.Days[key].timeblocks.length == 3){
						exceptionModal.insertUniqueAlerts("danger", "Hardware Limitation: Unable to add more than three timeblocks");
					} else {
						exceptionModal.exceptionType.Days[key].timeblocks.push(obj);
						exceptionModal.flagTime(key, exceptionModal.exceptionType.Days[key].timeblocks.length - 1, exceptionModal.syncAllTimeblocks);
					}				
				};

				exceptionModal.closeExceptionDialog = function(){
					$modalStack.dismissAll();
					
					exceptionModal.$destroy();
					$rootScope.exceptionModalOpen = false;				
				};

				exceptionModal.removeTimeblock = function(key, id){
					exceptionModal.exceptionType.Days[key].timeblocks.splice(id,1);
					delete exceptionModal.TimesToUpdate[key][id];
				};

				exceptionModal.deleteException = function(){

					var copy = angular.copy( $scope.schedule.exception);
					var temp = angular.copy( copy );
					copy.splice(exceptionModal.exceptionType.exceptionID, 1);
					$scope.schedule.exception = copy;
					exceptionModal.closeExceptionDialog();
					$rootScope.$broadcast('changesPending', {title:"Deleted Exception"} );
					$rootScope.$broadcast('refreshYearCalendar');
				};

				exceptionModal.closeAlert = function(index) {
					exceptionModal.alerts.splice(index, 1);
				};			
				
				exceptionModal.insertUniqueAlerts = function(inType, inMsg){
					for(var i = 0; i < exceptionModal.alerts.length; i++)
					{
						if(exceptionModal.alerts[i]['msg'] == inMsg){
							return;
						}
					}
					exceptionModal.alerts.push({type: inType,msg: inMsg});
					// set the location.hash to the id of
					// the element you wish to scroll to.
					$location.hash('alerts');

					// call $anchorScroll()
					$anchorScroll();
				};
				exceptionModal.validateExceptionName = function (exceptionName) {
					if(typeof exceptionName === 'undefined'|| exceptionName.length === 0){
						exceptionModal.requiredField = true;
						return false;
					}
					angular.forEach(exceptionModal.exceptionType.exception, function (val) {
						if (exceptionName.toLowerCase() == val.Name.toLowerCase()) {
							exceptionModal.nameInUse = true;
							return false;
							}
						});
					return true;
				};
				exceptionModal.saveNewException = function(timeData){
	
					exceptionModal.requiredField = false;
					exceptionModal.nameInUse = false;
					Date.prototype.getDOY = function() {
						var onejan = new Date(this.getFullYear(),0,0);
						return Math.ceil((this - onejan) / 86400000);
					};

					Date.prototype.getDOYoneTime = function() {
						var onejan = new Date(this.getFullYear(),0,1);
						return Math.ceil((this - onejan) / 86400000);
					};

					//Clear all older alerts
					while(exceptionModal.alerts.length > 0) {
						exceptionModal.alerts.pop();
					}
					exceptionModal.validateExceptionName(timeData.Name);
					if(exceptionModal.nameInUse || exceptionModal.requiredField){
						return;
					}
					angular.forEach(exceptionModal.exceptionType.Days, function (val, data) {
						var timeslots = [];
						angular.forEach(exceptionModal.exceptionType.Days[data].timeblocks, function (time, timeblocks) {
							
							if(time.start.mn === "" && time.start.hr !== ""){
								time.start.mn = "00";
							}

							if(time.end.mn === "" && time.end.hr !== ""){
								time.end.mn = "00";
							}

							if(time.start.hr !== '' && time.start.mn !== ''){
								var timeAsMinutesStart = parseInt((time.start.hr*60) + time.start.mn);
								var timeAsMinutesEnd = parseInt((time.end.hr*60) + time.end.mn);
								if(time.start.hr == null || time.start.mn == null){
								exceptionModal.insertUniqueAlerts("danger", "Start time of a timeblock cannot be after its end time.");
							}
							if(time.end.hr == null || time.end.mn == null){
									exceptionModal.insertUniqueAlerts("danger", "Start time of a timeblock cannot be after its end time.");
								}
								if(timeAsMinutesStart >= timeAsMinutesEnd){
									exceptionModal.insertUniqueAlerts("danger", "Start time of a timeblock cannot be after its end time.");
								}
								for(var i = 0; i < timeslots.length; i++){
									slot = timeslots[i];

									if((timeAsMinutesStart > slot[0] && timeAsMinutesStart < slot[1]) || (timeAsMinutesEnd > slot[0] && timeAsMinutesStart < slot[1]) || (timeAsMinutesStart <= slot[0] && timeAsMinutesEnd >= slot[1])){
										exceptionModal.insertUniqueAlerts("danger", "Timeblocks selected overlap that of other exception timeblocks.");
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

					// We sort the timeblocks of each day in ascending order
					if((typeof exceptionModal.alerts == 'undefined') || exceptionModal.alerts.length === 0){
						angular.forEach(exceptionModal.exceptionType.Days, function(data, id){
							if (data.timeblocks) {
								data.timeblocks.sort(function(a, b){
									return (a.start.hr + a.start.mn) - (b.start.hr + b.start.mn);
								});
							}
						});
					}


					if(exceptionModal.exceptionTypeShort == 'date-range'){
						start = timeData.schedStart.getDOY();
						end = timeData.schedEnd.getDOY();
						if(start > end)	
						{
							exceptionModal.insertUniqueAlerts("danger", "Start date of a range cannot be after the end date.");
						}
						if(exceptionModal.update === false){
							angular.forEach($scope.schedule.exception, function (val, id) {
								angular.forEach(val.Schedule, function (data, index) {
									if((start >= data.start && start <= data.end) || (end >= data.start && end <= data.end) || (start <= data.start && end >= data.end)){
										invalidDate = true;
										exceptionModal.insertUniqueAlerts("danger", "Date range for this exception, overlaps that of other exceptions.");
									}
								});
							});
						}
					}

					if(exceptionModal.alerts.length){
						return;
					}
				
					// do something with the data
					var cleanOutTimeblocks = function(){
						for( var i=0;i<7;i++){
							if( typeof copiedSchedule.Days[i].timeblocks != 'undefined'){
								delete copiedSchedule.Days[i].timeblocks;
							}
						}
					};

					//var copiedSchedule = angular.copy( $scope.schedule );
					copiedSchedule = copyObj($scope.schedule);
					delete copiedSchedule.exception;
					delete copiedSchedule.Time;
					delete copiedSchedule.date;
					delete copiedSchedule.description;
					copiedSchedule.Name = timeData.Name;
					copiedSchedule.frequency = timeData.frequency;
					
					copiedSchedule.type = exceptionModal.exceptionTypeShort;
					
					var exceptionDate = new Date();

					if( exceptionModal.exceptionTypeShort == 'date-range'){

						copiedSchedule.Days = exceptionModal.exceptionType.Days;
						copiedSchedule.Schedule = [{start: timeData.schedStart.getDOY() , end: timeData.schedEnd.getDOY() }];
						$rootScope.$broadcast('refreshYearCalendar');
					} else {
						
						exceptionDate.setMonth(month);
						exceptionDate.setDate(exceptionModal.day);
						copiedSchedule.Days = exceptionModal.exceptionType.Days;
						copiedSchedule.Schedule = [{
							start: timeData.schedStart.getDOY(),
							end: timeData.schedStart.getDOY()
						}];
						$rootScope.$broadcast('refreshYearCalendar');
					}

					if( typeof $scope.schedule.exception == 'undefined'){
						$scope.schedule.exception = [];
						
					}

					if( exceptionModal.update && exceptionModal.exceptionTypeShort == 'one-time' ){
						
						var updateDate = new Date(timeData.schedStart);
						timeData.schedEnd = timeData.schedStart;
						
						exceptionModal.exceptionType.Name = timeData.Name;
						exceptionModal.exceptionType.frequency = timeData.frequency;
						exceptionModal.exceptionType.Schedule = [{start: timeData.schedStart.getDOY() , end: timeData.schedEnd.getDOY() }];
						$scope.schedule.exception[exceptionModal.exceptionType.exceptionID] = exceptionModal.exceptionType;
						$rootScope.$broadcast('calendar:reload', copiedSchedule);
						$rootScope.$broadcast('refreshYearCalendar');
					
					} else if(exceptionModal.update && exceptionModal.exceptionTypeShort != 'one-time') {
						$scope.schedule.exception[exceptionModal.exceptionType.exceptionID] = copiedSchedule;
						$rootScope.$broadcast('calendar:reload', copiedSchedule);
						$rootScope.$broadcast('refreshYearCalendar');
					
					}else{

						var exArray = [];
						for(var item in $scope.schedule.exception){
							exArray.push($scope.schedule.exception[item]);
						}

						$scope.schedule.exception.push(copiedSchedule);
						$rootScope.$broadcast('calendar:add', $scope.schedule);
						$rootScope.$broadcast('refreshYearCalendar');
					}

					exceptionModal.closeExceptionDialog();
					$modalStack.dismissAll();
					//$rootScope.$broadcast('calendar:reload', copiedSchedule);
					//$rootScope.$broadcast('calendar:add', copiedSchedule);
					$rootScope.$broadcast('changesPending', {title:'added '+exceptionModal.exceptionTypeShort+' exception'} );
					//$rootScope.$broadcast('refreshYearCalendar');
				};
				exceptionModal.TimesToUpdate = {};
				exceptionModal.flagTime = function(dayId, timeblockId, checked){
					if( typeof exceptionModal.TimesToUpdate[dayId] == 'undefined' ){
						exceptionModal.TimesToUpdate[dayId] = {};
						if( typeof checked == 'undefined' ){
							exceptionModal.TimesToUpdate[dayId][timeblockId] = true;
						}else{
							exceptionModal.TimesToUpdate[dayId][timeblockId] = checked;
						}
					}else{
						if( typeof checked == 'undefined' ){
							exceptionModal.TimesToUpdate[dayId][timeblockId] = !(exceptionModal.TimesToUpdate[dayId][timeblockId]);
						}else{
							exceptionModal.TimesToUpdate[dayId][timeblockId] = checked;
						}
					}
				};
				exceptionModal.updateTime = function(rowID, time, timepart, newValue, id){
					$scope.formChange = true;
					// THIS MIGHT NEED TO BE ANGULAR.FOREACH
					if(exceptionModal.TimesToUpdate[id] && exceptionModal.TimesToUpdate[id][rowID]){					
						for(var item in exceptionModal.TimesToUpdate){
							if (exceptionModal.exceptionType.Days[item].timeblocks[rowID] && exceptionModal.TimesToUpdate[item][rowID]) {
								exceptionModal.exceptionType.Days[item].timeblocks[rowID][time][timepart] = newValue;
							}
						}
					}
				};
				exceptionModal.applyChecked = function(checked){
					exceptionModal.syncAllTimeblocks = checked;
					angular.forEach(exceptionModal.exceptionType.Days,function(val, data){
						if (typeof exceptionModal.exceptionType.Days[data].timeblocks != 'undefined') {
							angular.forEach(exceptionModal.exceptionType.Days[data].timeblocks,function(time, timeblocks){
								exceptionModal.flagTime(data, timeblocks, checked);
							});
						}
					});
				};
				
				$modalStack.dismissAll();
				var instance = $modal.open({
					
					scope: exceptionModal,
					templateUrl: 'Schedules/templates/exceptionModal.tpl.html'
					
				});

			};

			$scope.getEachDays = function(start, end, val, exceptionID){
				val.exceptionID = exceptionID;

				for( var i=start;i<=end;i++){
					var startOfException = $scope.dateFromDay($scope.today.getFullYear(), i);
					if( typeof $scope.months[startOfException.getMonth()].exception == 'undefined'){
						$scope.months[startOfException.getMonth()].exception = {};
					}
					$scope.months[startOfException.getMonth()].exception[startOfException.getDate()] = val;
				}
			};

			$scope.$watchCollection('schedule', function(newVal, oldVal){
				if( typeof newVal != 'undefined' ){
					newVal.$loaded().then(function(data){
						// we need to use loaded or the exception data might not be there when the watch fires
						$scope.processSchedule();
						Date.prototype.getDOY = function() {
							var onejan = new Date(this.getFullYear(),0,1);
							return Math.ceil((this - onejan) / 86400000);
						};
						$scope.dateFromDay = function(year, day){
							var date = new Date(year, 0); // initialize a date in `year-01-01`
							return new Date(date.setDate(day)); // add the number of days
						};
						if( typeof newVal.exception != 'undefined'){
							angular.forEach(newVal.exception, function (val, id) {
								//Make sure that the one-time exceptions overwrite the range exceptions
								if (val !== undefined && val !== null) {
									angular.forEach(val.Schedule, function (data, index) {
										if(val.type == "date-range"){
											$scope.getEachDays(data.start, data.end, val, id);
										}
									});
									angular.forEach(val.Schedule, function (data, index) {
										if(val.type == "one-time"){
											$scope.getEachDays(data.start, data.end, val, id);
										}
									});
								}
							});
						}
					});
				}
			});

			$scope.incrementMonth = function(){
				$scope.month = $scope.month + 1;
				if($scope.month > 11){
					$scope.month = 0;
				}
			};

			$scope.decrementMonth = function(){
				$scope.month = $scope.month - 1;
				if($scope.month < 0){
					$scope.month = 11;

				}
			};

			$scope.countOfDays = 0;
			$scope.startCountingDays = false;

			$scope.daysInMonth = function(month,year) {
				return new Date(year, month, 0).getDate();
			};
			$scope.countRemainingDaysInMonth = function(){
				if( startCountingDays ){
					countOfDays += 1;
				}
			};
			//check each week and if the week is empty then delete it
			$scope.cleanEmptyWeeks = function(weeks){
				for( var i=0;i<weeks.length;i++){
					if( weeks[i].length === 0){
						weeks.splice(i,1);
					}
				}
				return weeks;
			};
			$scope.buildMonthsArray = function(startMonth, totalMonths, currentYear){
				var monthNames = [ "January", "February", "March", "April", "May", "June",
				"July", "August", "September", "October", "November", "December" ];
				var monthAbbrs = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun",
				"Jul", "Aug", "Sept", "Oct", "Nov", "Dec" ];

				var completeArray = [];

				for( var i=0;i<12;i++){
					var obj = {Name: monthNames[i], Abbr: monthAbbrs[i], calendar: [], Year: currentYear};
					completeArray.push(obj);
				}

				return completeArray;
			};

			$scope.processSchedule = function(){
				var months = $scope.buildMonthsArray($scope.startMonth, $scope.totalMonths, $scope.year );

				//process for each month
				for(var month = $scope.startMonth; month < ($scope.totalMonths+$scope.startMonth); month++){

					var startOfMonth = new Date($scope.today.getFullYear(), month-1, 1, 0, 0, 0 );
					var startOfMonthDayOfWeek = startOfMonth.getDay();
					var totalDaysInMonth = $scope.daysInMonth(month, startOfMonth.getFullYear() );
					var weeks = [];
					countOfDays = 0;
					startCountingDays = false;

					//build out each week
					for( var j=0;j<6;j++ ){
						var week = [];
						// days
						for( var k=0;k<7;k++ ){
							// handle the start of the month
							if( j === 0 && k == startOfMonthDayOfWeek ){			
								startCountingDays = true;
								$scope.countRemainingDaysInMonth();
							}
							if( countOfDays > totalDaysInMonth ){
								break;
							}
							week.push(countOfDays);
							$scope.countRemainingDaysInMonth();
						}	
						weeks.push(week);
					}

					months[month-1].calendar = $scope.cleanEmptyWeeks(weeks);
				}
				$scope.months = months;
			};
		}
	}; 
});
