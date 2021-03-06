angular.module('shoppingListApp', ['ui.bootstrap','ngResource','ngRoute','ngTouch'])

.config(function($routeProvider, $locationProvider) {
	$locationProvider.html5Mode(false);
	//$locationProvider.hashPrefix('!');
	$routeProvider
		.when('/shoppinglist', 
			{ 
				templateUrl: 'partials/shoppinglist.html',
				controller:  'ShoppingListController'
			}
		)
		.when('/editcategories',
			{
				templateUrl: 'partials/categorylist.html',
				controller:  'CategoryListController'
			}
		)
		.when('/detailcategories',
			{
				templateUrl: 'partials/categorydetail.html',
				controller:  'CategoryDetailController'
			}
		)
		.when('/menus',
			{
				templateUrl: 'partials/menus.html',
				controller:  'MenusListCtrl'
			}
		)
		.when('/meals',
			{
				templateUrl: 'partials/meals.html',
				controller:  'MealListCtrl'
			}
		)
		.when('/mealsdetails',
			{
				templateUrl: 'partials/mealdetail.html',
				controller:  'MealCtrl'
			}
		)
		.when('/products',
			{
				templateUrl: 'partials/products.html',
				controller:  'ProductListCtrl'
			}
		)
		.when('/productdetails',
			{
				templateUrl: 'partials/productdetail.html',
				controller:  'ProductCtrl'
			}
		)
		.otherwise({ redirectTo: '/shoppinglist' })
})

.factory('ShoppingListFactory', function($resource) {
	return $resource("/api/getshoppinglist", {item:'@id'}, {
		query: {method: 'GET', isArray:false},
		post: {method: 'POST'},
		update: {method: 'PUT'},
		remove: {method: 'DELETE'}
	});
})

.factory('Category', function($resource) {
	return $resource("/api/category/:categoryId", {categoryId:'@id'}, {
		query: {method: 'GET', isArray:true},
		post: {method: 'POST'},
		update: {method: 'PUT'},
		remove: {method: 'DELETE'}
	});
})

.factory('Product', function($resource) {
	return $resource("/api/product/:productId", {productId:'@id'}, {
		query: {method: 'GET', isArray:false},
		post: {method: 'POST'},
		update: {method: 'PUT'},
		remove: {method: 'DELETE'}
	});
})

.factory('Meal', function($resource) {
	return $resource("/api/meal/:mealId", {mealId:'@id'}, {
		query: {method: 'GET', isArray:false},
		post: {method: 'POST'}
	});
})


.factory('MenuData', function($resource) {
	return $resource("/api/menu/:menuId", {menuId:'@id'}, {
		query: {method: 'GET', isArray:false},
		post: {method: 'POST'}
	});
})

.factory('Unit', function($resource) {
	return $resource("/api/unit/:unitlId", {unitId:'@id'}, {
		query: {method: 'GET', isArray:true},
		post: {method: 'POST'}
	});
})

.factory('Printer', function($resource) {
	return $resource("/api/print", {}, {
		query: {method: 'GET', isArray:false},
	});
})

.factory('TempStoreData', function() {
	var savedData = {};
	function set(data) {
		savedData=data;
	};
	function get() {
		return savedData;
	};
	return {
		set: set,
		get: get
	};
})

.factory('Item', function($log) {
	return {
		name     : "",
		category : "",
		id       : null,

		inCatalog: function() {
			$log.log('inCatalog ', this.id);
			if(this.id) {
				return true;
			} else {
				// check if Item.name already exist (future use)
				return false;
			}
		},

		reset: function() {
			$log.log('reset Item');
			this.name = "";
			this.category = "";
			this.id = null;
		},

		load: function(item) {
			$log.log('load Item', item);
			this.id = item.id;
			this.name = item.name;
			this.category = item.category;
		},

		get: function() {
			return this;
		}
	}
})

