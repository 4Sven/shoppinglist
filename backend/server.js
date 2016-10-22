var connect     = require('connect');
var favicon     = require('serve-favicon');
var serveStatic = require('serve-static');
var bodyParser  = require('body-parser');
var rest        = require('connect-rest');
var config      = require('config');
var _           = require('underscore');
var app         = connect();

var options     = {
	contex: '/api' 
};

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(rest.rester(options));

// Some mysql functions
var mysql       = require('mysql');
var pool        = mysql.createPool(config.get('Customer.dbConfig'));

// Shoppinglist
function getShoppingListData(request, content, callback) {
	/* Prepare Queries */
	var sqlAllItemsFromList = 'select c.name as category,c.position as position,i.name as item,l.quantity,i.id from item i,category c,list l where l.item = i.id and c.id = i.category order by c.position';
	//console.log(req);
	var sql = mysql.format(sqlAllItemsFromList);
	pool.query(sql, function(err, rows, fields) {
		if (err) callback(err);
		//console.log(rows);
		var groupBy = _.groupBy(rows, 'category');
		// var groupBy = _.sortBy(groupBy, function(num) {return num[0].position;} )
		callback(null, groupBy);
	});
};

function getShoppingList(callback) {
	/* Prepare Queries */
	var sqlAllItemsFromList = 'select c.name as category,c.position as position,i.name as item,l.quantity,i.id from item i,category c,list l where l.item = i.id and c.id = i.category order by c.position';
	//console.log(req);
	var sql = mysql.format(sqlAllItemsFromList);
	pool.query(sql, function(err, rows, fields) {
		if (err) return null;
		//console.log(rows);
		var groupBy = _.groupBy(rows, 'category');
		// var groupBy = _.sortBy(groupBy, function(num) {return num[0].position;} )
		//console.log(groupBy);
		callback(groupBy);
	});
};

function addShoppingListData(request, content, callback) {
	/* Select Operation */
	if (content.plusone !== undefined) {
		/* Prepare Queries */
		var sqlQuery = 'UPDATE list SET quantity=quantity+1 WHERE item=?';
		//console.log(request);
		console.log(content);
		var sql = mysql.format(sqlQuery, content.plusone);
		// console.log(sql);
	} 
	if (content.minusone !== undefined && content.quantity>1) {
		/* Prepare Queries */
		var sqlQuery = 'UPDATE list SET quantity=quantity-1 WHERE item=?';
		//console.log(request);
		console.log(content);
		var sql = mysql.format(sqlQuery, content.minusone);
		// console.log(sql);
	} 
	if (content.minusone !== undefined && content.quantity==1) {
		/* Prepare Queries */
		var sqlQuery = 'DELETE FROM list WHERE item = ?';
		//console.log(request);
		console.log(content);
		var sql = mysql.format(sqlQuery, content.minusone);
		// console.log(sql);
	} 
	if (content.item !== undefined) {
		/* Prepare Queries */
		var sqlQuery = 'INSERT INTO list SET ?';
		//console.log(request);
		// console.log(content);
		var sql = mysql.format(sqlQuery, content);
		// console.log(sql);
	}
	pool.query(sql, function(err, result) {
		callback(err, result);
	});
};

function deleteShoppingListData(request, content, callback) {
	/* Prepare Queries */
	// console.log(request.parameters);
	var sqlQuery = 'DELETE FROM list WHERE item = ?';
	var sql = mysql.format(sqlQuery, request.parameters.productId);
	// console.log(sql);
	// get connection
	pool.getConnection(function(err, connection) {
		connection.on('error', function(err) {
			// console.log('onError ' + err);
		});
		connection.query(sql, function(err, result) {
			if (err) {
				// console.log('Es gibt einen Fehler: ' + err);
				callback(null, {error: err});
			}
			// console.log(result);
			callback(null, result);
		});
		connection.release();
	});
};

// Some functions for Category
function getCategoryListData(request, content, callback) {
	/* Prepare Queries */
	var sqlAllItemsFromList = 'SELECT id, name, position FROM category order by position';
	//console.log(req);
	var sql = mysql.format(sqlAllItemsFromList);
	pool.query(sql, function(err, rows, fields) {
		if (err) callback(err);
		//console.log(rows);
		callback(null, rows);
	});
};

