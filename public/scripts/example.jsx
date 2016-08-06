var List = React.createClass({
	getInitialState: function() {
	    return {data: []};
	},
	componentDidMount: function() {
		this.load();
	},
	load: function(view, startkey, endkey) {
	  var url = this.props.url;
	  if (view) {
	  	url += "?view=" + view + "&startkey=" + startkey + "&endkey=" + endkey;
	  }
	
	  $.ajax({
		  url: url,
		  dataType: 'json',
		  cache: false,
		  success: function(data) {
			  this.setState({data: data});
		  }.bind(this),
		  error: function(xhr, status, err) {
			  console.error(this.props.url, status, err.toString());
		  }.bind(this)
	  });
	},
	handleNazevQueryChange : function(e) {
		console.log("handleNazevQueryChange");
		this.load("byNazev", e.target.value, e.target.value);
		$(".tagy-query")[0].value = "";
	},
	handleDatumOdQueryChange : function(e) {
		console.log("handleDatumOdQueryChange");
	},
	handleDatumDoQueryChange : function(e) {
		console.log("handleDatumDoQueryChange");
	},
	handleTagyQueryChange : function(e) {
		console.log("handleTagyQueryChange");
		this.load("byTag", e.target.value, e.target.value);
		$(".nazev-query")[0].value = "";
	},
	onImgDetail : function(e) {
		$("#shadow")[0].style.display = "block";
		var img = $("#img-detail")[0];
		img.style.display = "block";
		img.src = e.target.src;
	},
	render: function() {
		  var items = this.state.data.map(function(item) {
			  var image;
			  var imagePath = "image?id=" + item.id + "&image=" + item.foto;
			  if (typeof imagePath !== "undefined") {
				  image = (<img onClick={this.onImgDetail} className="foto" src={imagePath}/>);
			  }
			  return (
			        <tr key={item.id} id={item.id}>
			        	<td>{image}</td>
				        <td>{item.jmeno}</td>
						<td>{item.datum}</td>
						<td>{item.popis}</td>
						<td>{item.tagy}</td>	
			        </tr>
				);
		  }.bind(this));
		  return (
				<div className="main-div">
				   <div className="list-div">
						<table className="list-table" cellSpacing="0" cellPadding="0">
						  	<tbody>
							  	<tr>
							  		<th></th>
									<th>Název</th>
									<th>Datum</th>
									<th>Popis</th>
									<th>Štítky</th>
								</tr>
								<tr className="query-tr">
						        	<td></td>
							        <td><input className="nazev-query" type="text" placeholder="Vyhledat dle názvu" onChange={this.handleNazevQueryChange} /></td>
									<td className="query-datum-td"><div>
										<input className="datum-od-query" type="text" placeholder="Datum od" onChange={this.handleDatumOdQueryChange} />&nbsp;-&nbsp; 
										<input className="datum-do-query" type="text" placeholder="Datum do" onChange={this.handleDatumDoQueryChange} />
									</div></td>
									<td className="popis-query-td"></td>
									<td><input className="tagy-query" type="text" placeholder="Vyhledat dle štítku" onChange={this.handleTagyQueryChange} /></td>	
						        </tr>
								{items}
							</tbody>
						</table>
					</div>
					<ItemsForm url={this.props.url} list={this}/>
				</div>
		  );
	  }
});

var ItemsForm = React.createClass({
	  getInitialState: function() {
	    return {nazev: '', popis: '', tagy: '', file: ''};
	  },
	  handleNazevChange: function(e) {
	    this.setState({nazev: e.target.value});
	  },
	  handlePopisChange: function(e) {
	    this.setState({popis: e.target.value});
	  },
	  handleTagyChange: function(e) {
	    this.setState({tagy: e.target.value});
	  },
	  handleFileChange: function(e) {
	    const reader = new FileReader();
	    const file = e.target.files[0];

	    reader.onload = (upload) => {
	      this.setState({
	        data_uri: upload.target.result,
	        filename: file.name,
	        filetype: file.type,
	        filesize: file.size
	      });
	      console.log("file.name: " + file.name);
	      console.log("file.type: " + file.type);
	      console.log("file.size: " + file.size);
	    };

	    // https://developer.mozilla.org/en-US/docs/Web/API/FileReader
	    reader.readAsDataURL(file); // base64 s prefixem
	    
	  },
	  handleSubmit: function(e) {
  	    e.preventDefault();
	    
	    var nazev = this.state.nazev.trim();
	    var popis = this.state.popis.trim();
	    var tagy = this.state.tagy.trim();
	    if (!nazev) {
	      return;
	    }
	    
	    var data = new FormData();
        data.append('nazev', nazev);
        data.append('popis', popis);
        data.append('tagy', tagy);
        data.append('filename', this.state.filename);
        data.append('filetype', this.state.filetype);
        data.append('filesize', this.state.filesize);
        data.append('file', this.state.data_uri.split(",", 2)[1]);

	    this.setState({nazev: '', popis: '', tagy: '', data_uri: '', filename: '', filetype: '', filesize : 0});
	    
	    $.ajax({
	        url: this.props.url,
	        type: 'POST',
	        data: data,
	        // zabrání problému s "payload too large"
	        processData: false,
	        cache: false,
	        contentType: false,
	        success: function(data) {
	        	this.setState({data: data});
	        	this.props.list.load();
	        	console.log("submit done");
	        }.bind(this),
	        error: function(xhr, status, err) {
	        	console.error(this.props.url, status, err.toString());
	        }.bind(this)
	      });
	    
	  },
	  render: function() {
		  let uploaded;
		  if (this.state.data_uri) {
		      uploaded = (
		        <img className='image-preview' src={this.state.data_uri} />
		      );
		    }
		var even = true;
	    return (
		    <div className="form-div">
		      <form ref="upload-form" className="items-form" encType="multipart/form-data" onSubmit={this.handleSubmit}>	      	
		        <input
		          type="text"
		          placeholder="Název"
		          value={this.state.nazev}
		          onChange={this.handleNazevChange}
		        />
		        <input
		          type="text"
		          placeholder="Štítky"
		          value={this.state.tagy}
		          onChange={this.handleTagyChange}
		        />
		        <textarea
		          rows="5" cols="50" 
		          placeholder="Popis"
		          value={this.state.popis}
		          onChange={this.handlePopisChange}
		        />
		        <input id="foto" type="file" name="foto" className="upload-file" onChange={this.handleFileChange}/><br/>
		        <input type="submit" value="Uložit" />
		      </form>
		      <div className="preview">
		      	{uploaded}
	          </div>
		      <div className="foot-div"/>
		     </div>
	    );
	  }
	});

ReactDOM.render(
	<List url="/data" />,
	document.getElementById('content')
);
