var Modal = React.createClass({
  displayName: 'Modal',

  modal: function() {
    var style = {display: 'block'};
    return (
      <div
        tabIndex='-1'
        role='dialog'
        aria-hidden='false'
        ref='modal'
        style={style}
      >
      	<div className="shadow"></div>
        <div className='modal-dialog'>
          <div className='modal-content-wrapper'>
	          <div className='modal-content'>
	            {this.props.children}
	          </div>
	      </div>
        </div>
      </div>
    );
  },

  render: function() {
    return (
      <div>
        {this.modal()}
      </div>
    );
  }
});

var Confirm = React.createClass({
  displayName: 'Confirm',
  getDefaultProps: function() {
    return {
      confirmLabel: 'OK',
      abortLabel: 'Cancel'
    };
  },

  abort: function() {
    return this.promise.reject();
  },

  confirm: function() {
    return this.promise.resolve();
  },

  componentDidMount: function() {
    this.promise = new $.Deferred();
    return ReactDOM.findDOMNode(this.refs.confirm).focus();
  },

  render: function() {
    var modalBody;
    if (this.props.description) {
      modalBody = (
        <div className='modal-body'>
          {this.props.description}
        </div>
      );
    }

    return (
      <Modal>
        <div className='modal-header'>
          <h4 className='modal-title'>
            {this.props.message}
          </h4>
        </div>
        {modalBody}
        <div className='modal-footer'>
          <div className='text-right'>
            <button
              role='abort'
              type='button'
              className='btn btn-default'
              onClick={this.abort}
            >
              {this.props.abortLabel}
            </button>
            {' '}
            <button
              role='confirm'
              type='button'
              className='btn btn-primary'
              ref='confirm'
              onClick={this.confirm}
            >
              {this.props.confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
});
 
var confirm = function(message, options) {
  var cleanup, component, props, wrapper;
  if (options == null) {
    options = {};
  }
  props = $.extend({
    message: message
  }, options);
  wrapper = document.body.appendChild(document.createElement('div'));
  component = ReactDOM.render(<Confirm {...props}/>, wrapper);
  cleanup = function() {
    ReactDOM.unmountComponentAtNode(wrapper);
    return setTimeout(function() {
      return wrapper.remove();
    });
  };
  return component.promise.always(cleanup).promise();
};

var List = React.createClass({
	getInitialState: function() {
	    return {data: { items:[]}, page: 0, hasNext: true};
	},
	componentDidMount: function() {
		this.load();
	},
	load: function(view, startkey, endkey, page) {
	  console.log("1 page: " + page);	
	  var url = this.props.url;
	  if (page || page == 0) {
		  if (page <= 0) {
		  	page = 0;
		  }
		  this.setState({page: page});
	  } else {
	  	page = this.state.page;
	  }
	  
	  console.log("2 page: " + page);	
	  url += "?page=" + page;
	  
	  // Tohle je divné, this.state zápis se 
	  // projeví až časem, takže pokud z něj
	  // okamžitě načtu, není tam ta nová hodnota,
	  // ale je tam ještě ta stará, proto musím
	  // sice hodnotu do něj uložit, ale dál se 
	  // řídit dle aktuálního stavu
	  if (view) {
		this.setState({view : view})
		this.setState({startkey : startkey})
		this.setState({endkey : endkey})
	  } else {
	  	view = this.state.view;
	  	startkey = this.state.startkey;
	  	endkey = this.state.endkey;
	  }
	
	  if (view) {
	  	url += "&view=" + view + "&startkey=" + startkey + "&endkey=" + endkey;
	  }
	  
	  $.ajax({
		  url: url,
		  dataType: 'json',
		  cache: false,
		  success: function(data) {		
		  	  console.log("load success");	  	  
			  this.setState({data: data, view: view, startkey: startkey, endkey: endkey});
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
		$("#datum-od-query")[0].value = "";
		$("#datum-do-query")[0].value = "";
	},
	handleDatumQueryChange : function(e) {
		var odDatum = document.getElementById("datum-od-query").value;
		var doDatum = document.getElementById("datum-do-query").value;
		if (!odDatum) odDatum = doDatum;
		if (!doDatum) doDatum = odDatum;
		console.log("handleDatumQueryChange");
		this.load("byDatum", odDatum, doDatum);
		$(".tagy-query")[0].value = "";
		$(".nazev-query")[0].value = "";
	},
	handleTagyQueryChange : function(e) {
		console.log("handleTagyQueryChange");
		this.load("byTag", e.target.value, e.target.value);
		$(".nazev-query")[0].value = "";
		$("#datum-od-query")[0].value = "";
		$("#datum-do-query")[0].value = "";
	},
	onImgDetail : function(e) {
		$("#img-detail-wrapper")[0].style.display = "block";
		var img = $("#img-detail")[0];
		img.style.display = "block";
		img.src = e.target.src;
	},
	onEdit: function(item) {
		this.itemsForm.setState({
			nazev: item.jmeno,
		    popis: item.popis,
		    datum: item.datum,
		    tagy: item.tagy,
		    id: item.id,
		    rev: item.rev,
		    attachments: item.attachments
		});
		document.getElementById("image-preview").src = "image?id=" + item.id + "&image=" + item.foto;
		document.getElementById("foto-field").value = "";
		document.getElementById("cancel-button").style.display = "inline-block";
		document.getElementById("submit-button").value = "Upravit";
	},
	onDelete: function(item) {
	    var url = "delete?id=" + item.id + "&rev=" + item.rev;
	    console.log("onDelete: " + url);
        
        confirm("Opravdu smazat '" + item.jmeno + "'?", {
				confirmLabel: 'Ano',
				abortLabel: 'Ne'
			}).then((function(_this) {
			return function() {
			  $.ajax({
			        url: url,
			        type: 'GET',
			        cache: false,
			        contentType: false,
			        success: function(data) {
			        	this.load(this.state.view, this.state.startkey, this.state.endkey, this.state.page);
			        	console.log("delete done");
			        }.bind(_this),
			        error: function(xhr, status, err) {
			        	console.error(this.props.url, status, err.toString());
			        }.bind(_this)
			      });
			}})(this));
	    
	  },
	render: function() {
		  var items = this.state.data.items.map(function(item) {
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
						<td className="oper-td">
							<img className="img-button" src="imgs/pencil_16.png" onClick={() => this.onEdit(item)}/>&nbsp;&nbsp;
							<img className="img-button" src="imgs/delete_16.png" onClick={() => this.onDelete(item)}/>
						</td>	
			        </tr>
				);
		  }.bind(this));
		  var pages = [];
		  var first = 0;
		  var last = Math.ceil(this.state.data.totalRows / this.state.data.pageSize) - 1;
		  var min = this.state.page - 5;
		  var max = this.state.page + 5;
		  min = min < first ? first : min;
		  max = max > last ? last : max;
		  var self = this;
		  for (var p = min; p <= max; p++) {
		  	(function() {
		  		var q  = p;
		  		var fce = () => self.load(undefined,undefined,undefined,q);
	  			pages.push(<input key={"pageBtn"+q} className="page-button" type="button" onClick={fce} value={q+1} />);
		  	})();
		  } 
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
									<th></th>
								</tr>
								<tr className="query-tr">
						        	<td></td>
							        <td><input className="nazev-query" type="text" placeholder="Vyhledat dle názvu" onChange={this.handleNazevQueryChange} /></td>
									<td className="query-datum-td"><div>
										<input id="datum-od-query" type="text" placeholder="Datum od" onChange={this.handleDatumQueryChange} />&nbsp;-&nbsp; 
										<input id="datum-do-query" type="text" placeholder="Datum do" onChange={this.handleDatumQueryChange} />
									</div></td>
									<td className="popis-query-td"></td>
									<td><input className="tagy-query" type="text" placeholder="Vyhledat dle štítku" onChange={this.handleTagyQueryChange} /></td>
									<td></td>	
						        </tr>
								{items}
							</tbody>
						</table>
					</div>
					<div className="pager">
						<input className="page-button" type="button" onClick={() => this.load(undefined,undefined,undefined,first)} value="|<" />
						{pages}
						<input className="page-button" type="button" onClick={() => this.load(undefined,undefined,undefined,last)} value=">|" />
					</div> 
					<ItemsForm url={this.props.url} list={this}/>
				</div>
		  );
	  }
});

var ItemsForm = React.createClass({
	  getInitialState: function() {
	  	this.props.list.itemsForm = this; 
	    return this.getCleanState();
	  },
	  handleNazevChange: function(e) {
	    this.setState({nazev: e.target.value});
	  },
	  handlePopisChange: function(e) {
	    this.setState({popis: e.target.value});
	  },
	  handleDatumChange: function(e) {
	    this.setState({datum: e.target.value});
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
	  getCleanState: function() {
		  return {
		    	nazev: '', 
		    	popis: '', 
		    	tagy: '',
		    	datum: '',  
		    	data_uri: '', 
		    	filename: '', 
		    	filetype: '', 
		    	filesize : 0, 
		    	foto: '',
		    	id: '',
		    	rev: '',
		    	attachments: ''
		    };
	  },
	  handleSubmit: function(e) {
  	    e.preventDefault();
	    
	    var id = this.state.id;
	    var rev = this.state.rev;
	    var attachments = this.state.attachments;
	    
	    var nazev = this.state.nazev.trim();
	    var popis = this.state.popis.trim();
	    var datum = this.state.datum.trim();
	    var tagy =  this.state.tagy.trim();
	    if (!nazev || (!this.state.data_uri && !id) ) {
	      return;
	    }
	    
	    var data = new FormData();
        data.append('nazev', nazev);
        data.append('popis', popis);
        data.append('tagy', tagy);
        data.append('datum', datum);
        data.append('id', id);
        data.append('rev', rev);
        data.append('attachments', JSON.stringify(attachments));
        if (this.state.data_uri) {
	        data.append('filename', this.state.filename);
	        data.append('filetype', this.state.filetype);
	        data.append('filesize', this.state.filesize);
	        data.append('file', this.state.data_uri.split(",", 2)[1]);
		}
	    
	    $.ajax({
	        url: this.props.url,
	        type: 'POST',
	        data: data,
	        // zabrání problému s "payload too large"
	        processData: false,
	        cache: false,
	        contentType: false,
	        success: function(data) {
		    	this.onCancel();
	        	this.props.list.load();
	        	console.log("submit done");
	        }.bind(this),
	        error: function(xhr, status, err) {
	        	console.error(this.props.url, status, err.toString());
	        }.bind(this)
	      });
	    
	  },
	  onCancel: function() {
		this.setState(this.getCleanState());
		document.getElementById("image-preview").src = "";
		document.getElementById("cancel-button").style.display = "none";
		document.getElementById("submit-button").value = "Uložit";
		document.getElementById("foto-field").value = "";
	  },
	  render: function() {
		  let uploaded;
		      uploaded = (
		        <img id='image-preview' src={this.state.data_uri} />
		      );
		var even = true;
	    return (
		    <div className="form-div">
		      <div className="items-form-div">
			      <form ref="upload-form" className="items-form" encType="multipart/form-data" onSubmit={this.handleSubmit}>	
			        <input
			          id="nazev-field"
			          type="text"
			          placeholder="Název"
			          value={this.state.nazev}
			          onChange={this.handleNazevChange}
			        />
			        <input
			          id="datum-field"
			          type="text"
			          placeholder="Datum např. 2016-05-15"
			          value={this.state.datum}
			          onChange={this.handleDatumChange}
			        />
			        <input
			          id="tagy-field"
			          type="text"
			          placeholder="Štítky např. zvíře, malé"
			          value={this.state.tagy}
			          onChange={this.handleTagyChange}
			        />
			        <textarea
			          id="popis-field"
			          rows="5" cols="50" 
			          placeholder="Popis"
			          value={this.state.popis}
			          onChange={this.handlePopisChange}
			        />
			        <input id="foto-field" type="file" name="foto" className="upload-file" onChange={this.handleFileChange}/><br/>
			        <input id="cancel-button" type="button" value="Zahodit úpravy" onClick={() => this.onCancel()}/>
			        <input id="submit-button" type="submit" value="Uložit" />
			      </form>
			  </div>
		      <div className="preview">
		      	{uploaded}
	          </div></div>
	    );
	  }
	});

ReactDOM.render(
	<List url="/data" />,
	document.getElementById('content')
);
