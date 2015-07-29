/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.Reporting.states", ['ngCsv'])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var main = {
		name: 'auth.Reporting',
		url: '/Reporting',
		templateUrl: 'Reporting/templates/Reporting.tpl.html',
		controller: 'ReportingCtrl',
		resolve: {},
		data: {
			displayGroup: "Reports",
			displayName: "Configurable Reports",
			description: "Allows creating reusable reports.",
			subHeading: "Configurable Reports"
		}
	};

	$stateProvider
	.state(main)
	;

}])

.controller('ReportingCtrl', ['$scope', '$modal', '$rootScope', 'DataModels', 'omniNavSettings', 'FirebaseRootRef', '$timeout', 'es', function($scope, $modal, $rootScope, DataModels, omniNavSettings, FirebaseRootRef, $timeout, es) {
	//omniNavSettings.hide();

	$scope.dataReady = false; // denotes when the data has been loaded
	// make sure an ng-grid gets here use /src/common/angular-dashboard-framework/scripts/dashboard.js as an example
	// lines 598 - 648

	$scope.buildGetQueryParams = function(filter){
		if(filter){
			var qp = "?";
			if( filter.Name ){
				qp = qp+'Name='+filter.Name+'&';
			}
			return qp;
		} else {
			return '';
		}
	};

	var myHeaderCellTemplate = '<div class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{cursor: col.cursor}" ng-class="{ ngSorted: !noSortVisible }">'+
	'<div ng-click="col.sort($event)" ng-class="\'colt\' + col.index" class="ngHeaderText">{{col.displayName}}<br>'+
	'<input ng-model="gridFilter[col.displayName]" ng-change="search(gridFilter)" type="text" class="form-control input-sm"></div>'+
	'<div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div>'+
	'<div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div>'+
	'<div class="ngSortPriority">{{col.sortPriority}}</div>'+
	'</div>'+
	'<div ng-show="col.resizable" class="ngHeaderGrip" ng-click="col.gripClick($event)" ng-mousedown="col.gripOnMouseDown($event)"></div>';

	// Used by ng-grid to define columns
	$scope.gridColumnDefs = [
		{ field:'Name', displayName:'Name' },
		{ field:'Value', displayName:'Value' },
		{ field:'Site', displayName:'Site' },
		{ field:'Gateway', displayName:'Gateway' },
		{ field:'PointType', displayName:'PointType' }
		];

	angular.forEach($scope.gridColumnDefs, function(col){
		col.headerCellTemplate = myHeaderCellTemplate;
	});

	// Used by ng-grid to define grid filter
	$scope.gridFilter = {};
	$scope.gridFilterOptions = {};

	$scope.selectedPoints = [];
	// Configuration Options for ng-grid
	$scope.gridOptions = {
		data: 'itemsArray',
		selectedItems: $scope.selectedPoints,
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

	$scope.search = function(gridFilter){

		$timeout.cancel($scope.searchPromise);

		$scope.searchPromise = $timeout(function() { 
			if (!gridFilter || Object.keys(gridFilter).length === 0) { return; }

			$scope.itemsArray = [];
			angular.forEach($scope.originalGridViewPins, function(pin, pinKey){
				for (var filterKey in gridFilter) {
					if (gridFilter[filterKey] && pin[filterKey] && pin[filterKey].toString().toLowerCase().indexOf(gridFilter[filterKey].toLowerCase()) < 0) {
						return;
					}
				}
				$scope.itemsArray.push(angular.copy(pin));
			});
		}, 1000);
	};

	$scope.selectReport = function(){
		var selectReport = $scope.$new();
		var instance = $modal.open({
			scope: selectReport,
			templateUrl: 'Reporting/templates/selectSearch.modal.tpl.html'
		});

		// will need to use the DataModels factory to pull all the sites
		selectReport.siteList = DataModels.getItems('Site').$asObject();
		selectReport.allGatewayList = DataModels.getItems('Gateway').$asObject();

		$scope.siteNames = {};
		$scope.gatewayNames = {};
		$scope.pointTypeNames = {};

		$scope.selected = { site: null, gateway: null };

		selectReport.siteList.$loaded().then(
		function(dataSnap){
			angular.forEach(dataSnap, function(data,id) {
				$scope.siteNames[id] = data.Name;
			});
		});

		FirebaseRootRef.child('dataItems/models/PointType/data/').once('value', function (dataSnap) {
			angular.forEach(dataSnap.val(), function(data,id) {
				$scope.pointTypeNames[id] = data.Name;
			});
		});

		selectReport.loadGateways = function(siteID){
			// gets all the gateways for a particular site
			// you can either get all the gateways and filter out the siteIDs
			// that do not match or use the es factory and do an elasticSearch query

			// stores data into variable selectReport.GatewayList
			selectReport.allGatewayList.$loaded().then(
			function(dataSnap){
				selectReport.gatewayList = {};
				angular.forEach(dataSnap, function(data,id) {
					$scope.gatewayNames[id] = data.Name;
					if (data.Site === siteID) { selectReport.gatewayList[id] = data; }
				});
			});
		};

		$rootScope.$on("logout:request", function(user) {
			instance.close();
			selectReport.$destroy();
		});

		selectReport.closeGroupDialog = function(){
			instance.close();
			selectReport.$destroy();
		};

		$scope.save = function(siteID, gatewayID){

			$scope.dataReady = false;

			var searchObj = {
				index: 'omniboard',
				type: 'Point',
				explain: false,
				lowercaseExpandedTerms: false,
				body: {
					size: 500000,
					sort: ["Name.raw"],
					query: {
						filtered: {
							filter: {
								bool: {
									must: [
										{term: {Site: siteID}},
										{term: {Gateway: gatewayID}}
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
					if (!resp || !resp.hits || !resp.hits.hits) {
						return;
					}

					$scope.itemsArray = [];
					$scope.originalGridViewPins = [];

					angular.forEach(resp.hits.hits, function(data, id) {
						var val = angular.copy(data._source);

						val.Site = $scope.siteNames[val.Site];
						val.Gateway = $scope.gatewayNames[val.Gateway];
						val.PointType = $scope.pointTypeNames[val.PointType];

						$scope.itemsArray.push(val);
						$scope.originalGridViewPins.push(angular.copy(val));
					});
				},
				function(err) {
					//console.error(err);
				}
			);

			// this data needs to end up in a $scope variable so the ng-grid can use it
			selectReport.closeGroupDialog();
			$scope.dataReady = true;
		};

	};

	// open the modal immediately
	$scope.selectReport();

}])

;
