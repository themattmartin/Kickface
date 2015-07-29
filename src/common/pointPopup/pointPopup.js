angular.module('omniboard.pointPopup', [])

.directive('popup', ['$rootScope' ,function ($rootScope) {
    return {
        restrict: 'E',
        template: '<div></div>',
        scope: {
            returnedData: '=returnedData',
            pointPopupDialog: '=pointPopupDialog',
            config: '=config'
        },

        controller: function ($scope, es, $modal, DataModels) {

            $scope.getValue = function (data, prop) {
                var val = data;
                var keys = prop.split(".");
                var key = keys.shift();

                while (key && val) {
                    val = val[key];
                    key = keys.shift();
                }
                return val;
            };

            $scope.pointPopupDialog = function (data) {
                if (!$scope.config.commandBox) {
                    return;
                }
                if (data) {
                    $scope.returnedData = data._source;
                    $scope.returnedData['$id'] = data._id;
                    $scope.config.modelName = data._source.Model;
                }
                var pointPopupScope = $scope.$new();
                pointPopupScope.command = {};

                pointPopupScope.config = $scope.config;
                pointPopupScope.config.sparkline = true;
                pointPopupScope.config.sparklineHeight = 80;
                pointPopupScope.config.show24hr = true;
                pointPopupScope.dataKey = $scope.dataKey;

                pointPopupScope.editorOptions = $scope.returnedData["$" + $scope.config.modelName + "Type"].editorOptions;
                pointPopupScope.returnedData = [$scope.returnedData];

                $scope.editorOptionName = '';

                if(pointPopupScope.editorOptions.type == 'binary'){
                    $scope.editorOptionName = 'On/Off';
					pointPopupScope.pointValueName = pointPopupScope.editorOptions.binarylist[pointPopupScope.returnedData[0].Value];
                }else if (pointPopupScope.editorOptions.type == 'toggle'){
                    $scope.editorOptionName = 'Toggle';
                }else{
                    $scope.editorOptionName = '';
                }
        
                //command point widget methods
                pointPopupScope.command.value = pointPopupScope.newPointValue;
                pointPopupScope.command.device = pointPopupScope.newPointValue;
				pointPopupScope.command.expires = false;
				pointPopupScope.command.overRideExpiresIn = 0;
				cmdRef = DataModels.getCommandQueueRef().child(pointPopupScope.returnedData[0].Gateway);

				cmdRef.once('value', function (dataSnap) {
					if(dataSnap.val() != null){
						var cmdQData = dataSnap.val();
						var time = 10000000000;
						
						Object.keys(cmdQData).forEach(function (element) {
							if (cmdQData[element].pointId == pointPopupScope.returnedData[0].$id) {
								if (cmdQData[element].resetAfter) {
									var now = new Date().getTime();
									var expiresIn = cmdQData[element].time + cmdQData[element].resetAfter * 60 * 1000 - now;
									if(expiresIn > 0 && time > expiresIn){
										time = expiresIn;
										pointPopupScope.command.expires = true;
										pointPopupScope.command.overRideExpiresIn = Math.ceil(expiresIn / 60000);
									}
								}
							}
						});
					}
				});
                //build template based on the point type
                var instance = $modal.open({
                    scope: pointPopupScope,
                    templateUrl: 'pointPopup/template/pointPopup.tpl.html'
                });

                $rootScope.$on("logout:request", function (user) {
                    instance.close();
                    pointPopupScope.$destroy();
                });

                pointPopupScope.closeDialog = function () {
                    instance.close();
                    pointPopupScope.$destroy();
                };

                pointPopupScope.save = function () {
                    //send cmd to firebase
                    Command.send(pointPopupScope.command);
                    pointPopupScope.closeDialog();
                };
            };
        }
    };
}]);
