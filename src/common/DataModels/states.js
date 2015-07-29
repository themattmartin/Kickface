/**
* Data Item Module for Omniboard
*/
angular.module("omniboard.DataModels.states", [])

/**
* States (used to be Routes)
*/
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	var dataModel = {
		name: 'auth.admin.dataModel',
		abstract: true,
		url: '/dataModel/:modelName',
		templateUrl: 'DataModels/templates/dataModel.tpl.html',
		controller: 'DataModelsCtrl',
		data: {
			dataModelName: "default"
		},
		resolve:{
			permissions: ['Perms', function(Perms) {
				return Perms.check();
			}],
			relates: ['DataModels', '$stateParams', function(DataModels,$stateParams) {
				return DataModels.getModelRelations($stateParams.modelName);
			}],
			modelFrm: ['DataModels', '$stateParams', '$builder', function(DataModels, $stateParams, $builder)  {
				
				var formFieldsRef = DataModels.getModelForm($stateParams.modelName).$asObject();	
				formFieldsRef.$loaded().then(
					function(data){

						var addNameFieldToForm = true;
						angular.forEach( data, function(data,id){
							if( data.label == "Name"){
								addNameFieldToForm = false;
							}
						});

						if( addNameFieldToForm ){
							var defaultNameField = $builder.components.textInput;
							var newField = DataModels.getModelNameForm();
							var updateObj = {};
							updateObj[data.length] = newField;
							formFieldsRef[0] = newField;
							formFieldsRef.$save();
						}
					}
				);
			}]
		}
	};

	var list = {
		name: 'auth.admin.dataModel.list',
		parent: dataModel,
		url: '/list', 
		templateUrl: 'DataModels/templates/list.tpl.html', 
		authRequired: true , 
		data: {
			displayGroup: "Models",
			displayName: "Data Model Item List",
			description: "View and filter list of items for a data model.",			
			subHeading: "List Items",
			title: 'Data Models'
		}
	};

	var create = {
		name: 'auth.admin.dataModels.create',
		parent: dataModel,
		url: '/create', 
		templateUrl: 'DataModels/templates/form.tpl.html', 
		authRequired: true , 
		data: {
			displayGroup: "Models",
			displayName: "Create Data Model",
			description: "Create a new data model",			
			subHeading: "Create a New Type of Data Item"
		} 
	};

	var edit = {
		name: 'auth.admin.dataModel.edit',
		parent: dataModel,
		url: '/edit', 
		templateUrl: 'DataModels/templates/form.tpl.html', 
		authRequired: true , 
		data: {
			displayGroup: "Models",
			displayName: "Edit Data Model",
			description: "Edit the schema of an existing data model",				
			subHeading: "Edit the Item Form"
		} 
	};

	var newItem = {
		name: 'auth.admin.dataModel.newItem',
		parent: dataModel,
		url: '/newItem', 
		templateUrl: 'DataModels/templates/entry.tpl.html', 
		authRequired: true , 
		data: {
			displayGroup: "Models",
			displayName: "New Data Model Item",
			description: "Create a new item based on a data model schema",				
			subHeading: "Create a New Item"
		} 
	};	

	var editItem = {
		name: 'auth.admin.dataModel.editItem',
		parent: dataModel,
		url: '/editItem', 
		templateUrl: 'DataModels/templates/entry.tpl.html', 
		authRequired: true , 
		data: {
			displayGroup: "Models",
			displayName: "Edit Data Model Item",
			description: "Edit an existing data model item.",				
			subHeading: "Edit an Item"
		} 
	};

	var relations = {
		name: 'auth.admin.dataModel.relations',
		parent: dataModel,
		url: '/relations', 
		templateUrl: 'DataModels/templates/relations.tpl.html', 
		authRequired: true , 
		data: {
			displayGroup: "Models",
			displayName: "Data Model Relationships",
			description: "Define relationships for a data model.",				
			subHeading: "Model Relationships"
		} 
	};			

	$stateProvider
		.state(dataModel)
		.state(list)
		.state(create)
		.state(edit)
		.state(newItem)
		.state(editItem)
		.state(relations)
	;

}])


/**
 * Controller
 */
