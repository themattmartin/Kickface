

angular.module('omniboard.textBox', ['adf.provider'])
  .config(function(dashboardProvider){
    dashboardProvider
      .widget('textBox', {
        title: 'Text Box',
        description: 'Adds text to a dashboard',
        controller: 'textBoxCtrl',
        templateUrl: 'textBox/textBox.tpl.html',
        edit: {
          templateUrl: 'textBox/edit.tpl.html',
          reload: false
        }
      });
  }).controller('textBoxCtrl', function($scope, config){
    if (!config.content){
      config.content = '';
    }
    $scope.config = config;
    $scope.config.query = [];

  });
