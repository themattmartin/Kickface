.controller('HomeCtrl', ['$scope', 'fbutil', 'user', 'FBURL', function($scope, fbutil, user, FBURL) {
    $scope.syncedValue = fbutil.syncObject('syncedValue');
    $scope.user = user;
    $scope.FBURL = FBURL;
  }])