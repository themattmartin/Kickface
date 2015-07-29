angular.module( 'omniboard.ModelItemkWh', [])



.run(['$rootScope', 'DataModels', 'es', '$http', function($rootScope, DataModels, es , $http) {
	$rootScope.$on("create:Power:preSave", function(event, utilityBill) {
		//whenever a event is broadcast create the site
		event.preventDefault();

		var queryParams = {
			index: es.getIndexName(),
			type: 'Point',
			body: {
				size: 500,
				sort: ['Name.raw'],
				query: {
					filtered: {
						filter: { 
							bool: {
								must: [
									{	
										"term" : {"Site" : utilityBill.Site }
									},
									{
										"term" : {"Name" : 'kwh'} 
									}
								]
							}
						}
					}
				}
			}
		};

		es.get().search(queryParams).then(function (resp) {
			if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
				var searchResults = [];
				resp.hits.hits.forEach(function (hit, index) {
					var result = hit._source;
					result._id = hit._id;

					var startDate = Date.parse(utilityBill.StartOfBillingCycle);
					var endDate = Date.parse(utilityBill.EndOfBillingCycle);

					var pointId = 'Model:Point.Property:Value.ItemId:'+result._id+'.'+result._id;
					
					webServiceURL = '/getKWHHistory?pt='+pointId+'&interval=1&units=month&sd='+startDate+'&ed='+endDate+'&rollupFunction=range';
					$http({method: 'GET', url: webServiceURL}).
					success(function(processedData, status, headers, config) {
						utilityBill["CalculatedKWH"] = processedData[pointId];
						$rootScope.$broadcast('create:Power:preSave:success', utilityBill);
					});

				});

			} else {
				// do nothing
			}
		}, function (err) {
			// there was an error
		});

	});

	$rootScope.$on("update:Site:preSave", function(event, site) {
		//whenever a event is broadcast create the site
		event.preventDefault();
	});	

	$rootScope.$on("model:save", function(event, model) {

	});	
}])

;