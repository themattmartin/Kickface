angular.module('omniboard.obAffix', [])

.directive('obAffix', function() {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
		},
		template: '<div ng-transclude></div>',
		controller: function($scope, $element, $attrs, $window) {     
			

			$scope.currentWidth = $element.parent().width();

			// listen for the event
			angular.element($window).bind('resize',function(){
				$scope.currentWidth = $element.parent().width();
				
			});


			// 
		}
	}; 
});