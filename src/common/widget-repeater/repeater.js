angular.module('omniboard.dynamicRepeater', ['adf.provider'])

//.filter('range', function() {
//	return function(input, total) {
//		total = parseInt(total,10);
//		for (var i=0; i<total; i++){
//			input.push(i);
//		}
//		return input;
//	};
//})

.config(function(dashboardProvider){
	dashboardProvider
	.widget('dynamicRepeater', {
		title: 'Dynamic Repeater',
		description: 'Repeat widgets',
		controller: 'dynamicRepeaterCtrl',
		templateUrl: 'widget-repeater/repeaterFull.tpl.html',
		edit: {
			templateUrl: 'widget-repeater/edit.tpl.html',
			reload: false,
			controller: 'dynamicRepeaterEditCtrl'
		}
	});
})

.controller('dynamicRepeaterCtrl', function($scope, config, $rootScope, $log, DataModels, es, $state, pageLevelData, $interval){
	var listeners = [];

	$scope.config = config;
	$scope.key = config.key;
	$scope.dataLoaded = false;
	$scope.dataLoadedError = true;
	$scope.showTable = false;
	$scope.fullLayout = [];

	if (config.repeaterLayout) { 
		$scope.model = angular.copy(config.repeaterLayout); //	
	} else {
		$scope.model = { rows: [{ columns: [{ style: {}, styleClass: 'col-md-12', widgets: [] }] }] };
	}

	if (config.returnedData) { 
		$scope.returnedData = angular.copy(config.returnedData);
	} else {
		$scope.returnedData = [];
	}

	if(!$scope.config.modelName){
		if ($scope.config.useScope) {
			$scope.config.modelName = $scope.scopeModel;
		} else {
			$scope.config.modelName = "Point";
		}
	}
	// sortable options for drag and drop
	$scope.sortableOptions = {
		connectWith: ".widgetDropZoneForRepeater",
		handle: ".fa-arrows",
		cursor: 'move',
		tolerance: 'pointer',
		placeholder: 'placeholder',
		forcePlaceholderSize: true,
		opacity: 0.4
	};	

	$scope.closeEditInstructions = function() {
		//Empty on Purpose
	};
	
	$scope.addWidgetDialog = function() {
		$scope.dashboardScope._addWidgetDialog($scope);
	};

	$rootScope.$on('savingDashboard', function(){
		$scope.saveRepeaterLayout($scope.model, $scope.returnedData);
	});

	$scope.selectCell = function (row, col) {
		if($scope.dashboardScope.currentSelectedColumn){
			$scope.dashboardScope.currentSelectedColumn.style = col.style;
		}
		$scope.selectedColumn = col;
		$scope.dashboardScope.currentSelectedColumn = col;
		$scope.selectedCellRow = $scope.model.rows.indexOf(row);
		$scope.selectedCellCol = row.columns.indexOf(col);

		if($scope.editMode){
			col.style = {'background-color': '#ccffcc'};	
		}
	};

	$scope.saveRepeaterLayout = function(model, data) {
		if($scope.selectedColumn){
			$scope.selectedColumn.style = {};		
			$scope.dashboardScope.currentSelectedColumn = {};			
		}		
		config.returnedData = angular.copy(data);
		data.forEach(function(item) {
			item.repeaterLayout = angular.copy(model);

			item.repeaterLayout.rows.forEach(function(row, rowIndex) {
				row.columns.forEach(function(col, colIndex) {
					col.widgets.forEach(function(widget) {
						if (widget && widget.config) { 
							widget.config.key = config.key + ":" + item.modelName + ":" + item.id + ":" + rowIndex + ":" + colIndex + ":" + widget.config.key;
						}
					});
				});
			});
		});				

		config.repeaterLayout = angular.copy(model);
		getItemData(data);
	};

	var getItemData = function(items) {

		listeners.forEach(function(fn) {
			fn();
		});

		listeners = [];

		items.forEach(function(item) {
			item.repeaterLayout.rows.forEach(function(row) {
				row.columns.forEach(function(col) {
					col.widgets.forEach(function(widget) {
						if (widget.config.key && widget.config.query && item.id && item.modelName) {
							var widgetID = widget.config.key;
							var query = { search: widget.config.query };
							var scopeID = item.id;
							var scopeModel = item.modelName;
							$scope.dashboardScope.fetchForKey(widgetID, query, scopeID, scopeModel);
							listeners.push($rootScope.$on("dashboard:"+widgetID+":complete", function(evt, data) {

							}));
						}
					});
				});
			});
		});
	};

	//var handleEvent = function(evt, data, model) {
	var handleEvent = function(data, model){
		if( data ) {
			var modelName = $scope.config.modelName;
			/*
			if (evt.name == 'itemSelected') {
				data.$id = data._id;
				data = [ data ];
				modelName = model;
			}
			*/
			if (!config.repeaterLayout) { 
				$scope.model = { rows: [{ columns: [{ style: {}, styleClass: 'col-md-12', widgets: [] }] }] };
			} else {
				$scope.model = angular.copy(config.repeaterLayout);
			}

			var allData = [];
			angular.forEach(data,function(val,id){
				allData.push({modelName: modelName, id: val.$id });
			});
			$scope.returnedData = angular.copy(allData);
			//$scope.returnedData = angular.copy(data);
			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;
			$scope.saveRepeaterLayout($scope.model, $scope.returnedData);
		}
	};

	//PointStatus
	var pointStatus = DataModels.getModelItemsRef('PointStatus');
	pointStatus.once('value',function(dataSnap){
		$scope.allPointStatus = dataSnap.val();
	});
	//PointType
	var pointType = DataModels.getModelItemsRef('PointType');
	pointType.once('value',function(dataSnap){
		$scope.allPointType = dataSnap.val();
	});

	if (config.useMapEvent) { 
		$rootScope.$on("itemSelected", handleEvent);
	} else { 

		if( $scope.key.toString().indexOf(':') !== 0){
			var originalKey = angular.copy($scope.key.toString());
			$scope.widgetKeys = originalKey.split(':');
			$scope.key = $scope.widgetKeys[$scope.widgetKeys.length - 1];
		}

		$scope.itemsLoaded = 0;
		$scope.widgetData = [];
		var check;
		check = $interval(function() {
			$scope.dataLoadedError = true;

			var data = pageLevelData.get($scope.key);

			if( typeof data != 'undefined'){
				$interval.cancel(check);

				$scope.widgetData = data;
				angular.forEach($scope.widgetData,function(val,id){
					val.$loaded().then(function(refData){
						$scope.itemsLoaded += 1;

						val.$watch(function(evt){
							if (refData !== undefined && refData.$id == evt.key) {
								refData.$PointStatus = $scope.allPointStatus[refData.PointStatus];
								refData.$PointStatus.$id = refData.PointStatus;
								refData.$PointType = $scope.allPointType[refData.PointType];
								refData.$PointType.$id = refData.PointType;
								$scope.returnedData = refData;
							}
						});

					});
				});
				$scope.dataLoadedError = false;
				check = undefined;


			}
		}, 750, 80);

		$scope.$watch('itemsLoaded', function(newVal,oldVal){
			if( (newVal == $scope.widgetData.length) && (newVal > 0) ){
				handleEvent($scope.widgetData, $scope.config.modelName);
			}
		});

		//$rootScope.$on("dashboard:"+$scope.key+":complete", handleEvent);
	}

    $rootScope.$on('widget:reloading:'+$scope.key,function(){
		$scope.dataLoaded = false;
		$scope.dataLoadedError = false;
    }); 

}).controller('dynamicRepeaterEditCtrl', function($scope, config, $rootScope, $log, DataModels, es){
	$scope.config = config;
	if( !$scope.config.showPoints) {
		$scope.config.showPoints = {};
	}
	
	$scope.modelNames = DataModels.getAllModelNames().$asObject();
	$scope.config.query = [];
	$scope.config.query[0] = { modelName: $scope.config.modelName, properties: {} };

	$scope.addToConfig = function(name,id){
		var cleanName = name.split(' ').join('');
		if( !$scope.config.showPoints[id]) {
			$scope.config.showPoints[id] = cleanName;
		} else {
			delete $scope.config.showPoints[id];
		}
	};

	$scope.loadModelTypes = function(modelName) {
		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();
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

})

;
