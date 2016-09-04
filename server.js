var formidable = require('express-formidable');
var util = require('util');
var nano = require('nano')('http://localhost:5984');
var path = require('path');
var uuid = require('node-uuid');
var url = require('url');
var fs = require('fs');
var express = require('express');
var dateFormat = require('dateformat');

var app = express();

var PAGE_SIZE = 5;

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

app.use(formidable.parse({
	uploadDir : '/uploads/', // where you want to store uploaded files
	// (temporary)
	encoding : 'utf-8',
	keepExtensions : true, // if you want to store files with extensions
	multiples : true, // if you allow to upload multiple files
	maxFieldsSize : 10 * 1024 * 1024, // maximum file size
	maxFields : 1e3
// limit qty of possible files in single upload
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
	console.log("Accessing: " + req.url);

	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	var params = {
		limit : PAGE_SIZE,
		skip : query.page * PAGE_SIZE	
	};

	if (!query.view) {
		query.view = "byNazev";
	} else {
		if (query.startkey) {
			if (query.endkey) {
				params.startkey = query.startkey;
				params.endkey = query.endkey + "\ufff0";
			} else {
				params.key = query.startkey;
			}
		}
	}

	// dao.view("vykraj", "byNazev", { startkey : "H", endkey : "H\ufff0" },
	// function(select_err, select_body) {
	dao.view("vykraj", query.view, params, function(select_err, select_body) {
		if (!select_err) {
			var dups = {};
			var json = {
				items: [],
				totalRows: select_body.total_rows,
				pageSize: PAGE_SIZE 
			};
			select_body.rows.forEach(function(row) {
				var doc_id = row.id;
				var item = row.value;

				// TODO tohle by se mělo dělat na DB
				if (dups[row.id]) {
					return;
				} else {
					dups[row.id] = true;
				}

				var jsonItem = {
					id : item._id,
					rev : item._rev,
					attachments : item._attachments,
					jmeno : item.nazev,
					datum : dateFormat(new Date(item.datum), "d.m.yyyy"),
					popis : item.popis,
					tagy : item.tagy
				};

				if (typeof item._attachments !== 'undefined') {
					jsonItem.foto = Object.keys(item._attachments)[0];
				}
				json.items.push(jsonItem);
			});
			res.send(json);
		} else {
			console.log("Error during view: " + select_err);
		}
	});
});

// Images
app.get("/image", function(req, res) {
	console.log("Accessing: " + req.url);
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	dao.attachment.get(query.id, query.image, function(err, body) {
		if (!err) {
			res.end(body, 'binary');
		} else {
			res.status(404).send();
		}
	});
});

// Delete
app.get("/delete", function(req, res) {
	console.log("Deleting: " + req.url);
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	dao.destroy(query.id, query.rev, function(err, body) {
		if (!err) {
			console.log(body);
			res.end();
		}
	});
});

app.post("/data", function(req, res) {
	console.log("Posting: /data");

	var fields = req.body;

	var doc = {
		datum : Date.now(),
		nazev : fields.nazev,
		tagy : fields.tagy,
		popis : fields.popis,
	};

	if (fields.file) {
		var buffer = new Buffer(fields.file, 'base64');
		var attach = {
			name : fields.filename,
			data : buffer,
			content_type : fields.filetype
		};
	}

	var callback = function(err) {
		if (err) {
			console.log('failed: ' + err);
		} else {
			console.log('succeeded');
			res.end();
		}
	};

	if (fields.rev) {
		console.log("Update");
		// update
		doc._id = fields.id;
		doc._rev = fields.rev;
		doc._attachments = JSON.parse(fields.attachments);
		console.log("doc._id: " + doc._id);
		console.log("doc._rev: " + doc._rev);
		console.log("doc._attachments: " + fields.attachments);
		dao.insert(doc, callback);
		// pokud mám i změnu přílohy, pak update attachmentu
		if (attach) {
			console.log("With attachment");
			dao.attachment.insert(doc._id, attach.name, attach.buffer,
					attach.content_type, {
						rev : doc._rev
					}, function(err, body) {
						if (!err)
							console.log(body);
					});
		}
	} else {
		console.log("Create");
		dao.multipart.insert(doc, [ attach ], uuid.v1(), callback);
	}
});

app.listen(3000);

console.log("Ready and listening...");
