angular.module( 'omniboard.ModelItemLocation', ['Geocode'])



.run(['$rootScope', 'DataModels', 'Geocode', function($rootScope, DataModels, Geocode) {
	$rootScope.$on("create:Site:preSave", function(event, site) {
		//whenever a event is broadcast create the site
		event.preventDefault();

		//Get list of model props from form object
		var form = DataModels.getModelForm("Site").$asObject();
		form.$loaded().then(
			function(data) {
				var locationProp;
				
				angular.forEach(form, function(formField) {
					if (formField.component == "location") {
						locationProp = formField.label;
					}
				});

				if (locationProp) {
					var locationText = site.Address + ", " + site.City + ", " + site.State + "  " + site.Zip;
					Geocode.fetch(locationText).then(
						function(loc) {
							site["Location"] = loc;
							$rootScope.$broadcast('create:Site:preSave:success', site);
						},
						function(err) {
							$rootScope.$broadcast('create:Site:preSave:failure', err);
						}
					);
				}
			}
		);
	});

	$rootScope.$on("update:Site:preSave", function(event, site) {
		//whenever a event is broadcast create the site
		event.preventDefault();

		//Get list of model props from form object
		var form = DataModels.getModelForm("Site");
		form.$loaded().then(
			function(data) {
				var locationProp;
				
				angular.forEach(form, function(formField) {
					if (formField.component == "location") {
						locationProp = formField.label;
					}
				});

				if (locationProp) {
					var locationText = site.Address + ", " + site.City + ", " + site.State + "  " + site.Zip;
					Geocode.fetch(locationText).then(
						function(loc) {
							site["Location"] = loc;
							$rootScope.$broadcast('update:Site:preSave:success', site);
						},
						function(err) {
							$rootScope.$broadcast('update:Site:preSave:failure', err);
						}
					);
				}
			}
		);
	});	

	$rootScope.$on("model:save", function(event, model) {
		var form = DataModels.getModelForm(model.name).$asObject();
		form.$loaded().then(
			function(data) {
				var locationProp;
				
				angular.forEach(form, function(formField) {
					if (formField.component == "location") {
						locationProp = formField.label;
					}
				});

				if (locationProp) {
					DataModels.getModelPluginsListRef("Location").child(model.name).set(true);
				}
			}
		);		
	});	
}])

;