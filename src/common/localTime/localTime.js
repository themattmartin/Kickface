angular.module( 'omniboard.localTime',['omniboard.timeService'])

.directive('localTime', function ($interval, FirebaseRootRef, $location) {

    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'localTime/localTime.tpl.html', 
        scope:{   
            site : '=site'
        },
        controller: function ($scope, $element, $attrs, timeService, $interval, FirebaseRootRef, $location, DataModels, $rootScope, $state) {

			var monthAsNumber = function(m){
				var months = {Jan : 0,Feb : 1,Mar : 2,Apr : 3,May : 4,Jun : 5,Jul : 6,Aug : 7,Sep : 8,Oct : 9,Nov : 10,Dec : 11};
				return months[m];
			};
			// Return a date object given a dates string in m/d/y format
			var parseDate = function (s) {
				var time = s.split(' ')[1];
				var date = s.split(' ')[0];
				var b = date.split('-');
				var t = time.split(':');
				return new Date(b[0], b[1], b[2], t[0], t[1], 0);
			};

			/* handle all time related functions */
			$scope.shouldRun = true;
			$scope.runInterval = 60000;
			$scope.updateTime = function(shouldRun,runInterval,Location){
				if (shouldRun) {
					timeService.fetchTime(Location, function(response) {
						if( response === null){
							$scope.localTime = new Date();
							$scope.dstOffset = $scope.localTime.getTimezoneOffset();
							$scope.dstZone = $scope.localTime.dstZone;

							$rootScope.$broadcast('updateSiteTime', $scope.localTime, $scope.dstOffset, $scope.dstZone);
						} else {
							var milliTime = parseDate(response.time).getTime();
							$scope.localTime = new Date(milliTime);
							$scope.dstOffset = response.dstOffset;
							$scope.dstZone = response.dstZone;
							$scope.shouldRun = false;
							$rootScope.$broadcast('updateSiteTime', $scope.localTime, $scope.dstOffset, $scope.dstZone,$scope.timeUpdater);
						}
					});
				} else {
					$scope.localTime = new Date($scope.localTime.getTime()+runInterval);
					$rootScope.$broadcast('updateSiteTime', $scope.localTime, $scope.dstOffset, $scope.dstZone);
				}
			};

			if(typeof $state.params.scopeID != 'undefined'){
				if( $state.params.scopeID !== null && $state.params.scopeID !== '' && $state.params.modelName !== ''){
					// we are going to use the local time of the site gateway or device
					var data = DataModels.getItem($state.params.modelName, $state.params.scopeID );

					data.$relationsPromise.then(
						function(ok){
							switch($state.params.modelName){
								case "Site":
									$scope.siteLocation = data.Location;
									break;
								case "Gateway":
									$scope.siteLocation = data.$Site.Location;
									break;
								case "Device":
									$scope.siteLocation = data.$Site.Location;
									break;
							}

							$scope.updateTime($scope.shouldRun,$scope.runInterval,$scope.siteLocation);
							$interval.cancel($scope.timeUpdater);

							$scope.timeUpdater = $interval(function(){
								$scope.updateTime($scope.shouldRun,$scope.runInterval,$scope.siteLocation);
							}, $scope.runInterval);
						},function(err){
							
						}
					);
				} else {
					$interval.cancel($scope.timeUpdater);
					$scope.localTime = new Date();
					$scope.dstZone = $scope.localTime.toString().split(' ')[6];
					$scope.dstZone = $scope.dstZone.replace(/[()]/g, '');
				}
			} else {
				// we are going to use the local time of the client
				$interval.cancel($scope.timeUpdater);
				$scope.localTime = new Date();
				$scope.dstZone = $scope.localTime.toString().split(' ')[6];
				$scope.dstZone = $scope.dstZone.replace(/[()]/g, '');
			}

			$rootScope.$on('updateTimeInSched', function (event, siteid) {
				
				var data = DataModels.getItem('Site', siteid);

					data.$relationsPromise.then(
						function(ok){
							$scope.siteLocation = data.Location;
							
							$scope.updateTime(true,$scope.runInterval,$scope.siteLocation);
							$interval.cancel($scope.timeUpdater);

							$scope.timeUpdater = $interval(function(){
								$scope.updateTime($scope.shouldRun,$scope.runInterval,$scope.siteLocation);
							}, $scope.runInterval);
						},function(err){
							
						}
					);
			
			});
			$rootScope.$on('resetTimeToLocal', function (event, siteid) {
				
				$interval.cancel($scope.timeUpdater);
				$scope.localTime = new Date();
				$scope.dstZone = $scope.localTime.toString().split(' ')[6];
				$scope.dstZone = $scope.dstZone.replace(/[()]/g, '');
			
			});
        }
    }; 
});