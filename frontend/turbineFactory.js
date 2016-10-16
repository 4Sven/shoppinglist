angular.module('ngTurbine', [])

.factory('Workflow', [ function() {

	var initObj = {
		name           : 'testworkflow',
		logLevel       : 'TRACE',
		queries        : {
		},
		workflow       : {
			isItemInDB : {
				yes : {
					publish : {
						message : 'addToShoppingList'
					}
				},
				no  : {
					publish : {
						message : 'addToDB'
					}
				}
			}
		}
	};

	var wflow = new Turbine(initObj);
	wflow.start();

}]);