/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.alarmAcknowledge.states", [])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var alarms = {
		name: 'auth.alarms',
		abstract: true,
		//url: '/schedules/:modelName',
		url: '/allAlarms',
		templateUrl: 'alarmAcknowledge/templates/entry.tpl.html',
		controller: 'alarmAcknowledgeCtrl',
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}],
			errorCodes: [ '$firebase', 'FirebaseRootRef', 'firebaseManager', 'initialFirebaseChild', function($firebase, FirebaseRootRef, firebaseManager, initialFirebaseChild){
				var codes = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('errorCodes/lennox')).$asObject();
				return codes;
			}]
		}
	};		

	var list = {
		name: 'auth.alarms.list',
		parent: alarms,
		url: '/list', 
		templateUrl: 'alarmAcknowledge/templates/list.tpl.html', 
		authRequired: true , 
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}],
			errorCodes: [ 'FirebaseRootRef', 'initialFirebaseChild', 'firebaseManager', function(FirebaseRootRef, initialFirebaseChild, firebaseManager){
				var codes = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('errorCodes/lennox'));
				return codes;
			}]
		},
		data: {
			title: "Manage Alarms",
			displayGroup: "Alarms",
			displayName: "Manage Alarms",
			description: "Manage Alarm Configuration.",
			subHeading: "Alarm Management"
		}
	};

	$stateProvider
		.state(alarms)
		.state(list)
	;

}])


/**
 * Controller
 */

