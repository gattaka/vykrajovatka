var formidable = require('formidable');
var http = require('http');
var util = require('util');
var nano = require('nano')('http://localhost:5984');
var url = require('url');
var fs = require('fs');

var table;
nano.db.list(function(err, body) {
	// body is an array
	body.forEach(function(db) {
		if (db === 'vykraj') {
			table = nano.use(db);
		}
	});
});
if (typeof table === 'undefined') {
	table = nano.db.create('vykraj');
}

http.createServer(function(req, res) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	
	var createResponse = function(msg) {
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
	}

	// Images
	if (url_parts.pathname == '/image'
			&& req.method.toLowerCase() == 'get') {
		res.writeHead(200);
		table.attachment.get(query.id, query.image, function(err, body) {
			if (!err) {
				res.end(body, 'binary');
			}
		});
	} else if (url_parts.pathname == '/upload' && req.method.toLowerCase() == 'post') {
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
				table.insert(dbTO, null, function(err, body) {
					if (!err) {
						console.log(body);
						fs.readFile(dbFile.path, function(err, data) {
						  if (!err) {
						    table.attachment.insert(body.id, dbFile.name, data, dbFile.type,
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
	} else {
		createResponse();
	}

}).listen(1337);
