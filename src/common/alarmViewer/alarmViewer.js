angular.module('omniboard.alarmViewer', [])

.directive('alarmViewer', function() {
	return {
		restrict: 'E',
		scope: {
			items: '=',
			name: '='
		},
		templateUrl: 'alarmViewer/templates/index.tpl.html',
		controller: function($scope, $element, $attrs, $window, $rootScope, DataModels, $modal, alarmFormatter) {     

			$scope.alarmCall = alarmFormatter;
			$scope.currentWidth = $element.parent().width();
			var totalItems = Object.keys($scope.items).length;
			$scope.widthOfItem = ($scope.currentWidth / totalItems);


			// listen for the event
			angular.element($window).bind('resize',function(){
				$scope.currentWidth = $element.parent().width();
				var totalItems = Object.keys($scope.items).length;
				$scope.widthOfItem = ($scope.currentWidth / totalItems);
			});


			$scope.popupDialog = function(item, data){
				// THIS IS YOUR NEW SCOPE, INITIALIZE ANY VARIABLES YOU NEED FOR YOUR VIEW HERE
				var addMarkerScope = $scope.$new();
				addMarkerScope.item = item;
				addMarkerScope.data = $scope.name;
				if( item.User ){
					var uName = DataModels.getFirstAndLast('User',item.User);
					uName.then(function(data){
						addMarkerScope.UserName = data.Firstname + ' ' + data.Lastname;
					});
				}

				// SETUP YOUR VIEW AS AN INSTANCE OF THIS MODAL
				var instance = $modal.open({
					scope: addMarkerScope,
					templateUrl: 'alarmViewer/templates/detail.tpl.html',
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

		}
	}; 
});