.factory('Workflow', ['$log', '$location', '$rootScope', 'Item', 'ShoppingListFactory', function($log, $location, $rootScope, Item, ShoppingListFactory) {
	$log.log('Start Factory Workflow');
	var initObj = {
		name           : 'shoppinglist',
		logLevel       : 'DEBUG',
		queries        : {
			inCatalog  : Item.inCatalog.bind(Item),
			getItem    : Item.get.bind(Item)
		},
		responses      : {
			isAppRunning : true,
			listProducts : true
		},
		workflow       : {

			isAppRunning : {
				yes : {
					publish : {
						message : 'GoToCart'
					},
					waitFor : [
						{
							message : 'shoppinglist:add',
							then : 'inCatalog'
						},
						{
							message : 'shoppinglist:trash',
							then : 'isAppRunning'
						},
						{
							message : 'GoToProducts',
							then : 'listProducts'
						}
					]
				}
			},

			listProducts : {
				yes : {
					publish : {
						message : 'GoToProductsList'
					},
					waitFor : [
						{
							message : 'productList:add',
							then    : 'addProduct'
						},
						{
							message : 'productList:edit',
							then    : 'editProducts'
						},
						{
							message : 'editProduct:drop',
							then    : 'listProducts'
						},
						{
							message : 'productList:back',
							then    : 'isAppRunning'
						},
						{
							message : 'makeNewEntry:cancel',
							then    : 'listProducts'
						},
						{
							message : 'GoToCart',
							then    : 'isAppRunning'
						}
					]
				}
			},

			inCatalog : {
				yes : {
					publish : {
						message : 'addToCart'
					},
					waitFor : 'addedToCart',
					then    : 'isAppRunning'
				},
				no  : {
					publish : {
						message : 'makeNewEntry',
						using : {
							Item : Item
						}
					},
					waitFor : [
						{
							message : 'makeNewEntry:added',
							then    : 'inCatalog'
						},
						{
							message : 'makeNewEntry:cancel',
							then    : 'isAppRunning'
						}
					]
				}
			}
		}
	};

	turbine = new Turbine(initObj);

	var $rootScope = angular.element(turbine).bind('GoToCart', function(event, payload) {
		Item.reset();
		$log.debug('Running GoToCart...', payload, Item);
		$location.path('/shoppinglist');
	});

	var $rootScope = angular.element(turbine).bind('productList:back', function(event, payload) {
		Item.reset();
		$log.debug('Running productList:back...', payload, Item);
		$location.path('/shoppinglist');
	});

	var $rootScope = angular.element(turbine).bind('GoToProductsList', function(event, payload) {
		$log.debug('Running GoToProductsList...', payload, Item);
		$location.path('/products');
	});

	var $rootScope = angular.element(turbine).bind('shoppinglist:add', function(event, payload) {
		Item.load(payload);
		$log.debug('Running shoppinglist:add...', payload, Item);
	});

	var $rootScope = angular.element(turbine).bind('shoppinglist:added', function(event, payload) {
		$log.debug('Running shoppinglist:added...', payload, Item);
	});

	var $rootScope = angular.element(turbine).bind('addToCart', function(event, payload) {
		$log.debug('Running addToCart...', payload, Item);
		ShoppingListFactory.post({}, {item: Item.id, quantity: 1})
				.$promise.then(function(data) {
					Item.reset();
					angular.element(turbine).trigger('addedToCart');
				});
	});

	var $rootScope = angular.element(turbine).bind('makeNewEntry', function(event, payload) {
		$log.debug('Running makeNewEntry...', payload, Item);	
		$location.path('/productdetails');
	});

	var $rootScope = angular.element(turbine).bind('makeNewEntry:cancel', function(event, payload) {
		$log.debug('Running makeNewEntry:cancel...', payload, Item);	
		$location.path('/shoppinglist');
	});

	var $rootScope = angular.element(turbine).bind('makeNewEntry:addToCart', function(event, payload) {
		$log.debug('Running makeNewEntry:addToCart...', payload, Item);	
		$location.path('/shoppinglist');
	});

	turbine.start();

	//$log.debug('after turbine start', angular.element(turbine));

	return turbine;

}])

