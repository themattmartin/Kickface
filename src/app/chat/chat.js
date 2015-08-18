angular.module( 'kickface.chat', [])


/**
* States (used to be Routes)
*/
.config(['$stateProvider', function($stateProvider) {
	var home = {
		name: 'auth.chat',
		url: '/chat',
		templateUrl: 'chat/chat.tpl.html',
		controller: 'HomeCtrl', 
		authRequired: true , 
		resolve:{}
	};

	$stateProvider
		.state(home)
	;

}])

.controller('ChatCtrl', ['$scope', 'messageList', function($scope, messageList) {
    $scope.messages = messageList;
    $scope.addMessage = function(newMessage) {
      if( newMessage ) {
        $scope.messages.$add({text: newMessage});
      }
    };
  }]);