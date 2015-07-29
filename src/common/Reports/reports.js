/**
* Data Item Module for Omniboard
*/
angular.module('omniboard.Reports', ['ngCsv'])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

	var main = {
		name: 'auth.Reports',
		url: '/Reports',
		templateUrl: 'Reports/templates/Report.tpl.html',
		controller: 'ReportsCtrl',
		resolve: {},
		data: {
          dataModelName: 'default',
          title: 'Reports',
          displayGroup: 'Reports',
          displayName: 'Reports',
          description: 'Show Available Reports.',
          subHeading: 'Reports'
        }
	};
	var kwhUsage = {
		name: 'auth.kWhUsage',
		url: '/kWhUsage',
		templateUrl: 'Reports/templates/kwhUsage.tpl.html',
		controller: 'kwhUsageCtrl',
		resolve: {},
		data: {
          dataModelName: 'default',
          title: 'Reports',
          displayGroup: 'Reports',
          displayName: 'Reports',
          description: 'Show Available Reports.',
          subHeading: 'Reports'
        }
	};

	var kWhUsageByArea = {
		name: 'auth.kWhUsageByArea',
		url: '/kWhUsageByArea',
		templateUrl: 'Reports/templates/kwhUsage.tpl.html',
		controller: 'kwhUsageCtrl',
		resolve: {},
		data: {
          dataModelName: 'default',
          title: 'Reports',
          displayGroup: 'Reports',
          displayName: 'Reports',
          description: 'Show Available Reports.',
          subHeading: 'Reports'
        }
	};

	$stateProvider
	.state(main)
	.state(kwhUsage)
	.state(kWhUsageByArea)
	;

}])
.controller('kwhUsageCtrl', ['$scope', '$http', 'DataModels', '$rootScope', '$state', function($scope, $http, DataModels,  $rootScope, $state) {

	$scope.itemsArray = [];
	var kWhUsageByArea = ($state.current.url === '/kWhUsageByArea');

	// Used by ng-grid to define columns
	$scope.gridColumnDefs = [
		{field:'Site', displayName:'Site'},
		{field:'Sunday', displayName:'Sunday'},
		{field:'Monday', displayName:'Monday'},
		{field:'Tuesday', displayName:'Tuesday'},
		{field:'Wednesday', displayName:'Wednesday'},
		{field:'Thursday', displayName:'Thursday'},
		{field:'Friday', displayName:'Friday'},
		{field:'Saturday', displayName:'Saturday'},
		{field:'weeksum', displayName:'Week Sum'}
	];

	var getDayAsString = function(dayOfWeek){
		var weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
		return weekdays[dayOfWeek];
	};

	// Configuration Options for ng-grid
	$scope.gridOptions = {
		data: 'itemsArray',
		columnDefs: 'gridColumnDefs',
		multiSelect: false,
		enableRowSelection: false,
		enablePaging:false,
		showColumnMenu: false,
		showFooter:true,
		showGroupPanel:true,
		sortInfo: { fields: ['Site'], directions: ['asc'] },
		rowTemplate: '<div ng-dblclick="redirectToSite(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">'+
			'<div class="ngVerticalBar" ng-style="{height: 30}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>'+
			'<div ng-cell></div></div>'
		};

	$scope.loading = true;
	$scope.dataLoaded = false;
	$scope.allDataLoaded = false;

	$scope.sites = {};
	DataModels.fetchFilteredDate('Site', {}).then(function(sites) {
		angular.forEach(sites,function(site) {
			$scope.sites[site._id] = site;
		});

		DataModels.fetchFilteredDate('Gateway', { GatewayType: '-JU9n33Ad3gTc_QgROAd' }).then(function(data) {
			var gateways = [];
			angular.forEach(data,function(gateway) {
				gateways.push(gateway._id);
			});

			DataModels.fetchFilteredDate('Point', { PointType: '-JUt9jZN9fF7H-TyWfmn', Gateway: gateways }).then(function(points) {
				var sitePoints = {};

				for( var idx in points ){
					if (!sitePoints[points[idx].Site]) { sitePoints[points[idx].Site] = []; }
					sitePoints[points[idx].Site].push(points[idx]._id);
				}

				var SD = new Date();
				SD.setDate(SD.getDate()-7);
				var ED = new Date();

				angular.forEach(sitePoints,function(pointIds,site){
					var user = $rootScope.loginService.getCurrentUser();
					var webServiceURL = '/getKWHHistory?cnum='+user.customerKey+'&pt='+pointIds+'&interval=1&units=day&sd='+SD.getTime()+'&ed='+ED.getTime()+'&rollupFunction=mean&interpolate=false';

					$http({method: 'GET', url: webServiceURL}).success(function(processedData, status, headers, config) {
						if( typeof $scope.sites[site] != 'undefined'){
							var rData = { Site: $scope.sites[site].Name, region: $scope.sites[site].Region };
							rData["Sunday"] = 0;
							rData["Monday"] = 0;
							rData["Tuesday"] = 0;
							rData["Wednesday"] = 0;
							rData["Thursday"] = 0;
							rData["Friday"] = 0;
							rData["Saturday"] = 0;
							rData["weeksum"] = 0;
							var weekSum=0;
							angular.forEach(processedData,function(data){
								var sum=0;
								angular.forEach(data.values,function(value){
									angular.forEach(value,function(v,key){
										sum += v;
									});
								});
								var nDate = new Date(data.ts);
								if (kWhUsageByArea && $scope.sites[site].Area) { sum = sum/$scope.sites[site].Area; }
								rData[getDayAsString(nDate.getDay())] = parseInt(sum.toFixed(0));
								weekSum += parseInt(sum.toFixed(0));
							});
							rData.weeksum = parseInt(weekSum.toFixed(0));
							$scope.itemsArray.push(rData);
							$scope.loading = false;
							$scope.dataLoaded = true;
						}
					});
				});
				$scope.allDataLoaded = true;
			});
		});
	});
}])