.controller('MenuController', ['Workflow', '$scope', '$location', '$log', 'Printer', function (Workflow, $scope, $location, $log) {

	$('.nav a').on('click', function(){
		$(".navbar-toggle").click();
	});

	$scope.go = function(path) {
		$location.path(path);
	};

	$scope.trigger = function(triggername) {
		angular.element(turbine).trigger(triggername);
	};

	$scope.onHammer = function(event) {
		$log.log(event);
	};

}])

// Factory und Controller für Meldungen an Benutzer.
.factory('Alert', function($rootScope) {
	var service = {};	

	$rootScope.alerts = [
    	//{ type: 'danger', msg: 'Warning! Best check yo self, you are not looking too good.' }
    ];

    // type: success, info, warning, danger, primary
    service.openAlert = function(type, msg) {
    	$rootScope.alerts.push({'type': type, 'msg': msg});
    };

    service.closeAlert = function(index) {
    	$rootScope.alerts.splice(index, 1);
    };

    return service;
})

.controller('AlertCtrl', function ($rootScope, Alert) {
	$rootScope.closeAlert = Alert.closeAlert;
})

.controller('ShoppingListController', function(Workflow, Item, Printer, $scope, $rootScope, $log, $location, ShoppingListFactory, Product, TempStoreData) {
	
	$log.debug('ShoppingListController');	
	
	$scope.keys = function(obj) {
		return obj? Object.keys(obj) : [];
	};

	refresh = function() {
		ShoppingListFactory.query()
		.$promise.then(function(data) {
			$scope.myShoppingList = JSON.parse(angular.toJson(data));
			//$log.log(data)
		});
	};
	refresh();

	$scope.getItem = function(val) {
		//$log.log(val);
		return Product.query({
			page:    '1',
			items:   '5',
			orderBy: 'name',
			where:   '%' + val + '%'
		}).$promise.then(function(data) {
				//$log.log(data.data);
				return data.data;
			}
		);
	};

	$scope.createItem = function() {
		if($scope.item.id) {return false} else {return true}
	};
	
	startWorkflow = function() {
		//Workflow.start();
		var $rootScope = angular.element(turbine).bind('addedToCart', function(event, payload) {
			$log.debug('Running addedToCart...');
			$scope.item = undefined;
			refresh();
		});
	};

	$scope.print = function() {
		//$log.log('Drucken gedrückt');
		Printer.query();
	}

	$scope.add = function() {
		startWorkflow();
		$log.debug('ShoppingListController | add', $scope.item);
		if ($scope.item.id) {
			Item.load($scope.item);
		} else {
			Item.load({
				id         :null,
				name       :$scope.item,
				category   :null
			});
		};
		angular.element(turbine).trigger("shoppinglist:add", Item);
		//$log.debug(angular.element(turbine));
	};

	$scope.drop = function(productListData) {
		// $log.log("drop in shoppinglist", productListData);
		ShoppingListFactory.remove({productId: productListData.id})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Es gab ein Fehler beim löschen!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					refresh();
				}
			});
	};


	$scope.plusone = function(productListData) {
		$log.log("Plus One Item", productListData);
		ShoppingListFactory.post({}, {plusone: productListData.id})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Es gab ein Fehler beim löschen!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					refresh();
				}
			});
	};


	$scope.minusone = function(productListData) {
		$log.log("Minus One Item", productListData);
		ShoppingListFactory.post({}, {minusone: productListData.id, quantity: productListData.quantity})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Es gab ein Fehler beim löschen!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					refresh();
				}
			});
	};

    $scope.goDetails = function() {
      angular.element(turbine).trigger("GoToProducts");
    };

    $scope.clearList = function() {
    	ShoppingListFactory.post({}, {truncate: true})
    		.$promise.then(function(data) {
    			refresh();
    		});
    };

})

