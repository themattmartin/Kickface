angular.module( 'omniboard.userProfile', [])
 .config(['$stateProvider', function($stateProvider) {
	var userProfile = {
		name: 'userProfile',
		url: '/userProfile',
		templateUrl: 'userProfile/template/userProfile.tpl.html',
		controller: 'userProfileCtrl'
	};

	$stateProvider.state(userProfile);
}])
.controller('userProfileCtrl', ['$scope','$state', "FirebaseRootRef", function($scope, $state, FirebaseRootRef) {

	$scope.alerts = [];

	var user = $rootScope.loginService.getCurrentUser();
	if( user ){
		var userDRef = FirebaseRootRef.child('dataItems/models/User/data').once('value', function(userSnapshot){
			angular.forEach(userSnapshot.val(), function(data, id){
				if( data.Username === user.email ){
					$scope.name = data.Name;
					$scope.userName = data.Username;
					$scope.lastOnline = data.lastOnline;
					$scope.online = data.online;
				}
			});
		});
	}

	$scope.changePassword = function(){
		$scope.alerts = [];

		if($scope.currentPassword && $scope.newPassword && $scope.confirmNewPassword){
			if($scope.newPassword === $scope.confirmNewPassword){
				if($scope.currentPassword == $scope.newPassword){
					$scope.alerts.push({type:"warning", msg: "Current Password and New Password are same."});
				}else{
					auth.$changePassword($scope.userName, $scope.currentPassword, $scope.newPassword).then(function() {
						$scope.alerts.push({type:"success", msg: "Password changed successfully!"});
					}).catch(function(error) {
						//console.error("Error: ", error);
						$scope.parseChangePasswordReply(error);
					});			
				}
			}else{
				$scope.alerts.push({type:"warning", msg: "New Password and Confirm Password do not match."});
			}
		}else{
			if(!$scope.currentPassword && !$scope.newPassword && !$scope.confirmNewPassword){
				$scope.alerts.push({type:"warning", msg: "Please enter values in password fields."});				
			}else{
				if(!$scope.currentPassword){
					$scope.alerts.push({type:"warning", msg: "Please enter current password."});
				}
				if(!$scope.newPassword){
					$scope.alerts.push({type:"warning", msg: "Please enter new password."});
				}
				if(!$scope.confirmNewPassword){
					$scope.alerts.push({type:"warning", msg: "Please confirm password."});
				}
			}
		}
	};
	
	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);
	};

	$scope.parseChangePasswordReply = function(err){
		var errMsg = "";
		$scope.alerts.push({type:"danger", msg: err.code + ": "});
	};

}])
;