.controller('DataModelsCtrl', ['$scope', '$builder', 'DataModels', '$stateParams', '$state', '$filter', '$modal', '$rootScope', '$timeout', '$window', '$http', 'relates', 'firebaseManager', 'FirebaseRootRef', 'initialFirebaseChild', '$firebase', 'ob', 'UserItem','Dashboards', 'UserRef',  function($scope, $builder, DataModels, $stateParams, $state, $filter, $modal, $rootScope, $timeout, $window, $http, relates, firebaseManager, FirebaseRootRef, initialFirebaseChild, $firebase, ob, UserItem, Dashboards, UserRef) {
	
	


	//var removeCellTemplate = '<center><a class="btn btn-xs btn-danger" ng-click="removeRow(row)" href=""><i class="fa fa-trash-o fa-fw"></i></a></center>';

	// Custom Template for ng-grid Header Cells
	var myHeaderCellTemplate = '<div class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{cursor: col.cursor}" ng-class="{ ngSorted: !noSortVisible }">'+
		'<div ng-click="col.sort($event)" ng-class="\'colt\' + col.index" class="ngHeaderText">{{col.displayName}}<br><input ng-model="gridFilter[col.displayName]" ng-change="search(gridFilter)" type="text" class="form-control input-sm"></div>'+
		'<div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div>'+
		'<div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div>'+
		'<div class="ngSortPriority">{{col.sortPriority}}</div>'+
		'</div>'+
		'<div ng-show="col.resizable" class="ngHeaderGrip" ng-click="col.gripClick($event)" ng-mousedown="col.gripOnMouseDown($event)"></div>';

	// Re-Initialize New Model Name
	$scope.newModelName = null;

	// Label to Put in Header Describing Current State (pulls from state custom data above)
	$scope.stateLabel = $state.current.data.subHeading;

	// Name of Model
	$scope.modelName = $stateParams.modelName;

	//
	$scope.model = { name: $scope.modelName };

	// Data Model
	//$scope.dataModel = DataModels.getModel($scope.modelName);

	// Array bound to Data Entry Form to Capture Input 
	$scope.input = [];

	// Firebase Object of Items of this Model type
	//$scope.items = DataModels.getItems($scope.modelName);

	// Array of Items of this Model type
	$scope.itemsArray = [];

	// Used by ng-grid to define columns
	$scope.gridColumnDefs = [];

	// Used by ng-grid to define grid filter
	$scope.gridFilter = {};

	// Array of all possible relation types
	$scope.relationTypes = DataModels.getRelationTypes();

	// Array of all available models to use in relations
	$scope.availableModels = [];

	// Array of current relations for this model
	$scope.relationsArray = [];

	//
	$scope.currentItem = {};

	//
	$scope.dataItemForm = DataModels.getModelForm($scope.modelName).$asObject();

	$scope.modelSubStatus = DataModels.getModelSubStatus($scope.modelName).$asObject();

	/**
	 * Called by ng-grid when row is selected to load that
	 *  item into the editor form. 
	 */
	$scope.loadItemIntoEditor = function(rowItem) {
		var itemRef = FirebaseRootRef.child(initialFirebaseChild.get()).child('dataItems/models').child($scope.modelName).child('data').child(rowItem.entity._id);
		$scope.currentItem = $firebase(itemRef).$asObject();
		$state.go("auth.admin.dataModel.editItem");
		return true;
	};

	$scope.changeRelation = function(relation,type){
		if( type == 'has many' ){
			relation.relationType.name = "hasMany";
		} else if( type == 'belongs to one' ){ 
			relation.relationType.name = "belongsTo";
		}
	};

	// Configuration Options for ng-grid
	$scope.gridOptions = {
		data: 'itemsArray',
		columnDefs: 'gridColumnDefs',
		multiSelect: false,
		enableRowSelection: false,
		enablePaging: false,
		showColumnMenu: true,
		showFooter:true,
		showFilter:true,
		showGroupPanel:true,
		headerRowHeight: 60,
		rowTemplate: '<div ng-dblclick="loadItemIntoEditor(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}"><div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div><div ng-cell></div></div>'
	};

	// Configuration Options for angular-ui-tree (used for relations)
	$scope.relationTreeOptions = {
		accept: function(sourceNode, destNodes, destIndex) {
			var retVal = false;
			var data = sourceNode.$modelValue;
			var dest = destNodes.$modelValue;

			return !dest.some(function(value,key) {
				if (value.$id === data.name) {
					return true;
				}
			});
		},
		dropped: function(event) {
			var sourceList = event.source.nodesScope.$modelValue;
			var sourceValue = angular.copy(event.source.nodeScope.$modelValue);

			if (!sourceList.some(function(value,key) {
				if (value.$id == sourceValue.name) {
					return true;
				}
			})) {
				sourceList.push(sourceValue);
			}
		},
		beforeDrop: function(event) {
			// DO NOT DELETE! Save as a template for denying drop if needed
			//if (!window.confirm('Are you sure you want to drop it here?')) {
			//	event.source.nodeScope.$$apply = false;
			//}
		}
	};

	$scope.editFormCheck = function(model, form){

		var editFormCheckScope = $scope.$new();

		editFormCheckScope.model = model;
		editFormCheckScope.form = form;
		
		var instance = $modal.open({
			scope: editFormCheckScope,
			templateUrl: 'DataModels/templates/formEditModal.tpl.html'
		});

		
		editFormCheckScope.closeDialog = function(){
			instance.close();
			editFormCheckScope.$destroy();
		};

		editFormCheckScope.saveModel = function(model, form) {
		model.form = angular.copy($builder.forms["default"]);

		DataModels.saveModel(model).then(function(updatedModel){
			model.form = updatedModel.form;
			$scope.input = updatedModel.form;
		});
		editFormCheckScope.closeDialog();
	};	

	};

	$scope.addDataModelCheck = function(currentItem,saveFiles){

		var addDataModelCheckScope = $scope.$new();

		addDataModelCheckScope.currentItem = currentItem;
		addDataModelCheckScope.saveFiles = saveFiles;
		
		var instance = $modal.open({
			scope: addDataModelCheckScope,
			templateUrl: 'DataModels/templates/addDataModelCheckModal.tpl.html'
		});

		
		addDataModelCheckScope.closeDialog = function(){
			instance.close();
			addDataModelCheckScope.$destroy();
		};	

		addDataModelCheckScope.submit = function(item, files) {
		var verb = "";
		$scope.alerts = [];
		var reg = /[^A-Za-z0-9. ]/;

		if(item.saveFiles && item.saveFiles.length > 0 && item.saveFiles[0].type != "image/png" && item.saveFiles[0].type != "image/jpg" && item.saveFiles[0].type != "image/jpeg" && item.saveFiles[0].type != "application/pdf"){
			$scope.alerts.push({type:"danger", msg: "Incorrect file type. Acceptable types are pdf, jpg, jpeg and png."});
			return;
		}else if(item.saveFiles && item.saveFiles.length > 0 && item.saveFiles[0].name && reg.test(item.saveFiles[0].name)){
			$scope.alerts.push({type: 'danger', msg: 'Invalid file name. Only alphabets, numbers and spaces are allowed.'});
			return;
		}

		if (item.hasOwnProperty('$id')) {
			verb = "update";
			DataModels.updateItem($scope.modelName, item);
		} else {
			verb = "create";
			DataModels.createItem($scope.modelName, item);
		}

		// Listen for 'afterSave' event
		var cleanUpAfterSave = $rootScope.$on(verb+":"+$scope.modelName+":afterSave", function(event, itemId) {
			$scope.alerts.push({type:"success", msg: "Your settings have been applied."});
			if (verb == "create") {
				item._id = itemId;
				$scope.itemsArray.push(item);
			}

			if (verb == "update") {
				item._id = item.$id;
				$scope.itemsArray[item.$gridRowIndex] = item;
			}

			if( item.saveFiles ){
				//console.log("item.saveFiles", item.saveFiles);
				// change icon to fa-spinner
				$scope.uploading = true;
				var fd = new FormData();
				fd.append('folder','floorPlans');
				angular.forEach(item.saveFiles, function(file){
					fd.append('file',file);
				});

                var user = $rootScope.loginService.getCurrentUser();
				$http.post('/uploadS3?cnum='+user.customerKey, fd,
				{
					transformRequest: angular.identity, 
					headers: {'Content-Type': undefined}
				}
				).success(function (data, status, headers, config) {

					var copyOfItem =  DataModels.getItem($scope.modelName, item._id);
					copyOfItem.$loaded().then(function(copiedDataFromItem){	

						if( copiedDataFromItem.saveFiles ){
							delete copiedDataFromItem.saveFiles;
						}
						// write url to data item
						copiedDataFromItem.URL = data.key;
						// write type to data item
						copiedDataFromItem.type = 'floorPlan';					

						DataModels.updateItem($scope.modelName, copiedDataFromItem );
						
						$state.go('auth.admin.dataModel.list',{modelName: $scope.modelName},{reload:true});
						cleanUpAfterSave();
						cleanUpFailure();
						
					});


				}).error(function (data, status, headers, config) {
					//console.log('ERROR: ', data, status, headers);
					$state.go('auth.admin.dataModel.list',{modelName: $scope.modelName},{reload:true});
					cleanUpAfterSave();
					cleanUpFailure();
				});

			} else {
				//$scope.currentItem.$destroy();
				$state.go('auth.admin.dataModel.list',{modelName: $scope.modelName},{reload:true});
				cleanUpAfterSave();
				cleanUpFailure();
			}

		});

		var cleanUpFailure = $rootScope.$on(verb+':'+$scope.modelName+':failure', function(event, message) {
			$scope.alerts.push({type:"danger", msg: message});
			$scope.errorMessage = message;			
			cleanUpAfterSave();
			cleanUpFailure();
		});

		addDataModelCheckScope.closeDialog();
	};	
	};

	$scope.relationsCheck = function(relationsArray){

		var relationCheckScope = $scope.$new();

		relationCheckScope.relationsArray = relationsArray;
		
		var instance = $modal.open({
			scope: relationCheckScope,
			templateUrl: 'DataModels/templates/relationsCheckModal.tpl.html'
		});

		
		relationCheckScope.closeDialog = function(){
			instance.close();
			relationCheckScope.$destroy();
		};	

		relationCheckScope.saveRelations = function(relations) {
			var newRelations = {};
			relations.forEach(function(value,key) {
				newRelations[value.name] = {
					name: value.name,
					relationType: value.relationType
				};
			});
			DataModels.setRelations($scope.modelName, newRelations).then(
				function() {
					$scope.alerts.push({type:"success", msg: "Your settings have been applied."});
					$state.go('auth.admin.dataModel.relations', { modelName: $scope.modelName }, {reload:true});
				},
				function(err) {
					$scope.alerts.push({type:"danger", msg: err});
					$state.go('auth.admin.dataModel.relations', { modelName: $scope.modelName }, {reload:true});
				}	
			);

			relationCheckScope.closeDialog();
		};
	};
	/**
	 * Re-Initialize Form Builder with No Fields
	 */
	while($builder.forms["default"].length > 0) {
		$builder.removeFormObject("default", $builder.forms["default"].length - 1);
	}


	/**
	 * Listen for State Changes
	 *	* Change Subheading describing active state
	 *	* Perform state specific initializations
	 *
	 * TO-DO: This is actually called for every state, 
	 *	not just dataModel child states. Limit this 
	 *	to only affect dataModel states.
	 */
	$rootScope.$on('$stateChangeStart', function(event, toState){ 
		//console.log('DataModels - stateChangeStart ', toState);
		if (toState.hasOwnProperty("data") && toState.data.hasOwnProperty("subHeading")) { 
			$scope.stateLabel = toState.data.subHeading;
		}
		if (toState.name == "auth.admin.dataModel.newItem") {
			$scope.currentItem = {};
		}
	});	

	
	/**
	 * Load list of relations from Firebase and then
	 *	* Populate scope var 'relationsArray' with array of current relations
	 *	* Create dropdown form fields for related models on this model's data entry form
	 */

	// moved to the resolve of the state
	//$scope.relationsArray = $filter('orderByPriority')(relates);
	relates.$asArray().$loaded().then(function(data){
		angular.forEach(data, function(val, id){
			$scope.relationsArray.push(val);
		});
	});

	/**
	 * Listen for new data models and add them to the list of
	 *	available models
	 */
	var availableModels = DataModels.names().$asObject();
	availableModels.$loaded().then(function(data){

		angular.forEach(availableModels, function(val, id){
			if( id.indexOf('$') !== 0){
				var model = {
					//name: val.name,
					name: id,
					relationType: DataModels.getRelationTypes()[0]
				};
				$scope.availableModels.push(model);

			}
		});

	});

	/*
	availableModels.$on("child_added", function(event) {
		var model = {
			name: event.snapshot.name,
			relationType: DataModels.getRelationTypes()[0]
		};
		$scope.availableModels.push(model);
	});
	*/

	/**
	 * Load the Model's Form Definition from Firebase and then:
	 *	* Insert a Form Field Object for each item in Firebase
	 *	* Insert a column in ng-grid for each item in Firebase
	 */

	$scope.dataItemForm.$loaded().then(function(event) {
		//var field = event.snapshot.value;

		var user = $rootScope.loginService.getCurrentUser();

		var UserSettingRef = UserItem.user().child(user.uid).child('settings').child('DataModels').child($scope.modelName).child('columnsState');
		UserSettingRef.once('value', function(settingSnap){
			$scope.columnsState = settingSnap.val();

			angular.forEach(event, function(val, id){
				var field = val;			
				//$scope.dataItemForm.$off("loaded");
				//var arrayFormFields = $filter('orderByPriority')($scope.dataItemForm);

				var columnDefs = angular.copy($scope.gridColumnDefs);

				if (!itemExists($builder.forms["default"], "id", field.id)) { 
					field.hasMoved = false;
					if (field.component == "select") { 
						var modelName = field.label;
						var srchPromise = DataModels.getItemsPickList(modelName, "Name");
						srchPromise.then(
							function(pickListArray) {
								field.options = pickListArray;
								$builder.insertFormObject("default", field.index, field);						
							},
							function(err) {

							}
						);
					} else {
						$builder.insertFormObject("default", field.index, field);				
					}
				}

				columnDefs.push({
					field: (field.name ? field.name : field.label),
					displayName: field.label,
					headerCellTemplate: myHeaderCellTemplate
				});
				$scope.gridColumnDefs = columnDefs; 

				angular.forEach($scope.gridColumnDefs, function(col, colId){
					col.headerCellTemplate = myHeaderCellTemplate;
					if($scope.columnsState){
						col.visible = $scope.columnsState[colId];
					}
				});

			});

		});

		$scope.gridViewScopes = DataModels.names().$asObject();
		$scope.$on('ngGridEventColumns', function (event, newColumns) {            

			var filteredColumns = [];
			
			angular.forEach(newColumns, function (column, index) {
				//Need to removal the empty column / fix the group bug.
				if (column.field !== '' && typeof column.field !== 'undefined') {
					this.push(column.visible);
				}
				if($scope.columnsState && $scope.gridColumnDefs){
					$scope.gridColumnDefs[index].visible  = column.visible;
				}

			}, filteredColumns);

			/*
			$scope.columnsState = filteredColumns;
			if($scope.columnsState && $scope.gridColumnDefs){
				angular.forEach($scope.columnsState, function(isVisible, id){
					$scope.gridColumnDefs[id].visible = isVisible;
				});
			}
			*/
			UserSettingRef.set(filteredColumns);
			//console.log('>>>>>>>>>>>', $scope.columnsState);
		});		
		
	});

	var itemExists = function(arr, col, val) {
		return arr.some(function(element, index, array) {
			return (element[col] == val);
		});
	};


	/**
	 * Used to make model names plural in relations 
	 */
	$scope.makePlural = function(noun) {
		return attache.plural(noun);
	};


	/**
	 * Called by UI to save a model definition
	 *  @model: an object
	 *		{ name: "Name of Model" }
	 *
	 *  @form: an object that comes from the angular 
	 *		form controller with an fb-builder directive
	 *		nested inside.
	 */
	

	/**
	 * Call by UI to insert/edit an data item (based on a model)
	 *	This function will create an object from the $scope.input
	 *	array then either call DataModels.updateItem() or 
	 *	DataModels.createItem(), whichever is appropriate.
	 *
	 *	If the current state is 'editItem' AND $scope.itemId is set:
	 *		call updateItem()
	 *	Otherwise:
	 *		call createItem()
	 */
	


	/**
	 * Called by UI to perform a grid filter search
	 *  It is called upon each keystroke within a 
	 *  filter textbox. However, the actual search
	 *  will not post to the server until no keystrokes
	 *  have happened in 1000 milliseconds.
	 * 
	 *  @q: an object that will be used by DataModels.searchItems() to 
	 *		construct a query against all the models of a certain type.
	 *		This object will be passed to the DataModels service along 
	 *		with the name of the model to search. Each key in the @q 
	 *		object should be the name of a model property and each value
	 *		should be a string used to perform a partial prefix string match
	 *		against all models a certain type. For example:
	 *
	 *		{
	 *			"FirstName": "Jo",
	 *			"LastName": "Doe"
	 *		}
	 */

	$scope.search = function(gridFilter) {
		$timeout.cancel($scope.searchPromise);
		$scope.searchPromise = $timeout(function() {
			if (!gridFilter || Object.keys(gridFilter).length === 0) { return; }

			$scope.itemsArray = [];
			angular.forEach($scope.originalItems, function(item, itemKey){
				for (var filterKey in gridFilter) {
					if (gridFilter[filterKey] && item[filterKey] && item[filterKey].toString().toLowerCase().indexOf(gridFilter[filterKey].toLowerCase()) < 0) {
						return;
					}
				}
				$scope.itemsArray.push(angular.copy(item));
			});
		}, 1000);
	};

	$scope.loadItems = function(){
			DataModels.searchItems($scope.modelName, {}).then(
				function(searchResults) {

					if (($scope.modelName === 'Site' || $scope.modelName === 'Point') && $rootScope.userSites) {
						var filteredItems=[];
						angular.forEach(searchResults,function(item) {
							if (($scope.modelName === 'Site' && $rootScope.userSites[item._id]) || ($scope.modelName === 'Point' && $rootScope.userSites[item.Site])) {
								filteredItems.push(item);
							}
						});
						searchResults = filteredItems;
					}

					$scope.itemsArray = searchResults;
					$scope.originalItems = angular.copy($scope.itemsArray);

					$scope.belongsTo = {};
					angular.forEach($scope.relationsArray, function(dataInItem, key){
						if( dataInItem.relationType.name == 'belongsTo'){
							$scope.belongsTo[dataInItem.name] = true;
						}
					});

					angular.forEach($scope.itemsArray, function(dataInItem, key){
						angular.forEach($scope.belongsTo, function(val, id){
							if( typeof $scope.itemsArray[key][id] != 'undefined' ){
								var nameData = DataModels.getFirstAndLast(id, $scope.itemsArray[key][id]);
								nameData.then(
									function(ok){
										if( ok && ok !== null ){
											$scope.itemsArray[key][id] = ok.Name;
											$scope.originalItems[key][id] = ok.Name;
										}
									},
									function(success){

									}
								);
							}
						});
					});

				},
				function(err) {
				}
			);
	};


	/**
	 * Called by the UI to remove a relation
	 *  from the list of relations associated
	 *  with the current model
	 *  
	 *  @index: the index in the array of relations
	 */
	$scope.removeRelation = function(index) {
		$scope.relationsArray.splice(index, 1);
	};


	/**
	 * Called by the UI to replace the current
	 *  relations object in the database with 
	 *  a new object built from the array that's
	 *  passed in as function arg
	 *
	 *  @relations: array of relation objects
	 *		Each object in the array should be 
	 *		in the following format:
	 *
	 *		{ 
	 *			name: "Name of Related Model", 
	 *			relationType: { 
	 *				label: "Label Describing Relationship Type", 
	 *				name: "Formal Name of Relationship Type", 
	 *				pluralize: true or false (should model be pluralized in this relationship)
	 *			}
	 *		}	
	 */
	$scope.alerts = [];

	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);
	};

	var notificationList = {};
	notificationList[ob.modelNames.gateway] = {
		show: function(data) {
			return data.GatewayType === ob.gatewayTypes.egauge || data.GatewayType === ob.gatewayTypes.mediator;
		},
		getModalOptions: function (modelItem) {
			var showInstructionsController = ['$scope', '$modalInstance', 'modelItem', function ($scope, $modalInstance, modelItem) {

				$scope.modelItem = modelItem;
				$scope.gatewayTypes = ob.gatewayTypes;

				$scope.closeDialog = function () {
					$modalInstance.close();
				};
			}];
			var options = {
				controller: showInstructionsController,
				templateUrl: 'DataModels/templates/gatewayInstructions.tpl.html',
				resolve: {
					modelItem: function () {
						return modelItem;
					}
				}
			};
			return options;
		}
	};

	_.each(notificationList, function(notification, modelName) {
		$scope.$on('create:' + modelName + ':afterSave', function(event, itemId) {
			var item = DataModels.getItem(modelName, itemId);
			item.$loaded(function(data) {
				if (notification.show(data)) {
					$modal.open(notification.getModalOptions(data));
				}
			});
		});
	});

	/**
	 * Called by the UI to delete a row from ng-grid
	 */
	/*
	$scope.removeRow = function(row) {
		var userResponse = $window.confirm("Are sure you want to delete this item?");
		if (userResponse) { 
			var index = row.rowIndex;
			var itemId = row.entity._id;
			DataModels.deleteItem($scope.modelName, itemId);
			$scope.gridOptions.selectItem(index, false);
			$scope.itemsArray.splice(index, 1);
		}
	};
	*/
		$scope.loadItems();
}])
;