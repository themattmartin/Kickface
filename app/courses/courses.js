.controller('CourseCtrl', ['$scope', 'courseList', function($scope, courseList) {
    $scope.courses = courseList;
    $scope.addCourse = function(newCourse) {
      if( newCourse ) {
        $scope.courses.$add(newCourse);
      }
    };
  }])  