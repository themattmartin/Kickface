angular.module( 'kickface.courses', [])


/**
* States (used to be Routes)
*/
.config(['$stateProvider', function($stateProvider) {
	var home = {
		name: 'auth.courses',
		url: '/courses',
		templateUrl: 'courses/courses.tpl.html',
		controller: 'HomeCtrl', 
		authRequired: true , 
		resolve:{}
	};

	$stateProvider
		.state(home)
	;

}])

.controller('CourseCtrl', ['$scope', 'courseList', function($scope, courseList) {
    $scope.courses = courseList;
    $scope.addCourse = function(newCourse) {
      if( newCourse ) {
        $scope.courses.$add(newCourse);
      }
    };
  }]);