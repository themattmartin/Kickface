angular.module("omniboard.mapStyles", ["omniboard.mapStyles.crud"])

/**
* Expose Data Items to Root Scope for index.html
*/
.run(['$rootScope', 'MapStyles',  function($rootScope, MapStyles) {
	$rootScope.mapStyles = MapStyles.list();
}])

;