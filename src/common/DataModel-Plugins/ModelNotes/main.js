angular.module( 'omniboard.DataModel-Note', [])

.run(['$rootScope', 'DataModels', function($rootScope, DataModels) {
	var SubModelName = "Note";
	$rootScope.$on("model:save", function(event, model) {
		var newModelName = model.name + SubModelName;
		var lastFour = model.name.substr(model.name.length - 4);
	
		DataModels.doesModelExist(newModelName).then(
			function(modelExists) {	
				if ((!model.hasOwnProperty("isSub") || !model.isSub) && (!model.hasOwnProperty("is" + SubModelName) || !model["is" + SubModelName]) && !modelExists && lastFour !== SubModelName) { 

					var newModelRelations = {};
					newModelRelations[model.name] = {
						name: model.name,
						relationType: DataModels.getRelationType('belongsTo')
					};

					var newModel = {
						name: newModelName,
						isSub: true,
						form: [
							{
								component: "textInput",
								description: model.name + SubModelName + " Name",
								editable: false,
								id: "Name",
								index: 0,
								label: "Name",
								placeholder: model.name + SubModelName + " Name",
								required: true,
								validation: "/.*/"
							},
							{
								component: "textInput",
								description: model.name + SubModelName + " Message",
								editable: false,
								id: "Message",
								index: 0,
								label: "Message",
								placeholder: model.name + SubModelName + " Message",
								required: true,
								validation: "/.*/"
							}

						]
					};

					newModel["is" + SubModelName] = true;

					DataModels.saveModel(newModel);
					DataModels.setRelations(newModelName, newModelRelations);
				}
			}
		);
	});

}]);
