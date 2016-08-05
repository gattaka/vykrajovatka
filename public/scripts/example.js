var List = React.createClass({
	getInitialState: function() {
	    return {data: []};
	},
	componentDidMount: function() {
	    $.ajax({
	      url: this.props.url,
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
	render: function() {
		  var items = this.state.data.map(function(item) {
			  var image;
			  var imagePath = "image?id=" + item.id + "&image=" + item.foto;
			  if (typeof imagePath !== "undefined") {
				  image = (<img className="foto" src={imagePath}/>);
			  }
			  return (
			        <tr key={item.id}>
				        <td>{item.jmeno}</td>
						<td>{item.datum}</td>
						<td>{item.popis}</td>
						<td>{item.tagy}</td>	
						<td>{image}</td>
			        </tr>
				);
		  });
		  return (
				  <div>
					  <div><table>
					  	<tbody>
						  	<tr>
								<th>Název</th>
								<th>Datum</th>
								<th>Popis</th>
								<th>Štítky</th>
							</tr>
							{items}
						</tbody>
					</table></div>
					<ItemsForm url={this.props.url} />
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
		  /*
	    var photo = document.getElementById("foto");
	    // the file is the first element in the files property
	    var file = photo.files[0];

	    console.log("File name: " + file.name);
	    console.log("File size: " + file.size);
	    console.log("File type: " + file.type);
	    this.setState({file: file});
*/
	    const reader = new FileReader();
	    const file = e.target.files[0];

	    reader.onload = (upload) => {
	      this.setState({
	        data_uri: upload.target.result,
	        filename: file.name,
	        filetype: file.type
	      });
	    };

	    reader.readAsDataURL(file);
	    
	  },
	  handleSubmit: function(e) {
  	    e.preventDefault();
	    
	    var nazev = this.state.nazev.trim();
	    var popis = this.state.popis.trim();
	    var tagy = this.state.tagy.trim();
	    if (!nazev || !popis) {
	      return;
	    }
	    var data = {
	    		nazev: nazev, 
	    		popis: popis, 
	    		tagy: tagy, 
	    		file: this.state.data_uri,
	    		filename: this.state.filename,
	    		filetype: this.state.filetype
	    		};
	    this.setState({nazev: '', popis: '', tagy: '', data_uri: '', filename: '', filetype: ''});
	    
	    $.ajax({
	        url: this.props.url,
	        dataType: 'json',
	        type: 'POST',
	        data: data,
	        success: function(data) {
	          this.setState({data: data});
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
		        <div>
		          <h4>Image uploaded!</h4>
		          <img className='image-preview' src={this.state.data_uri} />
		          <pre className='image-link-box'>{this.state.data_uri}</pre>
		        </div>
		      );
		    }
	    return (
	      <form ref="uploadForm" className="itemsForm" encType="multipart/form-data" onSubmit={this.handleSubmit}>
	        <input
	          type="text"
	          placeholder="Název"
	          value={this.state.nazev}
	          onChange={this.handleNazevChange}
	        /><br/>
	        <input
	          type="text"
	          placeholder="Štítky"
	          value={this.state.tagy}
	          onChange={this.handleTagyChange}
	        /><br/>
	        <textarea
	          rows="5" cols="50" 
	          placeholder="Popis"
	          value={this.state.popis}
	          onChange={this.handlePopisChange}
	        /><br/>
	        <input id="foto" type="file" name="foto" className="upload-file" onChange={this.handleFileChange}/><br/>
	        	{uploaded}
	        <input type="submit" value="Post" />
	      </form>
	    );
	  }
	});

ReactDOM.render(
	<List url="/data" />,
	document.getElementById('content')
);
