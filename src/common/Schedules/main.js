/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.Schedules", ["omniboard.Schedules.crud","omniboard.Schedules.states"])

/**
* Expose Data Items to Root Scope for index.html
*/
.run(['$rootScope', 'Schedules',  function($rootScope, Schedules) {
	$rootScope.Schedules = Schedules.names();
}])



;