.controller('alarmAcknowledgeCtrl', ['$scope', 'Schedules', '$stateParams', '$state', '$modal', '$rootScope','Perms', '$http','omniNavSettings', 'DataModels', "FirebaseRootRef", "alarmFormatter", "Settings", 'errorCodes', 'util', 'ob', function($scope, Schedules, $stateParams, $state, $modal, $rootScope, Perms, $http, omniNavSettings, DataModels, FirebaseRootRef, alarmFormatter, Settings, errorCodes, util, ob) {

	//omniNavSettings.hide();

	$scope.getAlarmValue = function(val, field){
		var key = field.split('.');
		//return alarmFormatter.getName( val[key[1]] ).toLowerCase();
		
		return "text-" + alarmFormatter.getName(val.CurrentValue).toLowerCase();
	};

	var historyCellTemplate = '<alarm-History alarm="row.entity.attributes"></alarm-History>';

	// Custom Template for ng-grid Header Cells
	var myHeaderCellTemplate = '<div class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{cursor: col.cursor}" ng-class="{ ngSorted: !noSortVisible }">'+
		'<div ng-click="col.sort($event)" ng-class="\'colt\' + col.index" class="ngHeaderText">{{col.displayName}}<br>'+
		//'<input ng-model="gridFilter[col.displayName]" ng-change="search(gridFilter)" type="text" class="form-control input-sm"></div>'+

		'<select class="form-control" ng-model="gridFilter[col.displayName]" '+
		'ng-options="key as type for (key,type) in gridFilterOptions[col.displayName]" ng-change="getFilteredData(gridFilter, true)">'+
		'<option value="" selected="selected">Select</option></select>'+
		'<div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div>'+
		'<div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div>'+
		'<div class="ngSortPriority">{{col.sortPriority}}</div>'+
		'</div>'+
		'<div ng-show="col.resizable" class="ngHeaderGrip" ng-click="col.gripClick($event)" ng-mousedown="col.gripOnMouseDown($event)"></div>';

	// Used by ng-grid to define columns
	$scope.gridColumnDefs = [{
		displayName: "",
		cellTemplate: historyCellTemplate,
		sortable:false,
		resizable:false,
		groupable:false,
		width:30
	},{field:'attributes.Name', displayName:'Name',headerCellTemplate: myHeaderCellTemplate},{field:'attributes.ExpressionCategory', displayName:'Category',headerCellTemplate: myHeaderCellTemplate},{field:'attributes.CurrentValue', displayName:'Value',headerCellTemplate: myHeaderCellTemplate, cellTemplate: '<div class="ngCellText ng-scope col1 colt1" ng-class="col.colIndex()"><span ng-cell-text="" class="ng-binding">{{alarmName(row.entity.attributes, col.field)}}</span></div>'},{field:'attributes.SiteName', displayName:'SiteName',headerCellTemplate: myHeaderCellTemplate},{field:'attributes.DeviceName', displayName:'DeviceName',headerCellTemplate: myHeaderCellTemplate}];

	// Used by ng-grid to define grid filter
	$scope.gridFilter = {};
	$scope.gridFilterOptions = {};

	$scope.selectedAlarms = [];
	// Configuration Options for ng-grid
	$scope.gridOptions = {
		data: 'itemsArray',
		selectedItems: $scope.selectedAlarms,
		columnDefs: 'gridColumnDefs',
		multiSelect: true,
		enableRowSelection: true,
		enablePaging:false,
		showColumnMenu: true,
		showFooter:true,
		showFilter:true,
		showGroupPanel:true,
		headerRowHeight: 60,
		rowTemplate: '<div ng-dblclick="redirectToSite(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}} {{getAlarmValue(row.entity.attributes, \'Value\')}}">'+
			'<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>'+
			'<div ng-cell></div></div>'
	};

	$scope.redirectToSite = function(row){
		angular.forEach($scope.devices, function(val,id){
			if (row.entity.attributes.ItemId == id && val.Site) {
				$state.go('auth.dashboard.ready', {name: 'Site Details', modelName: 'Site', scopeID: val.Site});
			}
		});
	};

	$scope.lennoxErrorCodes = errorCodes;

	console.log("errorCodes", errorCodes);

	$scope.alarmName = function(val, field){
		var key = field.split('.');
		if( val.CurrentValue == 500){
		
		}

		if( val.Name == 'Lennox Error'){
			var currentVal = val[key[1]];
			console.log("909", $scope.lennoxErrorCodes[currentVal]);
			if( typeof $scope.lennoxErrorCodes[currentVal] != 'undefined' ){
				return $scope.lennoxErrorCodes[currentVal].label;
			} else {
				return "Unknown Error";
			}
			
		} else {
			return alarmFormatter.getName( val[key[1]] );
		}
	};

	


	/*
	BUILD A DISTINCT LIST OF MODEL TYPES THAT THE EXPRESSIONS ARE BASED ON 
	*/
	$scope.modelNames = {};
	$scope.CategoryNames = {};
	$scope.Names = { 'All Alarms' : 'All Alarms' };
	var expRef = FirebaseRootRef.child('expressions/data');
	expRef.once('value',function(dataSnap){
		angular.forEach(dataSnap.val(), function(val,id){
			$scope.modelNames[val.query.modelName] = val.query.modelName;
			$scope.CategoryNames[val.category] = val.category;
			$scope.Names[id] = id;
		});

		$scope.gridFilterOptions.Name = $scope.Names;
		$scope.gridFilterOptions.Category = $scope.CategoryNames;

		var formattedValues = {300:alarmFormatter.getName(300),500:alarmFormatter.getName(500)};
		var codes = FirebaseRootRef.child('/errorCodes');		
		codes.once("value", function (dataSnap){
			angular.forEach(dataSnap.val(), function (val, id) {
				angular.forEach(val, function (errorCode, index) {			
					var index1 = errorCode.label.indexOf('(');
					var index2 = errorCode.label.indexOf(')');
					alarmCode = errorCode.label.substring(index1 + 1, index2);
					formattedValues[alarmCode] = errorCode.label;
				});
			});
		});
		$scope.gridFilterOptions.Value = formattedValues;
	});

	var loadModel = function(type, callback){
		var fbModels = DataModels.getItems(type).$asObject();
		fbModels.$loaded().then(
		function(data) {
			if(callback){
				callback(data);
			}
		});
	};

	$scope.loadModelTypes = function(model,columnName){
		//returns all site names to the gridFilter.LocationName ng-model
		var modelNamesForFilter = {};
		var fbModels = DataModels.getItems(model).$asObject();
		fbModels.$loaded().then(
			function(dataSnap) {
				angular.forEach(dataSnap, function(val,id){
					modelNamesForFilter[val.Name] = val.Name;
				});
			}
		);
		$scope.gridFilterOptions[columnName] = modelNamesForFilter;
	};
	//initial Call

		var mapFilterData = function(columnName){
			return function(data){
				var modelNamesForFilter = {};
				angular.forEach(data, function(val,id){
					modelNamesForFilter[val.Name] = val.Name;
				});
				$scope.gridFilterOptions[columnName] = modelNamesForFilter;
			};
		};

		/*
			GET ALL NAMES FOR DEVICES AND SITES
		 */
		loadModel('Site', mapFilterData('SiteName'));
		loadModel('Device', function(data){
			mapFilterData('DeviceName')(data);
			$scope.devices = data;
		});


	// get application settings for acknowledgement duration
	Settings.getSetting('Alarms', 'Acknowledgement Duration').then(function(data){
		$scope.snoozeDuration = data.value;
	});


	$scope.buildGetQueryParams = function(filter){
		if(filter){
			var qp = "?";
			if( filter.Name ){
				var filterText = (filter.Name == 'All Alarms' ? '' : filter.Name);
				qp = qp+'Name='+filterText+'&';
			}
			if( filter.Category ){
				qp = qp+'Category='+filter.Category+'&';
			}
			if( filter.Value ){
				qp = qp+'Value='+filter.Value+'&';
			}
			if( filter.SiteName ){
				qp = qp+'SiteName='+filter.SiteName+'&';
			}
			if( filter.DeviceName ){
				qp = qp+'DeviceName='+filter.DeviceName+'&';
			}
			return qp;
		} else {
			return '?';
		}
	};

	$scope.getFilteredData = function(filter,isSearchBox){
		var user = $rootScope.loginService.getCurrentUser();
		$http({method: 'GET', url: '/getAlarmData'+$scope.buildGetQueryParams(filter)+'cnum='+user.customerKey}).

		success(function(data, status, headers, config) {
			if( data.length > 0 ){
				$scope.itemsArray = data;
			}else if(isSearchBox){
				$scope.showSearchResultDialog();
			}
		}).
		error(function(data, status, headers, config) {
			
		});
	};
	$scope.getFilteredData({Value: 500}, false);

	$scope.allOn = false;
	$scope.toggleAll = function(){
		$scope.gridOptions.selectAll(!$scope.allOn);
		$scope.allOn = !$scope.allOn;
	};

	$scope.removeItems = [];
	$scope.acknowledge = function(snoozeTime, reason){
		// reason to be dropped in the audit 
		angular.forEach($scope.selectedAlarms, function (val, id) {
			$scope.removeItems.push(val.id);
			var firebaseURL = '/dataItems/models/' + val.attributes.Model + '/data/' + val.attributes.ItemId + '/' + val.attributes.Property + '/' + val.attributes.ExpressionType.split('|').join('/') + '/' + val.attributes.ExpressionCategory + '/' + val.attributes.Name;
			var fbRef = FirebaseRootRef.child(firebaseURL);

			fbRef.update({silenced: snoozeTime}, function (error) {
				if (error) {
					console.error(error);
					return;
				}

				var alarmKey = util.getKey({
					Model: val.attributes.Model,
					ExpressionType: val.attributes.ExpressionType,
					ExpressionCategory: val.attributes.ExpressionCategory,
					Name: val.attributes.Name,
					ItemId: val.attributes.ItemId
				});

				$http({method: 'GET', url: '/updateAlarmTag?pt=' + alarmKey}).
					success(function (data, status, headers, config) {
						//delete the alarm from ack
						$scope.removeRow(id);
						// log an audit event of what happened
						var alarmItem = val.attributes;
						alarmItem.expiration = snoozeTime;
						alarmItem.reason = reason;
						DataModels.createAudit(ob.modelNames.alarms, alarmItem, val.attributes.AlarmNumber, $scope.currentUser, val.attributes.ExpressionCategory, 'Acknowledged - ' + val.attributes.Name);
					}).
					error(function (data, status, headers, config) {
						console.error(data);
					});
			});
		});
		$scope.cleanUpItems();

	};

	$scope.cleanUpItems = function(){
		/* this is used to clean up items that have been acknowledged 
		if $scope.removeRow is called directly it will splice the 
		array and some items will not be deleted
		*/
		angular.forEach($scope.removeItems, function(val,id){
			angular.forEach($scope.itemsArray, function(data,key){
				if(data.id === val){
					$scope.removeRow(key);
				}
			});
		});
	};

	/**
	 * Called by the UI to delete a row from ng-grid
	 */
	$scope.removeRow = function(index) {
		// removes only one item at a time
		$scope.gridOptions.selectItem(index, false);
		$scope.itemsArray.splice(index, 1);
	};	

	$scope.acknowledgeAlarmDialog = function(){
		var acknowledgeAlarmScope = $scope.$new();
		acknowledgeAlarmScope.acknowledge = {};
		acknowledgeAlarmScope.acknowledge.snoozeDuration = $scope.snoozeDuration;

		var instance = $modal.open({
			scope: acknowledgeAlarmScope,
			templateUrl: 'alarmAcknowledge/templates/acknowledgeAlarm.tpl.html'
		});

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			acknowledgeAlarmScope.$destroy();
		});

		acknowledgeAlarmScope.save = function(){
			var now = new Date();
			var snooze = now.getTime() + (acknowledgeAlarmScope.acknowledge.snoozeDuration * 60 * 60 * 1000);
			$scope.acknowledge(snooze, acknowledgeAlarmScope.acknowledge.ackReason);
			acknowledgeAlarmScope.closeDialog();
		};

		acknowledgeAlarmScope.closeDialog = function(){
			angular.forEach($scope.itemsArray,function(val,id){
				$scope.gridOptions.selectItem(id, false);
			});
			instance.close();
			acknowledgeAlarmScope.$destroy();
		};
	};

	$scope.showSearchResultDialog = function() {
		var modalScope = $scope.$new();

		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'alarmAcknowledge/templates/searchResult.tpl.html',
			size: 'sm'
		});
	
		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};
	};

	$scope.showInstructionDialog = function() {
		var modalScope = $scope.$new();

		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'alarmAcknowledge/templates/instructions.tpl.html',
			size: 'sm'
		});
	
		modalScope.closeDialog = function(){
			instance.close(); 
			modalScope.$destroy();
		};
	};

	$scope.showInstructionDialog();

}])

;
