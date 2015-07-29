angular.module('omniboard.deviceCommandCenter', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('deviceCommandCenter', {
		title: 'Device Command Center',
		description: 'Send command to points by device and point type',
		controller: 'deviceCommandCenterCtrl',
		templateUrl: 'deviceCommandCenter/deviceCommandCenter.tpl.html',
		edit: {
			templateUrl: 'deviceCommandCenter/edit.tpl.html',
			reload: false,
			controller: 'deviceCommandCenterEditCtrl'
		}
	});
})

.controller('deviceCommandCenterCtrl', function($scope, $rootScope, $state, config, DataModels, FirebaseRootRef, initialFirebaseChild){

	if (!config.pointType && !config.deviceType) { return; }

	$scope.alerts = [];
	$scope.devicePoints = {};

	$scope.PointTypeName = config.pointType.Name;

	var deviceFilter = { Site: $state.params.scopeID, DeviceType : config.deviceType._id };
	DataModels.fetchFilteredDate('Device', deviceFilter).then(function (devices) {
		angular.forEach(devices, function(device) {
			var pointFilter = { Site: $state.params.scopeID, Device: device._id, PointType: config.pointType._id };
			DataModels.fetchFilteredDate('Point', pointFilter).then(function (points) {
				if (points.length > 0) {
					$scope.devicePoints[device._id] = points[0]._id;
					device.PointValue = points[0].Value;
				}
			});
		});
		
		$scope.devices = devices;
	});

	$scope.editorTemplate = function () {
		if (config.pointType.editorOptions && config.pointType.editorOptions.type) {
			return 'CommandPoint/editorType/' + config.pointType.editorOptions.type + '.tpl.html';
		}
		else {
			return 'CommandPoint/editorType/setpoint.tpl.html';
		}
	};

	$scope.selectedDevices = {};

	var setResetDevice = function(action, deviceInfo) {
		if (action === 'add') { $scope.selectedDevices[deviceInfo._id] = deviceInfo; }
		if (action === 'remove') { delete $scope.selectedDevices[deviceInfo._id]; }
		$scope.showCommandSetup = (Object.keys($scope.selectedDevices).length > 0);
	};

	$scope.setResetDeviceSelected = function($event, deviceInfo) {
		var action = ($event.target.checked ? 'add' : 'remove');
		setResetDevice(action, deviceInfo);
	};

	$scope.setResetAllPoints = function($event) {
		var action = ($event.target.checked ? 'add' : 'remove');
		for (var deviceInfo in $scope.devicePoints) { setResetDevice(action, deviceInfo); }
	};

	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);
	};

	$scope.save = function (c) {
		$scope.sendCommand(c, c.value, false);
	};

	$scope.toggleValue = function (c, v) {
		$scope.sendCommand(c, v, true);
	};

	$scope.sendCommand = function (commandPointValue, v, toggle) {
		if(!toggle){
			toggle = false;
		}
		commandPointValue = v;

		$scope.pushCommandValue(commandPointValue, toggle);
	};

	$scope.pushCommandValue = function (commandPointValue, toggle) {

		var devices = [];
		angular.forEach($scope.selectedDevices,function(device,id) {
			devices.push(id);
		});

		var pointFilter = { Device: devices, Site: $state.params.scopeID, PointType: config.pointType._id };

		DataModels.fetchFilteredDate('Point', pointFilter).then(function(points) {

			if (points.length === 0) {
				$scope.alerts.push({type:"warning", msg: "No points found to send command."});
				return;
			}

			var user = $rootScope.loginService.getCurrentUser();

			angular.forEach(points, function (point) {

				if(toggle) {
					commandPointValue = (point.value === 0 ? 1 : 0);
				}

				var path = point.Path;
				path = path.replace(/\ /,'%20');
				var commandData = {
					'pointId': point._id,
					'pointCommandType': 'Override',
					'priority': 10,
					'path': path,
					'userId': user.uid,
					'time': new Date().getTime(),
					'value': commandPointValue
				};

				var commandQueueRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('commandQueue').child(point.Gateway);
				commandQueueRef.push(commandData);
			});

			$scope.alerts.push({type:"success", msg: "Command has been sent."});
		});

	};

})

.controller('deviceCommandCenterEditCtrl', function($scope, $state, config, DataModels){

	config.query = null;

	$scope.deviceTypeDevices = {};

	$scope.deviceTypes = [];
	DataModels.fetchFilteredDate('Device', { 'Site': $state.params.scopeID }).then(function (devices) {

		angular.forEach(devices, function (device) {
			if (!$scope.deviceTypeDevices[device.DeviceType]) { $scope.deviceTypeDevices[device.DeviceType] = []; }
			$scope.deviceTypeDevices[device.DeviceType].push(device);
		});

		DataModels.fetchFilteredDate('DeviceType', { }).then(function (deviceTypes) {
			angular.forEach(deviceTypes, function (data) {
				if ($scope.deviceTypeDevices[data._id]) {
					$scope.deviceTypes.push(data);
				}
			});

			if (config.deviceType && config.pointType) { $scope.loadPointTypes(config.deviceType); }
		});

	});

	$scope.loadPointTypes = function(deviceType) {

		if (!deviceType) { return; }

		$scope.alerts = [];
		$scope.pointTypes = [];

		if (!$scope.deviceTypeDevices[deviceType._id]) { return; }

		var devices = [];
		angular.forEach($scope.deviceTypeDevices[deviceType._id], function(device) {
			devices.push(device._id);
		});

		$scope.pointTypeMap = {};
		DataModels.fetchFilteredDate('Point', { Device: devices, Site: $state.params.scopeID }).then(function(points) {

			angular.forEach(points, function (point) {
				if (!$scope.pointTypeMap[point.PointType]) { $scope.pointTypeMap[point.PointType] = []; }
				$scope.pointTypeMap[point.PointType].push(point);
			});

			DataModels.fetchFilteredDate('PointType', { commandable: true }).then(function(pointTypes) {
				angular.forEach(pointTypes, function(data) {
					if ($scope.pointTypeMap[data._id]) {
						$scope.pointTypes.push(data);
					}
				});
			});
		});

	};

});