function addCategoryData(request, content, callback) {
	/* Prepare Queries */
	var sqlQuery = 'INSERT INTO category SET ?';
	//console.log(request);
	//console.log(content.add);
	var sql = mysql.format(sqlQuery, content.add);
	//console.log(sql);
	pool.query(sql, function(err, result) {
		if (err) callback(err);
		//console.log(result);
		callback(null, result);
	});
};

function updateCategoryData(request, content, callback) {
	/* Prepare Queries */
	var sqlQuery = 'UPDATE category SET ? WHERE ?';
	//console.log(request);
	//console.log(content.add);
	var sql = mysql.format(sqlQuery, [content.update, content.where]);
	//console.log(sql);
	pool.query(sql, function(err, result) {
		if (err) callback(err);
		// console.log(result);
		callback(null, result);
	});
};

function deleteCategoryData(request, content, callback) {
	/* Prepare Queries */
	var sqlQuery = 'DELETE FROM category WHERE id = ?';
	var sql = mysql.format(sqlQuery, request.parameters.categoryId);
	// console.log(sql);
	// get connection
	pool.getConnection(function(err, connection) {
		connection.on('error', function(err) {
			// console.log('onError ' + err);
		});
		connection.query(sql, function(err, result) {
			if (err) {
				// console.log('Es gibt einen Fehler: ' + err);
				callback(null, {error: err});
			}
			// console.log(result);
			callback(null, result);
		});
		connection.release();
	});
};

// Same functions for Products
function getProductListData(request, content, callback) {
	var resData = {};
	//console.log(request.parameters);
	if (!request.parameters.id) {
		var sqlQuery = 'SELECT COUNT(*) as anzahl FROM item i, category c WHERE c.id = i.category AND i.name like ?';
		var sql = mysql.format(sqlQuery,[
			request.parameters.where
			]);
		pool.query(sql, function(err, result) {
			//console.log(result[0]);
			resData.count = result[0].anzahl; 
		});
		
		var sqlQuery = 'SELECT i.id as id, i.name as name, c.name as category FROM item i, category c WHERE c.id = i.category AND i.name like ? order by ?? LIMIT ?, ?';
		var sql = mysql.format(sqlQuery, [
			request.parameters.where,
			request.parameters.orderBy,
			parseInt(request.parameters.page)*parseInt(request.parameters.items)-parseInt(request.parameters.items), 
			parseInt(request.parameters.items)
			]);
		//console.log(sql);
		pool.query(sql, function(err, data) {
			resData.data = data;
			callback(err, resData);
			//console.log(resData);
		});
	} else {
		var sqlQuery = 'SELECT i.id as id, i.name as name, c.id as category FROM item i, category c WHERE c.id = i.category AND i.id = ?';
		var sql = mysql.format(sqlQuery, [
			parseInt(request.parameters.id)
			]);
		//console.log(sql);
		pool.query(sql, function(err, data) {
			resData.data = data;
			callback(err, resData);
			//console.log(resData);
		});
	}
};

function addProductData(request, content, callback) {
	/* Prepare Queries */
	var sqlQuery = 'INSERT INTO item SET ?';
	console.log(request);
	console.log(content.add);
	var sql = mysql.format(sqlQuery, content.add);
	console.log(sql);
	pool.getConnection(function(err, conn) {
		if(err){
			console.log('Error Connection: ', err);
		} else {
			try {
				var query = conn.query(sql);
				query.on('error', function(err) {
					console.log('DEBUG', err)
					callback(null, err);
				});
				query.on('result', function(result) {
					callback(null, result);
				});
			} catch (err) {
				console.log('TRY ',err);
			}
		};
	});
};

function updateProductData(request, content, callback) {
	/* Prepare Queries */
	var sqlQuery = 'UPDATE item SET ? WHERE ?';
	//console.log(request);
	//console.log(content.add);
	var sql = mysql.format(sqlQuery, [content.update, content.where]);
	//console.log(sql);
	pool.query(sql, function(err, result) {
		if (err) callback(err);
		// console.log(result);
		callback(null, result);
	});
};

function deleteProductData(request, content, callback) {
	/* Prepare Queries */
	// console.log(request.parameters);
	var sqlQuery = 'DELETE FROM item WHERE id = ?';
	var sql = mysql.format(sqlQuery, request.parameters.productId);
	// console.log(sql);
	// get connection
	pool.getConnection(function(err, connection) {
		connection.on('error', function(err) {
			// console.log('onError ' + err);
		});
		connection.query(sql, function(err, result) {
			if (err) {
				// console.log('Es gibt einen Fehler: ' + err);
				callback(null, {error: err});
			}
			// console.log(result);
			callback(null, result);
		});
		connection.release();
	});
};


