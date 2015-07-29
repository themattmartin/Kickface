angular.module( 'omniboard.groupCommand', [])

.config(['$stateProvider', function($stateProvider) {

	var main = {
		name: 'auth.groupCommand',
		url: '/groupCommand',
		templateUrl: 'groupCommand/template/index.tpl.html',
		controller: 'groupCommandCtrl',
		data: {
			title: 'Group Command',
			iconClass: 'fa-cubes'
		}
	};

	$stateProvider
	.state(main)
	;
}])

 .controller('groupCommandCtrl', ['$scope', 'omniNavSettings', 'DataModels', '$q', 'es', function($scope, omniNavSettings, DataModels, $q, es) {

	//omniNavSettings.hide();
	$scope.alerts = [];

	//commandable point type elastic search
	$scope.searchCommandablePointTypes = function(){

		$scope.pointTypes = [];

		var deferred = $q.defer();

		var modelType = 'PointType';
		var searchObj = {
			index: es.getIndexName(),
			type: modelType,
			explain: false,
			fields: ['global', 'Name'],
			lowercaseExpandedTerms: false,
			body: {
				size: 5000,
				sort: [ "Name.raw" ],
				query: {
					filtered: {
						filter: {
							bool: {
								must: [{ term: { commandable: true } }]
							}
						}
					}
				}
			},
			_cache: false
		};

		//console.log("..... searchObj created for " + modelType + ": " + JSON.stringify(searchObj));
		es.get().search(searchObj)
			.then(
				function(resp) {
					//console.log('..... resp.hits.hits.length: ' + resp.hits.hits.length);
					if (resp.hits.hits) {
						resp.hits.hits.forEach(function (hit) {
							//console.log(modelType + ": " + JSON.stringify(hit));
							var modelData = {
								id : hit._id,
								name : hit.fields.Name[0],
								global : hit.fields.global[0]
							};

							$scope.pointTypes.push(modelData);
						});
						$scope.globalPointCounter = Object.keys($scope.pointTypes).length;
					} else {
						deferred.reject();
					}
				},
				function(err) {
					deferred.reject(err);
				}
			);
		return deferred.promise;
	};

	// call to populate commandable point types
	$scope.searchCommandablePointTypes();
	
	//$scope.savedData = angular.copy( $scope.pointTypes );

	//$scope.selectedPointTypes = {};

	var setResetPointType = function(action, pointTypeId) {
		for (var key in $scope.pointTypes) {
			if ($scope.pointTypes.hasOwnProperty(key)) {
				if($scope.pointTypes[key].id === pointTypeId){
					if (action === 'add') {
						$scope.pointTypes[key].global = true;
					}
					if (action === 'remove') {
						$scope.pointTypes[key].global = false;
					}
				}
			}
		}
	};

	$scope.selectedPointTypeSelected = function($event, pointTypeId) {
		var action = ($event.target.checked ? 'add' : 'remove');
		setResetPointType(action, pointTypeId);
	};

	$scope.markPointsAsGlobal = function() {

		$scope.alerts = [];
		var countGlobalMarked = 0;
		var countGlobalUnarked = 0;
		angular.forEach($scope.pointTypes, function(data,pointTypeId) {
			//console.log("pointType: " + JSON.stringify(data));

			var pointTypeRef = DataModels.getModelItemRef('PointType',data.id);
			if(data.global === true){
				pointTypeRef.update({ global: true }, function(error){
					if(error){
						$scope.alerts.push({type:"danger", msg: "Error for " + data.name + ": Code=" + error.code + " Message=" + error.message});
					}
				});

				countGlobalMarked++;
			}else{
				pointTypeRef.update({ global: false }, function(error){
					if(error){
						$scope.alerts.push({type:"danger", msg: "Error for " + data.name + ": Code=" + error.code + " Message=" + error.message});
					}
				});

				countGlobalUnarked++;
			}
		});
		$scope.alerts.push({type:"success", msg: countGlobalMarked + " points marked as global. " + countGlobalUnarked + " points unmarked as global."});
	};

	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);

	};

}]);
