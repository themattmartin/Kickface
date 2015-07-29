angular.module('omniboard.weeklyCalendar', ['ngDragDrop', 'angular-draggable'])
.filter('range', function() {
	return function(input, total) {
		total = parseInt(total,10);
		for (var i=0; i<total; i++){
			input.push(i);
		}
		return input;
	};
})
.directive('weeklyCalendar', function() {
	return {
		restrict: 'EA',
		scope: {
			events: '=',
			schedData: '=',
			selectedView: '=',
			changesPending: '='
		},
		templateUrl: 'weeklyCalendar/weeklyCalendar.tpl.html',
		controller: function($scope, $element, $attrs, $window, $rootScope, $stateParams, $modal, $timeout, $modalStack, $location, $anchorScroll) {     

			var copyObj = function(obj){
				var newObj = {};
				angular.forEach(obj, function(val,id){
					if( id.indexOf('$') !== 0 ){
						newObj[id] = val;
					}
				});
				return newObj;
			};

			

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
					//exceptionModal.exceptionType = angular.copy($scope.schedData);
					exceptionModal.exceptionType = copyObj($scope.schedData);
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

				exceptionModal.schedule = $scope.schedData;

				//exceptionModal.schedFormData = angular.copy($scope.schedData);
				exceptionModal.schedFormData = copyObj($scope.schedData);

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
			
					var copy = angular.copy( $scope.schedData.exception);
					var temp = angular.copy( copy );
					copy.splice(exceptionModal.exceptionType.exceptionID, 1);
					$scope.schedData.exception = copy;
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
							angular.forEach($scope.schedData.exception, function (val, id) {
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

					//var copiedSchedule = angular.copy( $scope.schedData );
					copiedSchedule = copyObj($scope.schedData);
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

					if( typeof $scope.schedData.exception == 'undefined'){
						$scope.schedData.exception = [];
						
					}

					if( exceptionModal.update && exceptionModal.exceptionTypeShort == 'one-time' ){
						
						var updateDate = new Date(timeData.schedStart);
						timeData.schedEnd = timeData.schedStart;
						
						exceptionModal.exceptionType.Name = timeData.Name;
						exceptionModal.exceptionType.frequency = timeData.frequency;
						exceptionModal.exceptionType.Schedule = [{start: timeData.schedStart.getDOY() , end: timeData.schedEnd.getDOY() }];
						$scope.schedData.exception[exceptionModal.exceptionType.exceptionID] = exceptionModal.exceptionType;
						$rootScope.$broadcast('calendar:reload', copiedSchedule);
					} else if(exceptionModal.update && exceptionModal.exceptionTypeShort != 'one-time') {
						$scope.schedData.exception[exceptionModal.exceptionType.exceptionID] = copiedSchedule;
						$rootScope.$broadcast('calendar:reload', copiedSchedule);
					}else{

						var exArray = [];
						for(var item in $scope.schedData.exception){
							exArray.push($scope.schedData.exception[item]);
						}
						$scope.schedData.exception.push(copiedSchedule);
						$rootScope.$broadcast('calendar:add', $scope.schedData);
					}

					exceptionModal.closeExceptionDialog();
					$modalStack.dismissAll();
					//$rootScope.$broadcast('calendar:reload', copiedSchedule);
					//$rootScope.$broadcast('calendar:add', copiedSchedule);
					$rootScope.$broadcast('changesPending', {title:'added '+exceptionModal.exceptionTypeShort+' exception'} );
					$rootScope.$broadcast('refreshYearCalendar');
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

			// get current year for the initial load of the directive. This will be an object
			// that contains the following keys: weekNumber, startDate, endDate
			$scope.draggedObject = null;
			$scope.currentTime = null;
			$scope.onDrop = function(event, ui, data){

				var day =  event.target.attributes['data-day'].value;
				var month = day.split('/')[0];
				var dayNum = day.split('/')[1];
				var time =  event.target.attributes['data-time'].value;
				
				var timeHr = time.substring(0,2);
				var timeMin = time.substring(2,time.length);

				// THis should put the item to the top of the div
				//var dropEl = angular.element(this);
				//angular.element(ui.draggable).detach().css({top: 0,left: 0}).appendTo(event);
				//"2015-05-18T02:00:00"
				var startdate = $scope.draggedObject.start.split('T')[0];
				var startdateMonth = $scope.draggedObject.start.split('T')[0].split('-')[1];
				var startdateDay = $scope.draggedObject.start.split('T')[0].split('-')[2];
				var startdateYear = $scope.draggedObject.start.split('T')[0].split('-')[0];


				// WE HAVE
				var startMoment = moment($scope.draggedObject.start);
				var endMoment = moment($scope.draggedObject.end);
				var duration = moment.duration(endMoment.diff(startMoment));
				var hours = duration.asHours();
				var minutes = duration.asMinutes();
				//turn data-time into a moment and then add the value to it to get the new end time
				var timeblockMoment = moment(startdateYear+'-'+month+'-'+dayNum + "T" + timeHr +":"+timeMin+":00");
				var endMomentFinal = moment(startdateYear+'-'+month+'-'+dayNum + "T" + timeHr +":"+timeMin+":00");
				endMomentFinal = endMomentFinal.add(minutes, 'minutes');
				//2015-05-11T08:00:00-05:00
				var startTime = timeblockMoment.format().split('T')[0] + 'T' + timeblockMoment.format().split('T')[1].split('-')[0];
				var endTime = endMomentFinal.format().split('T')[0] + 'T' + endMomentFinal.format().split('T')[1].split('-')[0];

				$scope.draggedObject.start = startTime;
				$scope.draggedObject.end = endTime;

				if( $scope.draggedObject.exception ){
					$scope.schedData.exception[$scope.draggedObject.exceptionID].Days[$scope.draggedObject.dayNumber].timeblocks[$scope.draggedObject.timeblockIndex].end = {hr: endMomentFinal.format('HH'), mn: endMomentFinal.format('mm')};
					$scope.schedData.exception[$scope.draggedObject.exceptionID].Days[$scope.draggedObject.dayNumber].timeblocks[$scope.draggedObject.timeblockIndex].start = {hr: timeblockMoment.format('HH'), mn: timeblockMoment.format('mm')};
				} else {
					$scope.schedData.Days[$scope.draggedObject.dayNumber].timeblocks[$scope.draggedObject.timeblockIndex].end = {hr: endMomentFinal.format('HH'), mn: endMomentFinal.format('mm')};
					$scope.schedData.Days[$scope.draggedObject.dayNumber].timeblocks[$scope.draggedObject.timeblockIndex].start = {hr: timeblockMoment.format('HH'), mn: timeblockMoment.format('mm')};
				}

				$rootScope.$broadcast('changesPending', {title:'Schedule Timeblock Change'} );	
				// once done set the draggedObject back to null;
				
				$scope.draggedObject = null;
			};
			$scope.onStart = function (event, ui, data, day, id, key) {
				// set the object being dragged so that the onDrop event knows about it
				$scope.draggedObject = $scope.thisWeeksTimeBlocks[day][id][key];
			};
			// Drag over handler. 
			$scope.onDragOver = function (event, ui, title, $index) {
				//console.log('onDragOver ', title, $index);
			};

			// Resize Y. 
			$scope.onResizeY = function (draggedObject) {
				var units = Math.floor(draggedObject.blockHeight * 6 / 31);
				var minutes = 5 * units;
				var endMoment = moment(draggedObject.start);
				endMoment = endMoment.add(minutes, 'minutes');
				var endMomentParts = endMoment.format().split('T');
				draggedObject.end = endMomentParts[0] + 'T' + endMomentParts[1].split('-')[0];

				console.log("draggedObject", draggedObject);
				if(draggedObject.exception === true){
					$scope.schedData.exception[draggedObject.exceptionID].Days[draggedObject.dayNumber].timeblocks[draggedObject.timeblockIndex].end = {hr: endMoment.format('HH'), mn: endMoment.format('mm')};
					} else {
				$scope.schedData.Days[draggedObject.dayNumber].timeblocks[draggedObject.timeblockIndex].end = {
					hr: endMoment.format('HH'),
					mn: endMoment.format('mm')
				};
				}
				$rootScope.$broadcast('changesPending', { title: 'Schedule Timeblock Change' });
				$scope.draggedObject = null;
			};

			$scope.timeArray = [];
			for(var i=0;i<24;i++){
				var ampm = i >= 12 ? "pm" : "am";
				var hrFormat = i.toString().length < 2 ? "0"+i : i;
				$scope.timeArray.push( {format: hrFormat+":00 "+ampm, value:hrFormat+"00"} );
				$scope.timeArray.push( {format: hrFormat+":30 "+ampm, value:hrFormat+"30"} );

			}

			$scope.moment = moment();
			$scope.loadItemsForWeek = function(prevNext){
				if(prevNext == 'add'){
					$scope.moment = $scope.moment.add(1, 'week');
				} else if(prevNext == 'sub') {
					$scope.moment = $scope.moment.subtract(1, 'week');
				}

				$scope.thisWeeksTimeBlocks = {};

				$scope.weekObject = {
					weekNumber: parseInt( angular.copy($scope.moment).format('w') ), 
					startDate: angular.copy($scope.moment).startOf('week')._d,
					endDate: angular.copy($scope.moment).endOf('week')._d
				};

				//build out week of dates
				$scope.weekDates = [];
				for(var i=0; i<7 ; i++){
					$scope.weekDates.push( angular.copy($scope.moment).startOf('week').add(i,'day').format('MM/DD') );
				}

				//loop through to get the events for this week
				for(var j=0; j<$scope.events[0].length;j++){
					var startMoment = moment($scope.events[0][j].start);
					var endMoment = moment($scope.events[0][j].end);
					if( startMoment.isBetween($scope.weekObject.startDate , $scope.weekObject.endDate ) ){
						if( typeof $scope.thisWeeksTimeBlocks[startMoment.format('MM/DD')] == 'undefined' ){
							$scope.thisWeeksTimeBlocks[startMoment.format('MM/DD')] = {};
						}

						var start = $scope.events[0][j].start.split('T')[1].split(':')[0];
						var end = $scope.events[0][j].end.split('T')[1].split(':')[0];

						
							var duration = moment.duration(endMoment.diff(startMoment));
							var hours = duration.asHours();
							var minutes = duration.asMinutes();
							console.log( hours , minutes );

						var blockHeight = (parseFloat(hours)) * 62; // in pixels

						$scope.events[0][j].blockHeight = blockHeight.toString();

						console.log("$scope.events[0][j].blockHeight", $scope.events[0][j].blockHeight);

						var hrSection = (parseInt(startMoment.format('HH')) * 2);
						var mnSection = (parseInt(startMoment.format('mm')));
						if( mnSection >= 30 ){
							hrSection = hrSection + 1;
						}
						
						
						if( typeof $scope.thisWeeksTimeBlocks[startMoment.format('MM/DD')][hrSection] == 'undefined' ){
							$scope.thisWeeksTimeBlocks[startMoment.format('MM/DD')][hrSection] = [];
						}
						$scope.events[0][j].eventKey = j;
						$scope.thisWeeksTimeBlocks[startMoment.format('MM/DD')][hrSection].push( $scope.events[0][j] );
					}
				}
				
			};

			$scope.$watchCollection('events', function(newV, oldV){
				if( typeof newV	!= 'undefined'){
					if( newV.length > 0){
						//$scope.selectedView = 'loading';
						$scope.thisWeeksTimeBlocks = null;
						$scope.loadItemsForWeek();
					} else {

					}
				}
			});

		}
	};
})

;
