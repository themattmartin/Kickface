/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.auditLog.states", [])

.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
	var auditLog = {
		name: 'auth.auditLog',
		abstract: true,
		url: '/auditLog',
		templateUrl: 'auditLog/templates/entry.tpl.html',
		controller: 'auditLogCtrl',
		resolve: {
			permissions: ['Perms', function (Perms) {
				return Perms.check();
			}],
			errorCodes: ['$firebase', 'FirebaseRootRef', 'firebaseManager', 'initialFirebaseChild', function ($firebase, FirebaseRootRef, firebaseManager, initialFirebaseChild) {
				var codes = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('errorCodes/lennox')).$asObject();
				return codes;
			}]
		}
	};

	var list = {
		name: 'auth.auditLog.list',
		parent: auditLog,
		url: '/list',
		templateUrl: 'auditLog/templates/list.tpl.html',
		authRequired: true,
		resolve: {
			permissions: ['Perms', function (Perms) {
				return Perms.check();
			}],
			errorCodes: ['FirebaseRootRef', 'initialFirebaseChild', 'firebaseManager', function (FirebaseRootRef, initialFirebaseChild, firebaseManager) {
				var codes = firebaseManager.buildRef(FirebaseRootRef.child(initialFirebaseChild.get()).child('errorCodes/lennox'));
				return codes;
			}]
		},
		data:{
			title: 'Audit Log'
		}
	};

	$stateProvider
	.state(auditLog)
	.state(list)
	;
}])

.controller('auditLogCtrl', ['$scope', 'DataModels', '$state', '$modal', 'es', function ($scope, DataModels, $state, $modal, es) {

	// All Date Picker Configuration - START
	$scope.formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
	$scope.format = $scope.formats[0];
	$scope.maxDate = new Date();

	$scope.openedStart = false;

	$scope.openStart = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
		$scope.openedStart = !$scope.openedStart;
	};

	$scope.openedEnd = false;

	$scope.openEnd = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
		$scope.openedEnd = !$scope.openedEnd;
	};

	$scope.dateOptions = {
		formatYear: 'yy',
		startingDay: 1
	};
	// All Date Picker Configuration - END

	$scope.modelNames = DataModels.getAllModelNames().$asObject();

	$scope.userNames = {};
	DataModels.fetchFilteredDate('User',{}).then(function(arr){
		$scope.users = arr;
		angular.forEach(arr,function(d){
			$scope.userNames[d._id] = d.Name;
		});
	});
	$scope.auditLogTypeNames = {};
	DataModels.fetchFilteredDate('AuditLogType',{}).then(function(arr){
		$scope.auditlogtypes = arr;
		angular.forEach(arr,function(d){
			$scope.auditLogTypeNames[d._id] = d.Name;
		});
	});
	$scope.auditLogStatusNames = {};
	DataModels.fetchFilteredDate('AuditLogStatus',{}).then(function(arr){
		$scope.auditlogstatuses = arr;
		angular.forEach(arr,function(d){
			$scope.auditLogStatusNames[d._id] = d.Name;
		});
	});

	$scope.itemsArray = [];
	$scope.gridFilter = {};
	$scope.relationsArray = [];

	$scope.gridFilterOptions = {};
	$scope.gridColumnDefs = [
		{ field: 'Name',  displayName: 'Name' },
		{ field: 'AuditLogStatusName',  displayName: 'Audit Log Status' },
		{ field: 'AuditLogTypeName', displayName: 'Audit Log Type' },
		{ field: 'modelName', displayName: 'Model Name' },
		{ field: 'UserName',   displayName: 'User' },
		];

	$scope.gridOptions = {
		data: 'itemsArray',
		columnDefs: 'gridColumnDefs',
		multiSelect: false,
		enableRowSelection: false,
		enablePaging: false,
		showColumnMenu: true,
		showFooter: true,
		showFilter: true,
		showGroupPanel: true,
		rowTemplate: '<div ng-dblclick="loadItemIntoDialog(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}"><div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div><div ng-cell></div></div>'
	};

	$scope.showSearchResultDialog = function () {
		var modalScope = $scope.$new();

		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'auditLog/templates/searchResult.tpl.html',
			size: 'sm'
		});

		modalScope.closeDialog = function () {
			instance.close();
			modalScope.$destroy();
		};
	};

	$scope.loadItemIntoDialog = function(rowItem) {

		var modalScope = $scope.$new();

		$scope.newItem = angular.copy(rowItem.entity);

		$scope.newItem.AuditLogType = $scope.auditLogTypeNames[rowItem.entity.AuditLogType];
		$scope.newItem.AuditLogStatus = $scope.auditLogStatusNames[rowItem.entity.AuditLogStatus];

		delete $scope.newItem._id;
		delete $scope.newItem.itemId;
		delete $scope.newItem.AuditLogTypeName;
		delete $scope.newItem.AuditLogStatusName;

		$scope.newItem.lastModified = new Date(rowItem.entity.lastModified);

		

		modalScope.item = $scope.newItem;

		

		var instance = $modal.open({
			scope: modalScope,
			templateUrl: 'auditLog/templates/view.tpl.html',
			size: 'lg'
		});

		modalScope.closeDialog = function () {
			instance.close();
			modalScope.$destroy();
		};
	};

	$scope.search = function (gridFilter,startDate,endDate) {

		var mustFilter = [];
		if (startDate && endDate) {
			mustFilter.push({
				"range": {
					"lastModified": {
						"gte": startDate.getTime(),
						"lte": endDate.getTime()
					}
				}
			});
		}

		angular.forEach(gridFilter,function(val,key){
			if (val) {
				var filter = {};
				filter[key] = val;
				mustFilter.push({
				term: filter
				});
				}
		});

		console.log('mustFilter = ',JSON.stringify(mustFilter));

		var searchObj = {
			index: es.getIndexName(),
			type: 'AuditLog',
			explain: false,
			searchType: 'query_then_fetch',
			lowercaseExpandedTerms: false,
			body: {
				"size": 500,
				"query": {
					"filtered": {
						"filter": {
							"bool": {
								"must": mustFilter
							}
						}
					}
				}
			}
		};

		es.get().search(searchObj).then(function(res){
			var data = [];
			angular.forEach(res.hits.hits,function(raw){
				var d = raw._source;
				d._id = raw._id;
				d.UserName = $scope.userNames[d.User];
				d.AuditLogTypeName = $scope.auditLogTypeNames[d.AuditLogType];
				d.AuditLogStatusName = $scope.auditLogStatusNames[d.AuditLogStatus];
				data.push(d);
			});

			$scope.itemsArray = data;
			if ($scope.itemsArray.length === 0) {
				$scope.showSearchResultDialog();
			}
		});
	};

}]);
