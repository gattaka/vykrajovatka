var formidable = require('formidable');
var http = require('http');
var util = require('util');
var nano = require('nano')('http://localhost:5984');
var url = require('url');


var table;
nano.db.list(function(err, body) {
	// body is an array
	body.forEach(function(db) {
		console.log(db);
		if (db === 'vykraj') {
			table = nano.use(db);
		}
	});
});
if (typeof table === 'undefined') {
	table = nano.db.create('vykraj');
}
console.log("Table: " + table);

http
		.createServer(
				function(req, res) {
					
					var url_parts = url.parse(req.url, true);
					var query = url_parts.query;
					
					console.log(query);

					// Images
					if (url_parts.pathname == '/image'
							&& req.method.toLowerCase() == 'get') {
						res.writeHead(200, {
							'Content-Type' : 'image/jpeg'
						});
						table.attachment.get(query.id, 'image.jpg', function(err,
								body) {
							if (!err) {
								res.end(body, 'binary');
							}
						});
					}

					// Form submit
					if (req.url == '/upload'
							&& req.method.toLowerCase() == 'post') {
						// parse a file upload
						var form = new formidable.IncomingForm();

						form.parse(req, function(err, fields, files) {
							res.writeHead(200, {
								'content-type' : 'text/plain'
							});
							res.write('received upload:\n\n');
							res.end(util.inspect({
								fields : fields,
								files : files
							}));
						});

						return;
					}

					// show a file upload form
					res.writeHead(200, {
						'content-type' : 'text/html'
					});
					var resp = '<form action="/upload" enctype="multipart/form-data" method="post">'
							+ '<input type="text" name="title"><br>'
							+ '<input type="file" name="upload" multiple="multiple"><br>'
							+ '<input type="submit" value="Upload">'
							+ '</form>';

					table.list(function(err, body) {
						console.log("listing");
						resp += "<div><table><tr>" + "<th>Název</th>"
								+ "<th>Datum</th>" + "<th>Popis</th>"
								+ "<th>Štítky</th>" + "</tr>";
						var count = body.rows.length;
						body.rows.forEach(function(row) {
							table.get(row.id, {
								revs_info : true
							}, function(err, item) {
								if (!err) {
									resp += "<tr>";
									resp += "<td>" + item.jmeno + "</td>";
									resp += "<td>" + item.datum + "</td>";
									resp += "<td>" + item.popis + "</td>";
									resp += "<td>" + item.tagy + "</td>";
									resp += "<td><img src='image?id=" + row.id
											+ "'/></td>";
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
				}).listen(1337);