angular.module('omniboard.gridHeight', [])

.directive('gridHeight', function() {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
		},
		template: '<div ng-transclude></div>',
		controller: function($scope, $element, $attrs, $window) {     
			

			$scope.currentHeight = $element.parent().height();

			// listen for the event
			angular.element($window).bind('resize',function(){
				$scope.currentHeight = $element.parent().height();
			
			});


			// 
		}
	}; 
});