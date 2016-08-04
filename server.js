var formidable = require('formidable');
var bodyParser = require('body-parser');
var util = require('util');
var nano = require('nano')('http://localhost:5984');
var path = require('path');
var url = require('url');
var fs = require('fs');
var express = require('express');

var app = express();

var dao;
nano.db.list(function(err, body) {
	// body is an array
	body.forEach(function(db) {
		if (db === 'vykraj') {
			dao = nano.use(db);
		}
	});
});
if (typeof table === 'undefined') {
	dao = nano.db.create('vykraj');
}

app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows this server to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});

app.get("/", function(req, res) {
	console.log("Accessing: <root>");
	
	res.sendFile(path.join(__dirname + '/public/index.html'));
	
	/*
	// show a file upload form
	res.writeHead(200, {
		'content-type' : 'text/html'
	});
	var resp = "";
	if (typeof msg !== 'undefined') {
		resp += "<div id='msg'>" + msg + "</div>";
	}
	resp += '<form action="/upload" enctype="multipart/form-data" method="post">'
			+ '<table border = "1">'
			+ '<tr><td>Název:</td><td><input type="text" name="nazev"/></td></tr>'
			+ '<tr><td>Foto:</td><td><input type="file" name="upload" multiple="multiple"></td></tr>'
			+ '<tr><td>Štítky:</td><td><input type="text" name="tagy"/></td></tr>'
			+ '<tr><td>Popis:</td><td><textarea rows="10" cols="50" name="popis"></textarea></td></tr>'
			+ '</table>'
			+ '<input type="submit" value="Upload">'
			+ '</form>';

	table.list(function(err, body) {
		console.log("listing");
		resp += "<div><table><tr>" + "<th>Název</th>"
				+ "<th>Datum</th>" + "<th>Popis</th>"
				+ "<th>Štítky</th>" + "</tr>";
		var count = body.rows.length;
		body.rows.forEach(function(row) {
			table.get(row.id, {revs_info : true}, function(err, item) {
				if (!err) {
					resp += "<tr>";
					resp += "<td>" + item.jmeno + "</td>";
					resp += "<td>" + new Date(item.datum).toISOString() + "</td>";
					resp += "<td>" + item.popis + "</td>";
					resp += "<td>" + item.tagy + "</td>";
					
					if (typeof item._attachments !== 'undefined') {
						resp += "<td><img src='image?id=" + row.id
								+ "&image="
								+ Object.keys(item._attachments)[0]
								+ "'/></td>";
					} else {
						resp += "<td></td>";
					}
					resp += "</tr>";

					count--;
					if (count == 0) {
						resp += "</table></div>";
						res.end(resp);
					}
				}
			});
		});
	});
	 */
});

// Data
app.get("/data", function(req, res) {
	console.log("Accessing: /data");
	var json = [];
	dao.list(function(err, body) {
		var count = body.rows.length;
		body.rows.forEach(function(row) {
			dao.get(row.id, {revs_info : true}, function(err, item) {
				if (!err) {
					var jsonItem = {
						id: row.id, 
						jmeno: item.nazev,
						datum: new Date(item.datum).toISOString(),
						popis : item.popis,
						tagy: item.tagy
					};
					
					if (typeof item._attachments !== 'undefined') {
						jsonItem.foto = Object.keys(item._attachments)[0];
					}
					json.push(jsonItem);

					count--;
					if (count == 0) {
						res.send(json);
					}
				}
			});
		});
	});
});

// Images
app.get("/image", function(req, res) {
	console.log("Accessing: /image");
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	dao.attachment.get(query.id, query.image, function(err, body) {
		if (!err) {
			res.end(body, 'binary');
		}
	});
});

app.post("/data", function(req, res) {
	console.log("Posting: /data");
	// parse a file upload
	var form = new formidable.IncomingForm();
	var dbTO = {
		datum : Date.now()
	};
	var dbFile; 

	form.parse(req, function(err, fields, files) {
	});

	form.on('fileBegin', function(name, file) {
		console.log('fileBegin on: ' + name);
		console.log('fileBegin on: "' + file.name
				+ '"');
		dbFile = file;
	});

	form.on('field', function(name, value) {
		console.log('Read field: "' + name + '" value: "'
				+ value + '"');
		if (name == "nazev") {
			dbTO.nazev = value;
		}
		if (name == "tagy") {
			dbTO.tagy = value;
		}
		if (name == "popis") {
			dbTO.popis = value;
		}
	});

	form.on('file', function(name, file) {
		console.log('Uploaded ' + file.name);
	});

	form.on('end', function() {
		var msg = "";
		if (typeof dbFile.name !== 'undefined' && dbFile.name != '') {
			dao.insert(dbTO, null, function(err, body) {
				if (!err) {
					console.log(body);
					fs.readFile(dbFile.path, function(err, data) {
					  if (!err) {
					    dao.attachment.insert(body.id, dbFile.name, data, dbFile.type,
					      { rev: body.rev }, function(err, body) {
					        if (!err) {
					          console.log(body);
					          createResponse();
					        } else {
					        	msg = "Nezdařilo se vložit obrázek";
					        }
					    });
					  } else {
						  msg = "Nezdařilo se načíst obrázek";
					  }
					});
				} else {
				  msg = "Nezdařilo se vložit záznam do DB";
				}
			});	
		} else {
			 msg = "Nebyl vložen obrázek";
		}
		if (msg !== "") {
			createResponse(msg);
		}
	});
});

app.listen(3000);

console.log("Ready and listening..."); 