.controller('CategoryListController', function($scope, Category, $log, $location, TempStoreData, Alert) {
	//$log.log('Start CategorylistController');
	refresh = function() {
		Category.query()
			.$promise.then(function(data) {
				$scope.myCategoriesList = data;
			}
		)
	};
	refresh();

	// Kategorie erstellen
	$scope.create = function() {
		//$log.log($scope.newCategory);
		$location.path("/detailcategories");
		TempStoreData.set($scope.item);
	};

	// Kategorie bearbeiten
	$scope.edit = function(categoryData) {
		$location.path("/detailcategories");
		TempStoreData.set(categoryData);
		//$log.log(categoryData);
	};

	$scope.drop = function(categoryData) {
		//$log.log("drop")
		Category.remove({categoryId: categoryData.id})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Sie können keine Kategorien löschen die noch verwendet werden!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					refresh();
				}
			});
	};

})

.controller('CategoryDetailController', function($scope, $log, $location, TempStoreData, Category) {
	//$log.log('Start CategoryDetailController');
	$scope.item = TempStoreData.get();

	$scope.add = function() {
		//$log.log("Add")
		Category.post({}, {add: $scope.item})
			.$promise.then(function(data) {
				//$log.log(data);
				$location.path("/editcategories");
			}),
			function(error) {
				$log.log(error);
			};
	};

	$scope.update = function() {
		//$log.log("Update")
		Category.update({}, {update: $scope.item, where: {"id": $scope.item.id}})
			.$promise.then(function(data) {
				//$log.log(data);
				$location.path("/editcategories");
			}),
			function(error) {
				$log.log(error);
			};
	};

	$scope.drop = function() {
		//$log.log("drop")
		Category.remove({categoryId: $scope.item.id})
			.$promise.then(function(data) {
				//$log.log(data);
				$location.path("/editcategories");
			}),
			function(error) {
				$log.log(error);
			};
	};

	$scope.cancel = function() {
		$location.path("/editcategories");
	};
})

.controller('MealListCtrl', function($scope, $log, $location, TempStoreData, Meal, MenuData, Alert) {
	$log.log('MealListCtrl');
	//Pagination
	$scope.setPage = function (pageNo) {
    	$scope.CurrentPage = pageNo;
  	};

  	$scope.pageChanged = function() {
  		refresh();
  	};


  	$scope.search = function() {
  		if($scope.item) {
  			$scope.sqlSearch = '%' + $scope.item.meal_name + '%'
  			refresh();
  		}
  	};

  	$scope.sort = function(field) {
  		//$log.log('sort clicked');
  		$scope.sortOrder = field;
  		refresh();
  	};

	$scope.CurrentPage=1;
	$scope.maxSize=6; // Anzahl der Buttons im Paginator
	$scope.itemsPerPage=6;
	$scope.sortOrder='meal_name';
	$scope.sqlSearch = '%';

	refresh = function() {
		TempStoreData.set({});
		Meal.query({
			page:    $scope.CurrentPage,
			items:   $scope.itemsPerPage,
			orderBy: $scope.sortOrder,
			where:   $scope.sqlSearch
		})
			.$promise.then(function(data) {
				$scope.MealList = data.data;
				$scope.TotalItems = data.count;
			}
		);
	};
	refresh();

	// create
	$scope.create = function() {
		$location.path('/mealsdetails');
		if($scope.item) TempStoreData.set($scope.item);
	};

	// Produkt bearbeiten
	$scope.edit = function(mealData) {
		$location.path("/mealsdetails");
		TempStoreData.set(mealData);
	};

	$scope.addmenu = function(mealData) {
		// Gericht zur Karte hinzufügen
		$log.log("Add Meal to Menu");
		$log.log(mealData);
		MenuData.post({}, {add: {"meal_id": mealData.meal_id}})
			.$promise.then(function(data) {
				$log.log(data);
			}),
			function(error) {
				$log.log(error);
			};
	};

	$scope.drop = function(mealData) {
		//$log.log("drop in list", mealData);
		//$log.log("Delete")
		Meal.post({}, {delete: {"meal_id": mealData.meal_id}})
			.$promise.then(function(data) {
				//$log.log(data);
				refresh();
			}),
			function(error) {
				$log.log(error);
			};
		TempStoreData.set({});
	};

	$scope.cancel = function() {
		$location.path("/meals");
	};


})


