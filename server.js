var formidable = require('formidable');
var bodyParser = require('body-parser');
var util = require('util');
var nano = require('nano')('http://localhost:5984');
var path = require('path');
var uuid = require('node-uuid');
var url = require('url');
var fs = require('fs');
var express = require('express');
var dateFormat = require('dateformat');

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
app.use(bodyParser.urlencoded({
	extended : true
}));

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
});

// Data
app.get("/data", function(req, res) {
	console.log("Accessing: /data");
	var json = [];
	dao.list(function(err, body) {
		var count = body.rows.length;
		body.rows.forEach(function(row) {
			dao.get(row.id, {
				revs_info : true
			}, function(err, item) {
				if (!err) {
					var jsonItem = {
						id : row.id,
						jmeno : item.nazev,
						datum : dateFormat(new Date(item.datum), "d.mm.yyyy"),
						popis : item.popis,
						tagy : item.tagy,
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

	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files) {
		console.log("Parse");
		var doc = {
			datum : Date.now(),
			nazev : fields.nazev,
			tagy : fields.tagy,
			popis : fields.popis,
		};

		var buffer = new Buffer(fields.file, 'base64');
		var attach = {
			name : fields.filename,
			data : buffer,
			content_type : fields.filetype
		};

		dao.multipart.insert(doc, [ attach ], uuid.v1(), function(err) {
			if (err) {
				console.log('failed: ' + err);
			} else {
				console.log('succeeded');
				res.end();
			}
		});

	});

});

app.listen(3000);

console.log("Ready and listening...");
