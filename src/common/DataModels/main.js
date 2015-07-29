/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.DataModels", ["omniboard.DataModels.crud","omniboard.DataModels.states"])

/**
* Expose Data Items to Root Scope for index.html
*/
.run(['$rootScope', 'DataModels',  function($rootScope, DataModels) {
	$rootScope.dataModels = DataModels.names();
}])

;