// Some functions for Meals
function getMealListData(request, content, callback) {
	var resData = {};
	//console.log(request.parameters);
	if (!request.parameters.id) {
		var sqlQuery = 'SELECT COUNT(*) as anzahl FROM meal WHERE meal_name like ?';
		var sql = mysql.format(sqlQuery,[
			request.parameters.where
			]);
		pool.query(sql, function(err, result) {
			//console.log(result[0]);
			resData.count = result[0].anzahl; 
		});
		
		var sqlQuery = 'SELECT meal_id, meal_name FROM meal WHERE meal_name like ? order by ?? LIMIT ?, ?';
		var sql = mysql.format(sqlQuery, [
			request.parameters.where,
			request.parameters.orderBy,
			parseInt(request.parameters.page)*parseInt(request.parameters.items)-parseInt(request.parameters.items), 
			parseInt(request.parameters.items)
			]);
		//console.log(sql);
		pool.query(sql, function(err, data) {
			resData.data = data;
			callback(err, resData);
			//console.log(resData);
		});
	} else {
		var sqlQuery = 'SELECT meal_id, meal_name FROM meal WHERE meal_id = ?';
		var sql = mysql.format(sqlQuery, [
			parseInt(request.parameters.id)
			]);
		//console.log(sql);
		pool.query(sql, function(err, data) {
			resData.data = data;
			callback(err, resData);
			//console.log(resData);
		});
	}
};

function postMealData(request, content, callback) {
	// Hinzufügen
	if (content.add!==undefined) {
		/* Prepare Queries */
		var sqlQuery = 'INSERT INTO meal SET ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, content.add);
		//console.log(sql);
	}
	// Aktualisieren
	if (content.update!==undefined) {
		/* Prepare Queries */
		var sqlQuery = 'UPDATE meal SET ? WHERE ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, [content.update, content.where]);
		//console.log(sql);
	}
	// Entfernen
	if (content.delete!==undefined) {
		/* Prepare Queries */
		var sqlQuery = 'DELETE FROM meal WHERE ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, [content.delete]);
		//console.log(sql);
	}
	try {
		//console.log('=== Debug ===')
		pool.query(sql, function(err, result) {
		if (err) callback(err, null);
		//console.log(result);
		callback(null, result);
		});		
	} catch (err) {
		// console.log('Fehlerbehandlung!')
		callback(err, null);
	}
};

// Some functions for Meals
function getMenuListData(request, content, callback) {
	var resData = {};
	//console.log(request.parameters);
	if (!request.parameters.id) {
		var sqlQuery = 'SELECT meal_name FROM menu, meal WHERE menu.meal_id=meal.meal_id';
		var sql = mysql.format(sqlQuery);
		//console.log(sql);
		pool.query(sql, function(err, data) {
			resData.data = data;
			callback(err, resData);
			//console.log(resData);
		});
	} else { //  hat erstmal keine verwendung
		var sqlQuery = 'SELECT meal_id, meal_name FROM meal WHERE meal_id = ?';
		var sql = mysql.format(sqlQuery, [
			parseInt(request.parameters.id)
			]);
		//console.log(sql);
		pool.query(sql, function(err, data) {
			resData.data = data;
			callback(err, resData);
			//console.log(resData);
		});
	}
};

function postMenuData(request, content, callback) {
	// Hinzufügen
	if (content.add!==undefined) {
		/* Prepare Queries */
		var sqlQuery = 'INSERT INTO menu SET ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, content.add);
		console.log(sql);
	}
	// Aktualisieren
	if (content.update!==undefined) { // erstmal keine verwendung
		/* Prepare Queries */
		var sqlQuery = 'UPDATE menu SET ? WHERE ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, [content.update, content.where]);
		//console.log(sql);
	}
	// Entfernen
	if (content.delete!==undefined) {
		/* Prepare Queries */
		var sqlQuery = 'DELETE FROM menu WHERE ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, [content.delete]);
		//console.log(sql);
	}
	pool.query(sql, function(err, result) {
	if (err) callback(err);
	//console.log(result);
	callback(null, result);
	});
};


