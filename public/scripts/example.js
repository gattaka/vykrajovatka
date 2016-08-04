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
	    return {nazev: '', popis: '', tagy: ''};
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
	  handleSubmit: function(e) {
  	    e.preventDefault();
	    
	    var fd = new FormData();    	
        fd.append('file', ReactDOM.findDOMNode().files[0]);
	    
	    var nazev = this.state.nazev.trim();
	    var popis = this.state.popis.trim();
	    var tagy = this.state.tagy.trim();
	    if (!nazev || !popis) {
	      return;
	    }
	    var data = {nazev: nazev, popis: popis, tagy: tagy, file:fd};
	    this.setState({nazev: '', popis: '', tagy: ''});
	    
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
	    return (
	      <form className="itemsForm" onSubmit={this.handleSubmit}>
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
	        <input ref="file" type="file" name="file" className="upload-file"/><br/>
	        <input type="submit" value="Post" />
	      </form>
	    );
	  }
	});

ReactDOM.render(
	<List url="/data" />,
	document.getElementById('content')
);