.controller('MealCtrl', function(Worklow, $scope, $rootScope, $log, $location, TempStoreData, Meal, Alert) {
	$scope.item = TempStoreData.get();
	TempStoreData.set({});

	loadMeal = function(id) {
		Meal.query({
			id: id
		})
			.$promise.then(function(data) {
				$scope.item = data.data[0];
				//$log.log(data);
			}
		);
	};

	if ($scope.item.meal_id) {
		//$log.log('id ist gesetzt', $scope.item.id);
		loadMeal($scope.item.meal_id);
	}

	$scope.add = function() {
		//$log.log("Add")
		Meal.post({}, {add: $scope.item})
			.$promise.then(function(data) {
				$log.log(data);
				angular.element(turbine).trigger('makeNewEntry:added', $scope.item);
			}),
			function(error) {
				$log.log(error);
				Alert.openAlert('danger', error);
			};
	};

	$scope.update = function() {
		//$log.log("Update")
		Meal.post({}, {update: $scope.item, where: {"meal_id": $scope.item.meal_id}})
			.$promise.then(function(data) {
				//$log.log(data);
				$location.path("/meals");
			}),
			function(error) {
				$log.log(error);
			};
		TempStoreData.set({});
	};

	$scope.drop = function() {
		//$log.log("Update")
		Meal.post({}, {delete: {"meal_id": $scope.item.meal_id}})
			.$promise.then(function(data) {
				//$log.log(data);
				$location.path("/meals");
			}),
			function(error) {
				$log.log(error);
			};
		TempStoreData.set({});
	};

	$scope.cancel = function() {
		angular.element(turbine).trigger('makeNewMeal:cancel');
	};

	$scope.ingredients = function() {
		$scope.setIngredients = true;
	}

})



.controller('ProductListCtrl', function($scope, $log, $location, Workflow, Item, Product, Alert) {
	//Pagination
	$scope.setPage = function (pageNo) {
    	$scope.CurrentPage = pageNo;
  	};

  	$scope.pageChanged = function() {
  		refresh();
  	};


  	$scope.search = function() {
  		if($scope.item) {
  			$scope.sqlSearch = '%' + $scope.item.name + '%'
  			refresh();
  		}
  	};

  	$scope.sort = function(field) {
  		//$log.log('sort clicked');
  		$scope.sortOrder = field;
  		refresh();
  	};

	$scope.CurrentPage=1;
	$scope.maxSize=6; // Anzahl der Buttons im Paginator
	$scope.itemsPerPage=6;
	$scope.sortOrder='name';
	$scope.sqlSearch = '%';

	refresh = function() {
		Product.query({
			page:    $scope.CurrentPage,
			items:   $scope.itemsPerPage,
			orderBy: $scope.sortOrder,
			where:   $scope.sqlSearch
		})
			.$promise.then(function(data) {
				$scope.ProductList = data.data;
				$scope.TotalItems = data.count;
			}
		);
	};
	refresh();

	// create
	$scope.create = function() {
		$log.log('create a new product… ', $scope.item);
		if($scope.item) Item.load($scope.item);
		$location.path('/productdetails');
	};

	// Produkt bearbeiten
	$scope.edit = function(productData) {
		Item.load(productData);
		$location.path("/productdetails");
	};

	$scope.drop = function(productData) {
		$log.log("drop in list", productData);
		Product.remove({productId: productData.id})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Dieses Produkt kann erst gelöscht werden, wenn es nicht mehr auf dem Einkaufszettel steht!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					refresh();
				}
			});
	};

	$scope.back = function() {
      angular.element(turbine).trigger("productList:back");
    };

})

