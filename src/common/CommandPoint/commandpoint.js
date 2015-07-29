angular.module('omniboard.CommandPoint', [])

//**********************************************************************

// CommandQueue
//
.factory('CommandQueueRef', ['FirebaseRootRef', 'initialFirebaseChild' , function(FirebaseRootRef, initialFirebaseChild) {
  return FirebaseRootRef.child(initialFirebaseChild.get()).child("commandQueue");
}])



.directive('command', [function() {
	return {
		restrict: 'E',
		templateUrl: 'CommandPoint/index.tpl.html',
		scope: {
			pointScope: '=pointScope',
			editorOptions:'=editorOptions',
			pointData: '=pointData',
			pointId:'=pointId',
			pointType: '=pointType',
			pointCommandQueueEntry: '=pointCommandQueueEntry',			
			loading: '=loading',
			closeDialog:"=closeDialog",
			config: '='
		},
		controller: ['$scope', 'CommandQueueRef', '$firebase', 'FirebaseRootRef', 'DataModels', '$modal', '$rootScope', function($scope, CommandQueueRef,$firebase, FirebaseRootRef, DataModels, $modal, $rootScope) {
		$scope.IntervalRanges = [];
		
		$scope.populateArray = function(amt){
			$scope.IntervalRanges = [];
			for(var i=1;i<amt;i++){
				$scope.IntervalRanges[i] = i;
			}
		};
		$scope.checkValues = function(val){
			
			if( val.toString() == '1'){
				
				$scope.IntervalRanges.splice(0, 5);
			} else {
				$scope.populateArray(100);
			}
			
		}; 
		$scope.populateArray(100);

			
			$scope.point = {};
			$scope.command = {};
			$scope.editorTemplate = function() {
				if (typeof $scope.editorOptions != 'undefined'  ) { 
					return "CommandPoint/editorType/" + $scope.editorOptions.type + ".tpl.html";
				} else {

					return null;
				}
			};

			$scope.timedOverride = false;
			$scope.viewName = 'Timed Override';

			$scope.openOverride = function(){
					$scope.timedOverride = true;
					$scope.viewName = 'Timed Override';
				};
			$scope.backToCommand = function(){
					$scope.timedOverride = false;
					$scope.viewName = 'Back to Command';
					$scope.pointCommandQueueEntry.expires = false;
					$scope.command.resetAfterUnits = null;
					$scope.command.resetAfterValue = null;
			};

			var path = $scope.pointData[0].Path;
			path = path.replace(/\ /,'%20');
			$scope.command = {
				'resetValue': $scope.pointData[0].Value,
				'resetAfterUnits': 0,
				'resetAfterValue': 0,
				'resetAfter': 0,
				'pointId': $scope.pointData[0].$id,
				'pointCommandType' : 'Override',
				'priority' : 10,
				'path' : path
				//'userId' : $scope.userId,
				//'time' : "'time'"
			};

			if( $scope.pointData[0].cmdAlias){
				$scope.command.cmdAlias = $scope.pointData[0].cmdAlias;
			}

			$scope.newCommand = function(command, key, toggle){
				if($scope.editorOptions.type == "binary"){
					$scope.sendCommand(command, key);
				}else if($scope.editorOptions.type == "toggle"){
					$scope.toggleValue(command, key);
				}else if($scope.editorOptions.type == "number"){
					$scope.sendCommand(command, key);
				}else{
					$scope.save(command);
				}
			};

			$scope.save = function (c) {

				c.resetAfter = (c.resetAfterValue * 1) * (c.resetAfterUnits * 1);
				delete c.resetAfterValue;
				delete c.resetAfterUnits;
				if (!c.resetAfter || c.resetAfter === 0) {
					delete c.resetAfter;
					delete c.resetValue;

				} else {
					$scope.pointCommandQueueEntry.expires = true;
					$scope.pointCommandQueueEntry.overRideExpiresIn = c.resetAfter;
					$scope.notify = false;						
				}

				if (typeof c.value == 'undefined') {

					return;

				}

				var user = $rootScope.loginService.getCurrentUser();
				if (typeof user == 'undefined') {

					return;
				}

				if( user ){
					var point = $scope.pointData[0];
					if (typeof point == 'undefined') {
						return;
					}

					c.time = Firebase.ServerValue.TIMESTAMP;

					var query = {_id: point.PointType};
					DataModels.searchItemsUpdated('PointType', query).then(function (pointTypes) {

						if (typeof pointTypes == 'undefined') {

							return;
						}

						var pointType = pointTypes[0];

						if (typeof pointType.editorOptions == 'undefined') {

							return;
						}

						var newPointValue = parseInt(c.value);
						if(typeof newPointValue == 'undefined'){

							return;
						}

						if (pointType.editorOptions.minValue >= newPointValue || newPointValue <= pointType.editorOptions.maxValue) {
							$scope.updatePointValue(c, user);
							return;
						}

						var $parentScope = $scope;

						var pointValueValidation = function ($scope, $modalInstance) {
							$scope.note = {reason: ''};

							$scope.saveData = function () {
								if (!$scope.note.reason) {
									return;
								}

								$scope.loading = true;
								var data = {
									userId: user.uid,
									oldValue: point.Value,
									newValue: newPointValue,
									time: Firebase.ServerValue.TIMESTAMP,
									note: $scope.note.reason
								};
								$scope.notify = true;

								DataModels.createAudit('Point', data, c.pointId, user.uid, 'Update', 'Commanded Point (threshold exceeded)');
								$parentScope.updatePointValue(c, user);
								c.resetAfter = c.value;
								$scope.closeDialog();
							};

							$scope.closeDialog = function () {
								$modalInstance.close();
							};
						};

						$modal.open({
							controller: pointValueValidation,
							templateUrl: 'CommandPoint/templates/pointValueValidation.tpl.html'
						});
					});
				}
			};

			$scope.clearOverride = function () {
				$scope.clearing = true;
				var c = {};
				var user = $rootScope.loginService.getCurrentUser();
				DataModels.clearOverride($scope.pointData[0].Gateway, $scope.command.pointId);
				DataModels.createAudit('Point', c, $scope.command.pointId, user.uid, 'Clear Override', 'Commanded Point');					
				$scope.loading = false;
				$scope.pointCommandQueueEntry.expires = false;
				$scope.clearing = false;
				$scope.notify = false;
			};				

			$scope.updatePointValue = function (c, user) {

				c.userId = user.uid;
				c.time = Firebase.ServerValue.TIMESTAMP;
				$scope.loading = true;

				DataModels.createAudit('Point', c, $scope.command.pointId, user.uid, 'Update', 'Commanded Point');
				// need to point to the CommandQue with the Gateway ID
				var cmdRef = CommandQueueRef.child($scope.pointData[0].Gateway);

				cmdRef.push(c, function (err) {

					DataModels.setModelStatus('Point', 'Status', c.pointId, 'Queued');

					$scope.loading = false;
					$scope.$apply();
					$scope.notify = true;

				});

			};


			$scope.sendCommand = function(c,v) {

				c.value=v;
				$scope.save(c);

			};

			$scope.toggleValue = function(c,v) {

				$scope.command.value = v;

				var newToggleVal;

				if  (v === 1){

					newToggleVal = 0;

				} else {

					newToggleVal = 1;

				}
				$scope.sendCommand(c, newToggleVal);
			};

		}]
	}; 


}]);