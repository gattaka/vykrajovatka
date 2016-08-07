// String padding left code taken from
// http://www.lm-tech.it/Blog/post/2012/12/01/String-Padding-in-Javascript.aspx
String.prototype.padLeft = function(paddingChar, length) {
	var s = new String(this);
	if ((this.length < length) && (paddingChar.toString().length > 0)) {
		for (var i = 0; i < (length - this.length); i++) {
			s = paddingChar.toString().charAt(0).concat(s);
		}
	}

	return s;
};

var uploadChunk = function(request, response) {
	if (request.method === 'POST') {

		// Check Content-Type
		if (!(request.is('multipart/form-data'))) {
			response.status(415).send('Unsupported media type');
			return;
		}

		// Check that we have not exceeded the maximum chunk upload size
		var maxuploadsize = 51 * 1024 * 1024;

		if (request.headers['content-length'] > maxuploadsize) {

			response.status(413).send('Maximum upload chunk size exceeded');
			return;
		}

		// Get the extension from the file name
		var extension = path.extname(request.param('filename'));

		// Get the base file name
		var baseFilename = path.basename(request.param('filename'), extension);

		// Create the temporary file name for the chunk
		var tempfilename = baseFilename + '.'
				+ request.param('chunkNumber').toString().padLeft('0', 16)
				+ extension + ".tmp";

		// Create the temporary directory to store the file chunk
		// The temporary directory will be based on the file name
		var tempdir = uploadpath + request.param('directoryname') + '/'
				+ baseFilename;

		// The path to save the file chunk
		var localfilepath = tempdir + '/' + tempfilename;

		if (fs.ensureDirSync(tempdir)) {
			console.log('Created directory ' + tempdir);
		}

		// Check if we have uploaded a hand crafted multipart/form-data request
		// If we have done so then the data is sent as a base64 string
		// and we need to extract the base64 string and save it
		if (request.headers['celerft-encoded'] === 'base64') {

			var fileSlice = new Buffer(+request.headers['content-length']);
			var bufferOffset = 0;

			// Get the data from the request
			request.on('data', function(chunk) {
				chunk.copy(fileSlice, bufferOffset);
				bufferOffset += chunk.length;

			}).on('end', function() {

				// Convert the data from base64 string to binary
				// base64 data in 4th index of the array
				var base64data = fileSlice.toString().split('\r\n');
				var fileData = new Buffer(base64data[4].toString(), 'base64');

				fs.outputFileSync(localfilepath, fileData);
				console.log('Saved file to ' + localfilepath);

				// Send back a sucessful response with the file name
				response.status(200).send(localfilepath);
				response.end();

			});

		} else {

			// The data is uploaded as binary data.
			// We will use formidable to extract the data and save it
			var form = new formidable.IncomingForm();
			form.keepExtensions = true;
			form.uploadDir = tempdir;

			// Parse the form and save the file chunks to the
			// default location
			form.parse(request, function(err, fields, files) {

				if (err) {
					response.status(500).send(err);
					return;
				}

				// console.log({ fields: fields, files: files });
			});

			// Use the filebegin event to save the file with the naming
			// convention
			/*
			 * form.on('fileBegin', function (name, file) { file.path =
			 * localfilepath; });
			 */

			form.on('error', function(err) {
				if (err) {
					response.status(500).send(err);
					return;
				}
			});

			// After the files have been saved to the temporary name
			// move them to the to teh correct file name
			form.on('end', function(fields, files) {

				// Temporary location of our uploaded file
				var temp_path = this.openedFiles[0].path;

				fs.move(temp_path, localfilepath, function(err) {

					if (err) {
						response.status(500).send(err);
						return;
					} else {
						// Send back a sucessful response with the file name
						response.status(200).send(localfilepath);
						response.end();
					}

				});

			});

			// Send back a sucessful response with the file name
			// response.status(200).send(localfilepath);
			// response.end();
		}
	}
};

// Request to merge all of the file chunks into one file
var merge = function(request, response) {

	if (request.method === 'GET') {

		// Get the extension from the file name
		var extension = path.extname(request.param('filename'));

		// Get the base file name
		var baseFilename = path.basename(request.param('filename'), extension);

		var localFilePath = uploadpath + request.param('directoryname') + '/'
				+ baseFilename;

		// Check if all of the file chunks have be uploaded
		// Note we only wnat the files with a *.tmp extension
		var files = getfilesWithExtensionName(localFilePath, 'tmp')

		/*
		 * if (err) { response.status(500).send(err); return; }
		 */

		if (files.length != request.param('numberOfChunks')) {

			response.status(400).send(
					'Number of file chunks less than total count');
			return;
		}

		var filename = localFilePath + '/' + baseFilename + extension;
		var outputFile = fs.createWriteStream(filename);

		// Done writing the file
		// Move it to top level directory
		// and create MD5 hash
		outputFile.on('finish', function() {
			console.log('file has been written');

			// New name for the file
			var newfilename = uploadpath + request.param('directoryname') + '/'
					+ baseFilename + extension;

			// Check if file exists at top level if it does delete it
			// if (fs.ensureFileSync(newfilename)) {
			fs.removeSync(newfilename);
			// }

			// Move the file
			fs.move(filename, newfilename, function(err) {
				if (err) {
					response.status(500).send(err);
					return;
				} else {

					// Delete the temporary directory
					fs.removeSync(localFilePath);
					var hash = crypto.createHash('md5'), hashstream = fs
							.createReadStream(newfilename);

					hashstream.on('data', function(data) {
						hash.update(data)
					});

					hashstream.on('end', function() {

						var md5results = hash.digest('hex');

						// Send back a sucessful response with the file name
						response.status(200).send(
								'Sucessfully merged file ' + filename + ", "
										+ md5results.toUpperCase());
						response.end();
					});
				}
			});

		});

		// Loop through the file chunks and write them to the file
		// files[index] retunrs the name of the file.
		// we need to add put in the full path to the file
		for ( var index in files) {

			console.log(files[index]);
			var data = fs.readFileSync(localFilePath + '/' + files[index]);
			outputFile.write(data);
			fs.removeSync(localFilePath + '/' + files[index]);
		}

		outputFile.end();

	}
};