.controller('MenusListCtrl', function($scope, $log, MenuData) {
	console.log("MenusListCtrl");

	refresh = function() {
		MenuData.query()
			.$promise.then(function(data) {
				$scope.MenuDataList = data.data;
			}
		);
	};
	refresh();

})
.controller('ProductCtrl', function($scope, $rootScope, $log, $location, Item, Product, Unit, Category, Alert) {
	console.log("ProductCtrl");
	$scope.item = Item.get();
	$log.log($scope.item);

	getCategories = function() {
		Category.query()
			.$promise.then(function(data) {
				$scope.dropdownCategories = data;
			}
		)
	};
	getCategories();

	getUnits = function() {
		Unit.query()
			.$promise.then(function(data) {
				$scope.dropdownUnits = data;
			}
		)
	};
	getUnits();

	getUnitsForProduct = function(id) {
		Unit.query({id:id})
			.$promise.then(function(data) {
				$scope.ItemUnitList = data;
			}
		)
	};
	getUnitsForProduct($scope.item.id);

	loadProduct = function(id) {
		Product.query({
			id: id
		})
			.$promise.then(function(data) {
				$scope.item = data.data[0];
				//$log.log(data);
			}
		);
	};

	if ($scope.item.id) {
		//$log.log('id ist gesetzt', $scope.item.id);
		loadProduct($scope.item.id);
	}

	$scope.add = function() {
		//$log.log("Add")
		Product.post({}, {add: $scope.item})
			.$promise.then(function(data) {
				//$log.log('DEBUG', data);
				if (data.error) {
					$log.log(data.error);
					Alert.openAlert('danger', 'Sie können diesen Artikel nicht hinzufügen (' + data.error.errno + ')!');
				} else {
					$log.log(data.result, data.result.insertId);
					//insertid = neue Item nummer
					$scope.item.id = data.result.insertId;
					$log.log('Debug: ', $scope.item);
					var $rootScope = angular.element(turbine).trigger('makeNewEntry:added', $scope.item);
				};
				//$location.path("/products");
			})
		//TempStoreData.set({});
	};

	$scope.addUnitForProduct = function(item, unit) {
		$log.log("Add " + item + " " + unit )
		Unit.post({}, {add: {"item_id":item, "unit_id":unit}})
			.$promise.then(function(data) {
				$log.log(data);
				getUnitsForProduct($scope.item.id);
			}),
			function(error) {
				$log.log(error);
			};
		TempStoreData.set({});
	};

	$scope.update = function() {
		$log.log("Update")
		Product.update({}, {update: $scope.item, where: {"id": $scope.item.id}})
			.$promise.then(function(data) {
				//$log.log(data);
				$location.path("/products");
			}),
			function(error) {
				$log.log(error);
			};
		TempStoreData.set({});
	};

	$scope.drop = function(productData) {
		$log.log("drop")
		Product.remove({productId: productData.id})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Dieses Produkt kann erst gelöscht werden, wenn es nicht mehr auf dem Einkaufszettel steht!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					var $rootScope = angular.element(turbine).trigger('editProduct:drop');
				}
			});
	};

	$scope.dropUnitFromItem = function(UnitId) {
		$log.log("dropUnitFromItem " + UnitId)
		Unit.post({},{delete: {id: UnitId}})
			.$promise.then(function(data) {
				if (data.error) {
					switch(data.error.errno) {
						case 1451:
							//$log.error('Sie können keine Kategorien löschen die noch verwendet werden!');
							Alert.openAlert('danger', 'Dieses Produkt kann erst gelöscht werden, wenn es nicht mehr auf dem Einkaufszettel steht!');
							break;
						default:
							$log.error(data.error.errno);
					}
				} else {
					getUnitsForProduct($scope.item.id);
				}
			});
	};

	$scope.cancel = function() {
		var $rootScope = angular.element(turbine).trigger('makeNewEntry:cancel');
	};

})
