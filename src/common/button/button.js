angular.module('omniboard.button', ['adf.provider'])

.factory('CommandQueueRef', function(FirebaseRootRef, initialFirebaseChild) {
  return FirebaseRootRef.child(initialFirebaseChild.get()).child("commandQueue");
})

.config(function(dashboardProvider){
	dashboardProvider
	.widget('button', {
		title: 'Button',
		description: 'Displays the value of any model property',
		controller: 'buttonCtrl',
		templateUrl: 'button/button.tpl.html',
		edit: {
			templateUrl: 'button/edit.tpl.html',
			reload: false,
			controller: 'buttonEditCtrl'
		}
	});
})

.controller('buttonCtrl', function($scope, config, es, $rootScope, DataModels, CommandQueueRef,$firebase, FirebaseRootRef){
	if (!config.type && !config.key){
		$scope.returnedData = "Please configure this button";
	} else {
		$scope.type = config.type;
		$scope.key = config.key;
		$scope.modelType = config.modelType;
	}

	$scope.dataKey = config.modelType;

	$rootScope.$on("dashboard:"+$scope.key+":complete", function(evt, data) {
		if( data ){
			$scope.returnedData = data;
		}
	});

	$scope.getValue = function(data, prop) {
		var val = data;
		var keys = prop.split(".");
		var key = keys.shift();

		while (key && val) {
			val = val[key];
			key = keys.shift();
		}
		return val;
	};	

	
	$scope.auth = $rootScope.loginService.getCurrentUser();
      

	$scope.save = function() {

		var user = $rootScope.loginService.getCurrentUser();
		if( user ){

			$scope.command = {
				'modelName':$scope.config.modelName,
				'itemId': $scope.returnedData[0].$id,
				'value' :  $scope.config.myButtonValue,
				'valueProp': $scope.config.valueProp,
				//'userId' : $scope.userId,
				'time' : Firebase.ServerValue.TIMESTAMP,
				'user':user.uid
			};

			$scope.loading = true;
			CommandQueueRef.push($scope.command, function(err){

				$scope.loading = false;
				$scope.closeModal();

			});
		}
	};

})

.controller('buttonEditCtrl', function($scope, es, $rootScope, DataModels){
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

	$scope.getPropertyValue = function(prop) {
		if (prop.component == "select") {
			return "$" + prop.label + ".Name";
		} else {
			return prop.label;
		}
	};

	if(!$scope.config.modelName){
		$scope.config.modelName = "Point";
	}

	if(!$scope.config.valueProp){
		$scope.config.valueProp = "Value";
	}

	if(!$scope.config.labelProp){
		$scope.config.labelProp = "Name";
	}

	if(!$scope.config.showLabel){
		$scope.config.showLabel = true;
	}

	if(!$scope.config.showValue){
		$scope.config.showValue = true;
	}

	if(!$scope.config.showModel){
		$scope.config.showModel = true;
	}

	if(!$scope.config.buttonAlign){
		$scope.config.buttonAlign = "center";
	}
	

	$scope.loadModelTypes = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
		$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
		$scope.valueProps = DataModels.getModelForm(modelName).$asObject();
	};

	$scope.setModelType = function(modelName, modelType) {
		$scope.config.query[0].properties[modelName + "Type"] = modelType;
	};

	if ($scope.config.modelName) {
		$scope.loadModelTypes($scope.config.modelName);
	}

	if ($scope.config.modelName && $scope.config.modelType) {
		$scope.setModelType($scope.config.modelName, $scope.config.modelType);
	}
});
