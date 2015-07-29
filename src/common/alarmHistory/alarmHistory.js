angular.module('omniboard.alarmHistory', [])
    .directive('alarmHistory', function () {
        return {
            restrict: 'E',
            scope: {
                alarm: '=alarm'
            },
            template: '<a class="btn btn-xs" ng-click="showHistory()" href=""><i class="fa fa-history fa-lg"></i></a>',
            controller: ['$scope', '$modal', 'DataModels', function ($scope, $modal, DataModels) {


                $scope.showHistory = function () {
                    var history = [];

                    var query = {modelName: 'alarms'};
                    DataModels.searchItemsUpdated('AuditLog', query).then(
                        function (logs) {
                            angular.forEach(logs, function (log) {
                                if (log.item.Model === $scope.alarm.Model && log.item.ItemId === $scope.alarm.ItemId) {
                                    history.push(log);
                                }
                            });

                            var historyPopupController = ['$scope', '$modalInstance', 'history', 'alarmName', function ($scope, $modalInstance, history, alarmName) {

                                $scope.history = _.chain(history).map(function (item) {
                                    var alarmData = {name: item.Name, occurred: item.item.Occurred};
                                    if (item.item.reason) {
                                        alarmData.description = item.item.reason;
                                    }
                                    return alarmData;
                                }).sortBy('occurred').value();

                                $scope.alarmName = alarmName;

                                $scope.closeDialog = function () {
                                    $modalInstance.close();
                                };
                            }];

                            $modal.open({
                                controller: historyPopupController,
                                templateUrl: 'alarmHistory/templates/alarmHistory.tpl.html',
                                resolve: {
                                    history: function () {
                                        return history;
                                    },
                                    alarmName: function () {
                                        return $scope.alarm.Name;
                                    }
                                }
                            });
                        }
                    );
                };

            }]
        };
    });