.controller('ReportsCtrl', ['$scope', '$modal', '$http', 'DataModels', 'omniNavSettings', '$firebase', 'FirebaseRootRef', '$timeout', 'es', '$q', '$rootScope', '$state', function($scope, $modal, $http, DataModels, omniNavSettings, $firebase, FirebaseRootRef, $timeout, es, $q, $rootScope, $state) {

	//omniNavSettings.hide();

	$scope.itemsArray = [];
	$scope.allDataLoaded = false;
	var myHeaderCellTemplate = '<div class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{cursor: col.cursor}" ng-class="{ ngSorted: !noSortVisible }">'+
	'<div ng-click="col.sort($event)" ng-class="\'colt\' + col.index" class="ngHeaderText">{{col.displayName}}<br>'+
	'<input ng-model="gridFilter[col.field]" ng-change="search(gridFilter)" type="text" class="form-control input-sm"></div>'+
	'<div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div>'+
	'<div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div>'+
	'<div class="ngSortPriority">{{col.sortPriority}}</div>'+
	'</div>'+
	'<div ng-show="col.resizable" class="ngHeaderGrip" ng-click="col.gripClick($event)" ng-mousedown="col.gripOnMouseDown($event)"></div>';

	// Used by ng-grid to define columns
	$scope.gridColumnDefs = [
		{ field: 'PointType',  displayName: 'Point Type' },
		{ field: 'Point',  displayName: 'Point Name' },
		{ field: 'Device', displayName: 'Device Name' },
		{ field: 'Site', displayName: 'Site Name' },
		{ field: 'Date',   displayName: 'Date' },
		{ field: 'Time',   displayName: 'Time' },
		{ field: 'Value',  displayName: 'Value' }
		];

	angular.forEach($scope.gridColumnDefs, function(col){
		col.headerCellTemplate = myHeaderCellTemplate;
	});

	var groupRef = DataModels.getModelItemsRef('Groups');
	groupRef.once('value',function(dataSnap){
		$scope.allGroups = dataSnap.val();
	});

	var siteRef = DataModels.getModelItemsRef('Site');
	siteRef.once('value',function(dataSnap){
		$scope.allSites = dataSnap.val();
	});

	// Used by ng-grid to define grid filter
	$scope.gridFilter = {};
	$scope.gridFilterOptions = {};

	// Configuration Options for ng-grid
	$scope.gridOptions = {
		data: 'itemsArray',
		columnDefs: 'gridColumnDefs',
		multiSelect: true,
		enableRowSelection: true,
		enablePaging:false,
		showColumnMenu: true,
		showFooter:true,
		showFilter:true,
		showGroupPanel:true,
		headerRowHeight: 60,
		rowTemplate: '<div ng-dblclick="redirectToSite(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">'+
			'<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>'+
			'<div ng-cell></div></div>'
	};

	$scope.reports = {
		'r11' : { Name : 'Enterprise' },
		'r22' : { Name : 'Regional' },
		'r33' : { Name : 'Group' },
		'r44' : { Name : 'Site' },
		'r66' : { Name : 'Individual Sensor Level' }
	};

	$scope.getDatesFromDateRange = function(dateRangeOption) {
		var startDate, endDate;
		switch ( dateRangeOption ) {
			case "Custom":
				startDate = endDate = 'undefined';
				break;
			case "Month To Date":
				d = new Date();
				startDate = new Date(d.getYear()+1900, d.getMonth(), 1, 0, 0, 0);
				endDate = d;
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Today":
				startDate = new Date();
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Week To Date":
				function getStartOfWeek(d) {
					d = new Date(d);
					var day = d.getDay(),
					diff = d.getDate() - day + (day === 0 ? -6:0); // adjust when day is sunday
					var returnDate = new Date(d.setDate(diff));
					returnDate.setHours(0);
					returnDate.setMinutes(0);
					returnDate.setSeconds(0);
					return returnDate;
				}
				startDate= getStartOfWeek( new Date() ).getTime();
				endDate = new Date().getTime();
				break;
			case "Year To Date":
				function startOfYear(d){
					return new Date(d.getFullYear(),0,1,0,0,0);
				}
				d = new Date();
				startDate = startOfYear( new Date() );
				endDate = d;
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last Year":
				startDate = new Date();
				startDate.setDate(startDate.getDate()-365);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last 30 Days":
				startDate = new Date();
				startDate.setDate(startDate.getDate()-30);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
			case "Last Week":
				startDate = new Date();
				startDate.setDate(startDate.getDate()-6);
				endDate = new Date();
				startDate = startDate.getTime();
				endDate = endDate.getTime();
				break;
		}
		reportConfigurationScope.startDate = startDate;
		reportConfigurationScope.endDate = endDate;
		return { SD: startDate, ED: endDate };
	};

	var reportConfigurationScope = $scope.$new();

	$scope.configureReport = function() {
		$scope.thisReport = true;
		$scope.viewName = 'Load Saved Report';
		reportConfigurationScope.selectedReport = 'r11';
		reportConfigurationScope.dateRangeOption = 'Custom';
		reportConfigurationScope.reports = $scope.reports;
		reportConfigurationScope.pointtypes = $scope.allPointTypes;

		reportConfigurationScope.setModelNames = function(){
			var deferred = $q.defer();

			DataModels.getModelNamesRef().once('value',function(dataSnap) {
				reportConfigurationScope.modelNames = dataSnap.val();
				deferred.resolve(reportConfigurationScope.modelNames);
			});

			return deferred.promise;
		};

		reportConfigurationScope.loadModelTypes = function(modelName){
			reportConfigurationScope.modelTypes = null;
			reportConfigurationScope.dataLoading = true;

			var modelTypesRef = DataModels.getModelTypesRef(modelName);
			modelTypesRef.child('data').once('value',function(dataSnap){
				reportConfigurationScope.modelTypes = dataSnap.val();
				reportConfigurationScope.dataLoading = false;
			});
		};

		// All Date Picker Configuration - START
		reportConfigurationScope.formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
		reportConfigurationScope.format = reportConfigurationScope.formats[0];
		reportConfigurationScope.maxDate = new Date();

		reportConfigurationScope.openedStart = false;

		reportConfigurationScope.openStart = function($event) {
			$event.preventDefault();
			$event.stopPropagation();
			reportConfigurationScope.openedStart = !reportConfigurationScope.openedStart;
		};

		reportConfigurationScope.openedEnd = false;

		reportConfigurationScope.openEnd = function($event) {
			$event.preventDefault();
			$event.stopPropagation();
			reportConfigurationScope.openedEnd = !reportConfigurationScope.openedEnd;
		};

		reportConfigurationScope.dateOptions = {
			formatYear: 'yy',
			startingDay: 1
		};
		// All Date Picker Configuration - END

		reportConfigurationScope.setupReportDetails = function(selectedReport){
			reportConfigurationScope.boolCustomReport = true;
			reportConfigurationScope.customReports = null;
			reportConfigurationScope.modelNames = null;
			reportConfigurationScope.groups = null;
			reportConfigurationScope.sites = null;
			reportConfigurationScope.pointtypes = $scope.allPointTypes;

			var reportName = (selectedReport ? $scope.reports[selectedReport].Name : '');

			if (reportName === 'Enterprise') {
				// do nothing
			}else if (reportName === 'Regional' || reportName === 'Group') {
				reportConfigurationScope.groups = $scope.allGroups;
			}else if (reportName === 'Site') {
				reportConfigurationScope.sites = $scope.allSites;
			}else if (reportName === 'Individual Sensor Level') {
				reportConfigurationScope.modelTypes = null;
				reportConfigurationScope.dataLoading = true;

				reportConfigurationScope.setModelNames().then(function() {
					reportConfigurationScope.dataLoading = false;
				});
			} else {
				reportConfigurationScope.populateCustomReports();
			}
		};

		reportConfigurationScope.populateCustomReports = function() {
			reportConfigurationScope.dataLoading = true;
			reportConfigurationScope.customReports = null;

			var user = $rootScope.loginService.getCurrentUser();
			if(user){
				var userReportsRef = $firebase(DataModels.getModelItemRef('User',user.uid).child('reports')).$asObject();
				if (userReportsRef) {

					var customReports = {};

					userReportsRef.$loaded().then(function(dataSnap){
						angular.forEach(dataSnap,function(data,reportID){
							data._id = reportID;
							customReports[reportID] = data;
						});

						reportConfigurationScope.boolCustomReport = true;
						reportConfigurationScope.modelTypes = null;
						reportConfigurationScope.customReports = customReports;

						reportConfigurationScope.setModelNames().then(function() {
							reportConfigurationScope.dataLoading = false;
						});
					});
				}
			}

		};

		reportConfigurationScope.setupCustomReportDetails = function(customReportID){
			var reportDetails = reportConfigurationScope.customReports[customReportID];
			reportConfigurationScope.reportID = '';
			reportConfigurationScope.modelTypes = null;
			reportConfigurationScope.dataLoading = true;
			reportConfigurationScope.boolCustomReport = true;

			reportConfigurationScope.setModelNames().then(function() {
				reportConfigurationScope.dataLoading = false;
			});

			if (reportDetails) {
				reportConfigurationScope.selectedReport = reportDetails.SelectedReport;
				reportConfigurationScope.reportID = reportDetails._id;
				reportConfigurationScope.reportName = reportDetails.Name;
				reportConfigurationScope.modelName = reportDetails.Model;
				reportConfigurationScope.modelType = reportDetails.ModelType;
				reportConfigurationScope.dateRangeOption = (reportDetails.DateRangeOption ? reportDetails.DateRangeOption : 'Custom');
				reportConfigurationScope.startDate = (reportDetails.StartDate ? new Date(reportDetails.StartDate) : null);
				reportConfigurationScope.endDate = (reportDetails.EndDate ? new Date(reportDetails.EndDate) : null);
				reportConfigurationScope.rollUp = reportDetails.RollUp;
				reportConfigurationScope.numberOfRollUp = reportDetails.NumberOfRollUp;
				reportConfigurationScope.selectedPointTypes = reportDetails.SelectedPointTypes;

				if (reportDetails.Site) {
					reportConfigurationScope.selectedSite = reportDetails.Site;
					reportConfigurationScope.sites = $scope.allSites;
				}
				if (reportDetails.Group) {
					reportConfigurationScope.selectedGroup = reportDetails.Group;
					reportConfigurationScope.groups = $scope.allGroups;
				}

				reportConfigurationScope.loadModelTypes(reportDetails.Model);
			} else {
				$scope.resetReportSetup();
			}
		};

		var instance = $modal.open({
			scope: reportConfigurationScope,
			templateUrl: 'Reports/templates/reportConfiguration.tpl.html',
			size: 'md'
		});

		reportConfigurationScope.closeDialog = function(justCancel){
			instance.close();
			reportConfigurationScope.$destroy();
			if(typeof justCancel != 'undefined'){
				$state.go("auth.dashboard.ready", {name: 'home', modelName: "Site" });
			}
		};

		reportConfigurationScope.toggleReport = function(){
			if($scope.thisReport === true){
				reportConfigurationScope.setupReportDetails(null);
				$scope.thisReport = false;
				$scope.viewName = 'Custom Report';
			}else if($scope.thisReport === false){
				reportConfigurationScope.reportName = '';
				reportConfigurationScope.selectedReport = '';
				reportConfigurationScope.dateRangeOption = null;
				reportConfigurationScope.startDate = null;
				reportConfigurationScope.endDate = null;
				reportConfigurationScope.numberOfRollUp = null;
				reportConfigurationScope.rollUp = null;
				$scope.thisReport = true;
				$scope.viewName = 'Load Saved Report';
			}
		};

		reportConfigurationScope.markAsCustom = function() {
			reportConfigurationScope.boolCustomReport = true;
		};
	};

	$scope.getModelPoints = function(modelName, modelType) {

		var deferred = $q.defer();

		if (modelName && modelType) {
			var modelsFilter = $scope.selectedPointTypes ? { PointType: $scope.selectedPointTypes } : {};
			modelsFilter[modelName + 'Type'] = modelType;

			DataModels.fetchFilteredDate(modelName, modelsFilter).then(function(allModels){
				var modelIDs = [];
				angular.forEach(allModels, function(modelData) {
					modelIDs.push(modelData._id);
				});
				var filter = {};
				filter[modelName] = modelIDs;
				DataModels.fetchFilteredDate('Point', filter).then(function(allPoints){
					deferred.resolve(allPoints);
				});
			});
		} else {
			var filter = $scope.selectedPointTypes ? { PointType: $scope.selectedPointTypes } : {};
			DataModels.fetchFilteredDate('Point', filter).then(function(allPoints){
				deferred.resolve(allPoints);
			});
		}

		return deferred.promise;
	};

	/* getGroupPoints */
	$scope.getGroupPoints = function (groupID) {
		var groupPoints = [];
		var sitesDoneCount = 0;
		var siteCount = 0;
		var deferred = $q.defer();

		var groupRef = DataModels.getModelItemRef('Groups', groupID);
		groupRef.child('sites').once('value', function (dataSnap) {
			angular.forEach(dataSnap.val(), function (siteData, id) {
				siteCount++;
				var promise = $scope.getSitePoints(siteData.id);
				promise.then(function(sitePoints) {
					sitesDoneCount++;
					for (var i = 0; i < sitePoints.length; i++) {
						groupPoints.push(sitePoints[i]);
					}
					if(sitesDoneCount == siteCount){
						deferred.resolve(groupPoints);
					}
				});
			});
		});

		return deferred.promise;
	};

	/* getSitePoints */
	$scope.getSitePoints = function (siteID) {
		var sitePoints = [];
		var deferred = $q.defer();
		var filter = $scope.selectedPointTypes ? { Site: siteID, PointType: $scope.selectedPointTypes } : { Site: siteID };

		DataModels.fetchFilteredDate('Point', filter).then(function(allPoints){
			for (var i=0; i < allPoints.length; i++) {
				sitePoints.push(allPoints[i]);
			}
			deferred.resolve(sitePoints);
		});

		return deferred.promise;
	};

	$scope.saveCustomReport = function(reportID,reportRef) {
		var user = $rootScope.loginService.getCurrentUser();
		if( user ){
			var userRef = DataModels.getModelItemRef('User',user.uid);
			var userReportsRef = userRef.child('reports');
			if (reportID && reportID.length > 0) {
				userReportsRef.child(reportID).update(reportRef, function() { reportConfigurationScope.closeDialog(); } );
			} else {
				var reportObj = angular.copy(reportRef);
				reportObj.StartDate = reportObj.StartDate.toString();
				reportObj.EndDate = reportObj.EndDate.toString();
				userReportsRef.push(reportObj, function() { reportConfigurationScope.closeDialog(); } );
			}
		}
	};

	$scope.resetReportSetup = function() {
		reportConfigurationScope.selectedReport = null;
		reportConfigurationScope.reportID = null;
		reportConfigurationScope.reportName = '';
		reportConfigurationScope.modelName = '';
		reportConfigurationScope.modelTypes = null;
		reportConfigurationScope.dateRangeOption = '';
		reportConfigurationScope.startDate = new Date();
		reportConfigurationScope.endDate = new Date();
		reportConfigurationScope.numberOfRollUp = '1';
		reportConfigurationScope.rollUp = '1day';
	};

	$scope.deleteCustomReport = function(reportID) {
		var user = $rootScope.loginService.getCurrentUser();
		if( user ){
			var userRef = DataModels.getModelItemRef('User',user.uid);
			userRef.child('reports').child(reportID).remove(function() {
				delete reportConfigurationScope.customReports[reportID];
				$scope.resetReportSetup();
			});
		}
	};

	$scope.newReportDialog = function(selectedReport, reportID, reportName, modelName, modelType, dateRangeOption, startDate, endDate, rollUp, numberOfRollUp, selectedGroup, selectedSite, selectedPointTypes){
		var newReportDialogScope = $scope.$new();
		newReportDialogScope.selectedReport = selectedReport;
		newReportDialogScope.reportID = reportID;
		newReportDialogScope.reportName = reportName;
		newReportDialogScope.modelName = modelName;
		newReportDialogScope.rollUp = rollUp;
		newReportDialogScope.numberOfRollUp = numberOfRollUp;
		newReportDialogScope.selectedGroup = selectedGroup;
		newReportDialogScope.selectedSite = selectedSite;
		newReportDialogScope.dateRangeOption = dateRangeOption;
		newReportDialogScope.startDate = startDate;
		newReportDialogScope.endDate = endDate;
		newReportDialogScope.selectedPointTypes = selectedPointTypes;

		newReportDialogScope.closeDialog = function(){
			instance.close();
			newReportDialogScope.$destroy();
		};

		var instance = $modal.open({
			scope: newReportDialogScope,
			templateUrl: 'Reports/templates/newReportModal.tpl.html'
		});

		newReportDialogScope.saveReportName = function(rptName){
			reportConfigurationScope.boolCustomReport = true;
			$scope.processReport(newReportDialogScope.selectedReport, newReportDialogScope.reportID, rptName, newReportDialogScope.modelName, newReportDialogScope.modelType, newReportDialogScope.dateRangeOption, newReportDialogScope.startDate, newReportDialogScope.endDate, newReportDialogScope.rollUp, newReportDialogScope.numberOfRollUp, newReportDialogScope.selectedGroup, newReportDialogScope.selectedSite, newReportDialogScope.selectedPointTypes);
			newReportDialogScope.closeDialog();
		};
	};

	$scope.processReport = function (selectedReport, reportID, reportName, modelName, modelType, dateRangeOption, startDate, endDate, rollUp, numberOfRollUp, group, site, selectedPointTypes){
		var reportRef = {
			SelectedReport: selectedReport,
			Name: reportName,
			Model: modelName || '',
			ModelType: modelType || '',
			DateRangeOption: dateRangeOption || '',
			StartDate: startDate || '',
			EndDate: endDate || '',
			RollUp: rollUp,
			NumberOfRollUp: numberOfRollUp,
			Group: group || '',
			Site: site || '',
			SelectedPointTypes: selectedPointTypes || ''
		};

		$scope.selectedPointTypes = selectedPointTypes;

		if (reportConfigurationScope.boolCustomReport && reportID !== 'ONLYRUN') {
			$scope.saveCustomReport(reportID,reportRef);
		} else {
			reportConfigurationScope.closeDialog();
		}

		if (site) {
			$scope.getSitePoints(site).then(function(allPoints){
				$scope.runReport(reportRef, allPoints);
			});
		} else if (group) {
			$scope.getGroupPoints(group).then(function(allPoints){
				$scope.runReport(reportRef, allPoints);
			});
		} else {
			$scope.getModelPoints(modelName, modelType).then(function(allPoints){
				$scope.runReport(reportRef, allPoints);
			});
		}
	};

	$scope.runReport = function(reportRef, allPoints) {
		if (!allPoints || allPoints.length === 0) {
			$scope.alerts = [{type:"danger", msg: 'No points information found.'}];
			$scope.dataLoaded = true;
			return;
		}

		var length = (allPoints.length < 1000 ? allPoints.length : 1000);
		var points = '';

		$scope.points = {};

		for (var i=0; i < length; i++) {
			var pointData = allPoints[i];
			points += pointData._id + '.';
			$scope.points[pointData._id] = pointData;
		}

		points = points.replace(/\.$/,'');

		$scope.dataLoaded = false;
		$scope.itemsArray = [];

		$scope.devices = {};

		DataModels.fetchFilteredDate('Device',{}).then(function(devices){
			angular.forEach(devices,function(device) {
				$scope.devices[device._id] = device.Name;
			});
		});

		$scope.sites = {};

		DataModels.fetchFilteredDate('Site',{}).then(function(sites){
			angular.forEach(sites,function(site) {
				$scope.sites[site._id] = site.Name;
			});
		});

		var StartDate,EndDate;

		if (reportRef.DateRangeOption !== undefined && reportRef.DateRangeOption.length > 0 && reportRef.DateRangeOption !== 'Custom') {
			var res = $scope.getDatesFromDateRange(reportRef.DateRangeOption);
			StartDate = res.SD;
			EndDate = res.ED;
		} else {
			StartDate = reportRef.StartDate;
			EndDate = reportRef.EndDate;
		}

		var user = $rootScope.loginService.getCurrentUser();
		var webServiceURL = '/getReportData';
		var reqData = {
			cnum: user.customerKey,
			sd: (new Date(StartDate)).getTime(),
			ed: (new Date(EndDate)).getTime(),
			ru: reportRef.RollUp,
			noru: reportRef.NumberOfRollUp,
			pts: points
		};

		$http({method: 'POST', data: reqData, url: webServiceURL}).
		success(function(processedData, status, headers, config) {
			if( processedData.length > 0){
				if( processedData.length === 0 ){
					$scope.config.title.text = 'No Data';
				}
				angular.forEach(processedData, function(data){
					var deviceName = $scope.devices[data.d];
					var siteName = $scope.sites[data.s];
					var Device = (deviceName ? deviceName : data.d);
					var Site = (siteName ? siteName : data.s);
					var Point = ($scope.points[data.p] ? $scope.points[data.p].Name : data.p);
					var PointType = ($scope.allPointTypes && $scope.points[data.p] ? $scope.allPointTypes[$scope.points[data.p].PointType].Name : data.p);
					angular.forEach(data.values,function(value,datetime) {
						var date = new Date(datetime);
						var pushingObj = { PointType: PointType, Point: Point, Device: Device, Site: Site, Date: date.toLocaleDateString(), Time: date.toLocaleTimeString(), Value: value };
						$scope.itemsArray.push( pushingObj );
					});
				});
				$scope.dataLoaded = true;
				$scope.dataLoadedError = false;
				$scope.allDataLoaded = true;
			} else {
				$scope.alerts = [{type:"danger", msg: 'No points information found.'}];
				$scope.dataLoadedError = true;
				$scope.dataLoaded = true;
				$scope.allDataLoaded = true;
			}
		}).
		error(function(data, status, headers, config) {
			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;
		});
	};

	$scope.closeAlert = function (index) {
		$scope.alerts.splice(index, 1);
	};

	var pointTypeRef = DataModels.getModelItemsRef('PointType');
	pointTypeRef.once('value',function(dataSnap){
		$scope.allPointTypes = dataSnap.val();
		// open the modal immediately
		$scope.configureReport();
	});

	$scope.showReportConfigurationModal = function(){
		reportConfigurationScope = $scope.$new();
		$scope.configureReport();
	};
}])

;