// Some functions for Units
function getUnitListData(request, content, callback) {
	if (!request.parameters.id) {
		console.log('run getUnitListData ohne ID');
		var sqlQuery = 'SELECT unit_id, unit_name FROM unit';
		var sql = mysql.format(sqlQuery);
		console.log(sql);
	} else {
		console.log('run getUnitListData mit ID');
		var sqlQuery = 'SELECT i.id as id, i.item_id AS unit_id, u.unit_name AS unit_name FROM  `item_unit` i,  `unit` u WHERE i.unit_id = u.unit_id AND item_id = ?';
		var sql = mysql.format(sqlQuery, request.parameters.id);
		console.log(sql);
	}
	pool.query(sql, function(err, data) {
		callback(err, data);
		//console.log(resData);
	});
};

function postUnitData(request, content, callback) {
	console.log("postUnitData")
	// Hinzufügen
	if (content.add!==undefined) {
		console.log("Add")
		/* Prepare Queries */
		var sqlQuery = 'INSERT INTO item_unit SET ?';
		//console.log(request);
		console.log(content.add);
		var sql = mysql.format(sqlQuery, content.add);
		console.log(sql);
	}
	// Entfernen
	if (content.delete!==undefined) {
		/* Prepare Queries */
		var sqlQuery = 'DELETE FROM item_unit WHERE ?';
		//console.log(request);
		//console.log(content.add);
		var sql = mysql.format(sqlQuery, [content.delete]);
		//console.log(sql);
	}
	pool.query(sql, function(err, result) {
	if (err) callback(err);
	//console.log(result);
	callback(null, result);
	});
};

// Function to test a Service
function testService(request, content, callback) {
	console.log('Receive headers: ' + JSON.stringify( request.headers ));
	console.log('Receive parameters: ' + JSON.stringify( request.parameters ));
	console.log('Receive JSON object: ' + JSON.stringify( content ));
	callback(null, 'ok');
};

// Daten für Drucker vorbereiten und in eine Datei schreiben
function printOut(request, content, callback){
	getShoppingList(function(shoppingList){
		//console.log(shoppingList);
		if(!shoppingList) return null;
		var text = "# -*- coding: UTF-8 -*-\n\n";
		   	text += "import prints\n";
		   	text += "def printShoppingQueue(printer):\n";
		for (var categories in shoppingList) {
			//console.log('printHead("' + categories + '");');
		   	text += '\tprints.printHead(printer);\n';
		   	text += '\tprints.putLine("' + categories + '", printer);\n';
		   	text += '\tprints.printItem(printer);\n';
			//console.log(shoppingList[categories]);
			for(item in shoppingList[categories]) {
				//console.log('printItem("' + shoppingList[categories][item].item + ' x' + shoppingList[categories][item].quantity + '");');
			   	text += '\tprints.putLine("' + shoppingList[categories][item].item + ' x' + shoppingList[categories][item].quantity + '", printer);\n';
			}
		}
		var fs = require('fs');
		//console.log(text);
		var options={};
		options.encoding='UTF-8';
		fs.writeFile('../items.py', text);
	});
	var exec  = require('child_process').exec;
	var child = exec('cd .. && sudo python einkaufszettel.py', function(err, stdout, stderr){
		console.log(err, stdout, stderr);
	});
	callback(null, 'ok');
}

// RESTful
  // Shoppinglist
rest.get   ('/getshoppinglist', getShoppingListData);
rest.post  ('/getshoppinglist', addShoppingListData);
rest.assign(['delete'], '/getshoppinglist', deleteShoppingListData);

  // Category
rest.get   ('/category', getCategoryListData);
rest.post  ('/category', addCategoryData);
rest.put   ('/category', updateCategoryData);
rest.assign(['delete'], '/category/:categoryId', deleteCategoryData);

  // Product
rest.get   ('/product', getProductListData);
rest.post  ('/product', addProductData);
rest.put   ('/product', updateProductData);
rest.assign(['delete'], '/product/:productId', deleteProductData);

  // Meals
rest.get  ('/meal', getMealListData);
rest.post ('/meal', postMealData);

  // Units
rest.get  ('/unit', getUnitListData);
rest.post ('/unit', postUnitData);

  // Menus
rest.get  ('/menu', getMenuListData);
rest.post ('/menu', postMenuData)

  // Print
rest.get   ('/print', printOut);

  // Testing
rest.assign( '*', { path: '/test/:item', version: '>=1.0.0' }, testService);

// Favicon
app.use(favicon('pictures/favicon.ico'));

// Static Content
app.use(serveStatic('../frontend'));

// run server listen
app.listen(config.get('Customer.serverPort'));
console.log("Server is running on port "+config.get('Customer.serverPort'));
