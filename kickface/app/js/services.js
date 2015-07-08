(function() {
   'use strict';

   /* Services */

   angular.module('myApp.services', [])

      // put your services here!
      // .service('serviceName', ['dependency', function(dependency) {}]);

     .service('messageList', ['fbutil', function(fbutil) {
       return fbutil.syncArray('messages', {limit: 10, endAt: null});
     }])

     .service('courseList', ['fbutil', function(fbutil) {
     	return fbutil.syncArray('courses', {limit: 10, endAt: null});
     }])

     ;

})();

