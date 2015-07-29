
angular.module('omniboard.treeView', ['adf.provider'])

.config(function(dashboardProvider){
	dashboardProvider
	.widget('treeView', {
		title: 'Tree View',
		description: 'Displays a tree view',
		controller: 'treeViewCtrl',
		templateUrl: 'treeView/treeView.tpl.html',
		edit: {
			templateUrl: 'treeView/edit.tpl.html',
			reload: false,
			controller: 'treeViewEditCtrl'
		}
	});
})

.controller('treeViewCtrl', function($scope, config, es, $rootScope, DataModels, $q){

	$scope.tree = [];
	$scope.details = null;
	$scope.config.scopeModel = $scope.scopeModel;

	var modelData = DataModels.fetchFilteredDate(config.modelName,config.query[0].properties);
	modelData.then(
		function(result){
			var nodeData = [];
			for(var j=0;j<result.length;j++){
				nodeData.push( { Name: result[j].Name, expanded: false, type: config.modelName, folder: true, id: result[j]._id, details: result[j], modelName: config.modelName, nodes: []} );
			}
			$scope.tree.push( { Name: config.modelName, expanded: false, type: config.modelName, folder: true, nodes: nodeData } );

			$scope.dataLoaded = true;
			$scope.dataLoadedError = false;

		},
		function(){

			$scope.dataLoadedError = true;
			$scope.dataLoaded = true;

		}
	);

	$scope.showDetail = function(obj,key,title, parent){
		if( typeof obj.details != 'undefined' ){
			var detailObject = angular.copy(obj.details);
			//iterate through and get all the ids
			$scope.details = detailObject;
			angular.forEach(detailObject, function(object,key){
				if( object.length === 20 && key != '_id'){
					DataModels.getNameAttr(key,object).then(function (ok) {
						$scope.details[key] = ok;
					});
				}
			});
			$scope.detailTitle = title;
		} else {
			$scope.details = null;
		}
	};


$scope.getChildren = function (data, model, id, objectName) {
      if (typeof id == 'string') {
        if (data.expanded !== true) {
			var relations = DataModels.getModelRelations(model).$asObject();
			var resolvedSearch = $scope.deferredSearch(id, model, data, relations);
			data.loading = true;
			resolvedSearch.then(
				function(ok){
					data.loading = false;
				},
				function(err){
					console.log("ERROR:", err);
					data.loading = false;
				}
			);
			data.expanded = true;
        } else {
			data.loading = true;
			data.nodes = [];
			data.expanded = false;
			data.loading = false;
        }
      }
    };
	$scope.deferredSearch = function(id, model, data, relations) {
		var deferred = $q.defer();
		//loop through for all that have a hasMany relationship and build query object
		angular.forEach(relations, function(relation){
			if( typeof relation == 'object' && relation.relationType.name == 'hasMany' && typeof id != 'undefined' ){
				var searchQuery = {};
				searchQuery[model] = id;
				var searched = DataModels.searchItemsUpdated(relation.name,searchQuery);
				searched.then(
					function(results){
						var nodeItems = [];
						angular.forEach(results, function(item){
							nodeItems.push({Name: item.Name, "expanded":false, "type": relation.name, "folder":false, "id":item._id, "details":item, "modelName":item.Name,nodes: []});
						});
						data.nodes.push({Name: relation.name, "expanded":false, "type": relation.name, "folder":true, "modelName":relation.name,nodes: nodeItems});
						deferred.resolve(data.nodes);
					},function(err){deferred.reject(err);}
				);

			}
		});
		return deferred.promise;
	};

	$scope.closeDialog = function() {
		$scope.details = null;
	};

})

.controller('treeViewEditCtrl', function($scope, es, $rootScope, DataModels){
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

	$scope.loadModelTypes = function(modelName) {
		if($scope.config.useScope){
			$scope.config.modelName = $scope.config.scopeModel;
		}

		$scope.config.query[0].modelName = modelName;
		$scope.modelTypes = DataModels.getAllModelTypes(modelName).$asObject();

		$scope.labelProps = DataModels.getModelForm(modelName).$asObject();
		$scope.valueProps = DataModels.getModelForm(modelName).$asObject();

	};

	$scope.setModelType = function(modelName, modelType) {
		$scope.config.query[0].properties[modelName + "Type"] = modelType;
	};

	if(!$scope.config.valueProp){
		$scope.config.valueProp = "Value";
	}

	if(!$scope.config.labelProp){
		$scope.config.labelProp = "Name";
	}

	if(!$scope.config.titleTextLabel){
		$scope.config.titleTextLabel = "slick";
	}

	if ($scope.config.modelName) {
		$scope.loadModelTypes($scope.config.modelName);
	}

	if ($scope.config.modelName && $scope.config.modelType) {
		$scope.setModelType($scope.config.modelName, $scope.config.modelType);
	}
})
;
