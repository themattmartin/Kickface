/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.alarmReports.states", ['ngCsv'])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var alarms = {
		name: 'auth.alarmReports',
		abstract: true,
		url: '/alarmReports',
		templateUrl: 'alarmReports/templates/entry.tpl.html',
		controller: 'alarmReportsCtrl'
	};

	var list = {
		name: 'auth.alarmReports.list',
		parent: alarms,
		url: '/list',
		templateUrl: 'alarmReports/templates/list.tpl.html',
		authRequired: true ,
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}]
		},
		data: {
			title: "Weekly Alarm Summary",
			displayGroup: "Alarms",
			displayName: "Weekly Alarm Summary",
			description: "Displays alarm summary on weekly basis.",
			subHeading: "Alarm Summary"
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
.controller('alarmReportsCtrl', ['$scope', '$stateParams', '$state', '$modal', '$rootScope','Perms', '$http','omniNavSettings', 'DataModels', "FirebaseRootRef", "alarmFormatter", "Settings", "es", "$window", function($scope, $stateParams, $state, $modal, $rootScope, Perms, $http, omniNavSettings, DataModels, FirebaseRootRef, alarmFormatter, Settings, es, $window) {

	//omniNavSettings.hide();

	$scope.loading = true;

	var sevenDaysAgo = (new Date()).getTime() - 168*60*60*1000;
	var searchObj = {
		index: es.getIndexName(),
		type: 'AuditLog',
		explain: false,
		searchType: 'query_then_fetch',
		lowercaseExpandedTerms: false,
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
							{
								"range": {
									"lastModified": {
										"gte": sevenDaysAgo
									}
								}
							},
							{
								"term": {
									"modelName": "alarms"
								}
							}
							]
						}
					}
				}
			}
		}
	};

	var currentUser = $rootScope.loginService.getCurrentUser();


	$scope.itemsArray = [];
	$scope.originalItems = [];
	$scope.auditedObjects = {};
	es.get().search(searchObj)
	.then(function(queryResults){
		// we need to rebuild the key to use for the data we have from tempoDB
		angular.forEach(queryResults.hits.hits, function(val,id){
			var key =
                "Model:" + val._source.item.Model +
                ".Property:" + val._source.item.Property +
                ".ExpressionType:" + val._source.item.ExpressionType +
                ".ExpressionCategory:" + val._source.item.ExpressionCategory +
                ".Name:" + val._source.item.Name +
                ".ItemId:" + val._source.item.ItemId + "." + val._source.item.ItemId;

			$scope.auditedObjects = {};

			if(typeof $scope.auditedObjects.Name == 'undefined'){
				$scope.auditedObjects.Name = val._source.item.Name;
			}
			if(typeof $scope.auditedObjects.Site == 'undefined'){
				$scope.auditedObjects.Site = val._source.item.SiteName;
			}
			if(typeof $scope.auditedObjects.Device == 'undefined'){
				if( val._source.item.DeviceName ){
					$scope.auditedObjects.Device = val._source.item.DeviceName;
				} else {
					$scope.auditedObjects.Device = '';
				}
			}
			if(typeof $scope.auditedObjects == 'undefined'){
				$scope.auditedObjects = {};
			}
			var ts = (new Date( parseInt(val._source.item.Occurred))).toISOString() ;
			if(typeof $scope.auditedObjects.History == 'undefined'){
				$scope.auditedObjects.History = {};
			}
			if(typeof $scope.auditedObjects.User == 'undefined'){
				$scope.auditedObjects.User = val._source.User;
			}
			if(typeof $scope.auditedObjects.History[ts] == 'undefined'){
				$scope.auditedObjects.History[ts] = {};
			}
			if(typeof $scope.auditedObjects.History[ts].attrs == 'undefined'){
				$scope.auditedObjects.History[ts].attrs = {};
			}
			$scope.auditedObjects.History[ts].attrs = val._source.item;
			$scope.auditedObjects.History[ts].v = 100;
			$scope.auditedObjects.History[ts].User = val._source.User;
			$scope.auditedObjects.History[ts].reason = val._source.item.reason;

			$scope.itemsArray.push($scope.auditedObjects);
			$scope.originalItems.push($scope.auditedObjects);

		});

		$scope.deviceDetails = {};
		DataModels.fetchFilteredDate('Device', {}).then(function(devices) {
			angular.forEach(devices,function(data) {
				$scope.deviceDetails[data._id] = data;
			});
		});

		$http({method: 'GET', url: '/getAlarmReport?cnum='+currentUser.customerKey}).
			success(function(data, status, headers, config) {

				angular.forEach(data, function(val,id){

					angular.forEach(val.points, function(ptData,index){

						var tempoKey = val.data.key;
						//console.log('index', index);

						$scope.auditedObjects = {};

						$scope.auditedObjects.Name = (val.data.attributes.Name ? val.data.attributes.Name : null);
						$scope.auditedObjects.Site = (val.data.attributes.SiteName ? val.data.attributes.SiteName : null);

						if( val.data.attributes.DeviceName ){
							$scope.auditedObjects.Device = val.data.attributes.DeviceName;
						} else if ( val.data.attributes.Device && $scope.deviceDetails[val.data.attributes.Device] ) {
							$scope.auditedObjects.Device = $scope.deviceDetails[val.data.attributes.Device].Name;
						} else {
							$scope.auditedObjects.Device = null;
						}

						$scope.auditedObjects.History = {};

						if ( ptData.values[val.data.key] ){
							$scope.auditedObjects.History[ptData.ts] = {values: ptData.values, attrs: {}};
							if(val.data.attributes){
								$scope.auditedObjects.History[ptData.ts].attrs = val.data.attributes;
							}
						}

						$scope.itemsArray.push($scope.auditedObjects);
						$scope.originalItems.push($scope.auditedObjects);

					});
				});

				$scope.reportData = $scope.itemsArray;
				console.log('$scope.reportData', $scope.reportData);

				$scope.loading = false;

                $scope.generateConfig = function(reportData){
                    var report = {},
                        colorMapping = {
                            0: '#FFFFFF',
                            1: '#FACFCF',
                            2: '#FF9999',
                            3: '#FF6666',
                            4: '#FF4D4D',
                            5: '#FF3333',
                            6: '#FF1919',
                            7: '#FF0000'
                        };

                    var generatedReport = reportData.slice().concat(reportData.slice());

                    function generateFakeData(idx, reportItem){
                        switch (idx) {
                            case 0:
                                reportItem.value = 0;
                                break;
                            case 1:
                                reportItem.value = 5;
                                break;
                            case 4:
                                reportItem.value = 3;
                                break;
                            case 5:
                                reportItem.value = 1;
                                break;
                            case 6:
                                reportItem.value = 7;
                                break;
                        }
                    }

                    generatedReport.forEach(function(reportItem){
                        var alarmDate = Object.keys(reportItem.History)[0];
                        var date = new Date(alarmDate);
                        var dateKey = date.getMonth() + 1 + "/" + date.getDate();

                        if (report[dateKey]) {
                            report[dateKey]['value']++;
                            report[dateKey]['alarms'].push(reportItem);
                        } else {
                            report[dateKey] = {};
                            report[dateKey]['value'] = 1;
                            report[dateKey]['alarms'] = [reportItem];
                        }

                        reportItem.name = dateKey;
                    });

                    return Object.keys(report).map(function(val, idx){
                        var reportItem = report[val];

                        generateFakeData(idx, reportItem);

                        var color = reportItem.value > 7 ? colorMapping[7] : colorMapping[reportItem.value];

                        return {
                            name: val,
                            value: 1,
                            color: color,
                            alarms: reportItem.alarms
                        };
                    });
                };

				$scope.heatmapConfig = {
					options: {
						chart: {
							type: 'treemap'
						},
						title: null,
						tooltip: {
							enabled: false
						},
						exporting: {
							enabled: false
						}
					},
					credits: {
						enabled: false
					},
					series: [{
						layoutAlgorithm: 'stripes',
                        data: $scope.generateConfig($scope.reportData)
					}]
				};

			}).
			error(function(data, status, headers, config) {
				console.log('error on get data', data);
			});

		});

	$scope.alarmCall = alarmFormatter;

	var removeCellTemplate = '<center><a class="btn btn-xs btn-danger" ng-click="removeRow(row)" href=""><i class="fa fa-trash-o fa-fw"></i></a></center>';

	// Custom Template for ng-grid Header Cells
	var myHeaderCellTemplate = '<div class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{cursor: col.cursor}" ng-class="{ ngSorted: !noSortVisible }">'+
		'<div ng-click="col.sort($event)" ng-class="\'colt\' + col.index" class="ngHeaderText">{{col.displayName}}<br>'+
		'<input ng-model="gridFilter[col.displayName]" ng-change="search(gridFilter)" type="text" class="form-control input-sm"></div>'+

		'<select class="form-control" ng-model="gridFilter[col.displayName]" '+
		'ng-options="key as type for (key,type) in gridFilterOptions[col.displayName]" ng-change="getFilteredData(gridFilter)">'+
		'<option value="" selected="selected">Select</option></select>'+

		'<div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div>'+
		'<div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div>'+
		'<div class="ngSortPriority">{{col.sortPriority}}</div>'+
		'</div>'+
		'<div ng-show="col.resizable" class="ngHeaderGrip" ng-click="col.gripClick($event)" ng-mousedown="col.gripOnMouseDown($event)"></div>';

	// Used by ng-grid to define columns
	$scope.gridColumnDefs = [
		{field: 'Name', displayName: 'Name', headerCellTemplate: myHeaderCellTemplate},
		{field: 'Site', displayName: 'Site', headerCellTemplate: myHeaderCellTemplate},
		{field: 'Device', displayName: 'DeviceName', headerCellTemplate: myHeaderCellTemplate},
		{field: 'History', displayName: 'History', headerCellTemplate: myHeaderCellTemplate,
			cellTemplate: '<highchart style="height:60px;width:97.7%;" config="heatmapConfig" ng-if="itemsArray.length"></highchart>', width: "25%"}
	];

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
		rowHeight: 60,
		rowTemplate: '<div ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}} {{getAlarmValue(row.entity.attributes, \'Value\')}}">'+
			'<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>'+
			'<div ng-cell></div></div>'
	};



	$scope.popupDialog = function(item, data){
		// THIS IS YOUR NEW SCOPE, INITIALIZE ANY VARIABLES YOU NEED FOR YOUR VIEW HERE
		var addMarkerScope = $scope.$new();
		addMarkerScope.item = item;
		addMarkerScope.data = data;
		if( item.User ){
			var uName = DataModels.getFirstAndLast('User',item.User);
			uName.then(function(data){
				addMarkerScope.UserName = data.Firstname + ' ' + data.Lastname;
			});
		}

		// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
		var instance = $modal.open({
			scope: addMarkerScope,
			templateUrl: 'alarmReports/templates/detail.tpl.html',
			size: 'sm'
		});

		addMarkerScope.closeDialog = function(){
			instance.close();
			//$scope.processEvents();
			addMarkerScope.$destroy();
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			addMarkerScope.closeDialog();
		});

		addMarkerScope.save = function(){
			// DO SOMETHING ON SAVE HERE
			addMarkerScope.closeDialog();
		};
	};

	$scope.alarmName = function(val, field){
		var key = field.split('.');
		return alarmFormatter.getName( val[key[1]] );
	};

	$scope.search = function(gridFilter) {
		$timeout.cancel($scope.searchPromise);
		$scope.searchPromise = $timeout(function() {
			if (!gridFilter || Object.keys(gridFilter).length === 0) { return; }

			$scope.itemsArray = [];
			angular.forEach($scope.originalItems, function(item, itemKey){
				for (var filterKey in gridFilter) {
					if (gridFilter[filterKey] && item[filterKey] && item[filterKey].toString().toLowerCase().indexOf(gridFilter[filterKey].toLowerCase()) < 0) {
						return;
					}
				}
				$scope.itemsArray.push(angular.copy(item));
			});
		}, 1000);
	};

}])

;
