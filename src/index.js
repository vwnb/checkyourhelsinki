

"use strict"

import React, { PropTypes, cloneElement} from 'react';
import ReactDOM from 'react-dom';
import ReactHighcharts from 'react-highcharts';
import _ from 'underscore';

import getMuiTheme        from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider   from 'material-ui/styles/MuiThemeProvider';

import {Tabs, Tab} from 'material-ui/Tabs';
import injectTapEventPlugin from 'react-tap-event-plugin';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

import  {Component} from 'react';

import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';

import FontIcon from 'material-ui/FontIcon';
import NavigationExpandMoreIcon from 'material-ui/svg-icons/navigation/expand-more';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';

import {Card, CardActions, CardHeader, CardMedia, CardTitle, CardText} from 'material-ui/Card';


/*** MAIN CONTENT MODULES ***/

/* Paragraphs (type text) */

var TextModule = React.createClass({


  render: function() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Card>
            <CardHeader title={this.props.title} />
            <CardText >
                {this.props.data.map((p, index) => {
                return <p key={"p"+index} dangerouslySetInnerHTML={{__html: p}}></p>
                })}
            </CardText>
        </Card>
      </MuiThemeProvider >
    );
  }
});


/* Pics (deprecated) */

var PicModule = React.createClass({


  render: function() {
    return (
      <section className="module">
        <h2>
          {this.props.title}
        </h2>
        {this.props.data.photos.map(function(pic) {
            return <img src={pic.photo_file_url} />
        })}
      </section>
    );
  }
});



/* Pie chart (generic, varying on props.data) */

var PieModule = React.createClass({

  config: {
    chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
    },
    tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    title:{text:''},
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                style: {
                    color: (ReactHighcharts.theme && ReactHighcharts.theme.contrastTextColor) || 'black'
                }
            }
        }
    },
    series:[{}]
  },
  renderPie: function(){
    let chart = this.refs.chart.getChart();
    chart.series[0].setData([]);
    chart.series[0].name = "Percentage";
    for(var service in this.props.data){
        chart.series[0].addPoint({
            name: service,
            y: parseInt(this.props.data[service])
        });
    }
  },
  componentDidMount() { this.renderPie(); },
  componentDidUpdate() { this.renderPie(); },
  render: function() {

    return (
        <MuiThemeProvider muiTheme={getMuiTheme()}>
            <Card>
                <CardHeader title={this.props.title} />
                <CardText>
                    <ReactHighcharts config={this.config} ref="chart"></ReactHighcharts>
                </CardText>
            </Card>
        </MuiThemeProvider >
    );

  }
});


/* Map with markers and filters */
export default class MapModule extends React.Component{

  constructor(props) {
    super(props);
    this.state = {value: 2, infowindow: null};
  }

  handleChange = (event, index, value) => this.setState({value});
  renderMap(id = null){
    var diz = this;
    this.map = new google.maps.Map(this.refs.map, {
        center: {lat:60.1804927,lng:24.9098811},
        zoom: 16,
    });
    var bounds = new google.maps.LatLngBounds();
    for(var service in this.props.data.markers){
        
        if(id && this.props.data.markers[service].service_ids.indexOf(id) == -1){
            continue;
        }
        
        var myLatlng = new google.maps.LatLng( this.props.data.markers[service].latitude, this.props.data.markers[service].longitude );
        
        var markerContentStr = '' + (typeof this.props.data.markers[service].name_en != "undefined" ? '<h5>'+this.props.data.markers[service].name_en+'</h5>' : '')
                             + (typeof this.props.data.markers[service].street_address_fi != "undefined" ? '<p>'+this.props.data.markers[service].street_address_fi+'</p>' : '')
                             + ( typeof this.props.data.markers[service].www_fi != "undefined" ? '<p><a href="' + this.props.data.markers[service].www_fi + '">Website in finnish</a></p>' : '' )
                             + ( typeof this.props.data.markers[service].www_en != "undefined" ? '<p><a href="' + this.props.data.markers[service].www_en + '">Website in english</a></p>' : '' )
                             + ( typeof this.props.data.markers[service].desc_fi != "undefined" ? '<p>In finnish:<br>' + this.props.data.markers[service].desc_fi + '</p>' : '' )
                             + ( typeof this.props.data.markers[service].desc_en != "undefined" ? '<p>In english:<br>' + this.props.data.markers[service].desc_en + '</p>' : '' );

        var marker = new google.maps.Marker({
            position: myLatlng,
            title:this.props.data.markers[service].name_en,
            html: markerContentStr
        });
        
        google.maps.event.addListener(marker, "click", function () {
            diz.state.infowindow.setContent(this.html);
            diz.state.infowindow.open(diz.map, this);
        });

        // To add the marker to the map, call setMap();
        marker.setMap(this.map);
        
        bounds.extend(marker.getPosition());
    }
    
    this.state.infowindow = new google.maps.InfoWindow({
        content: "loading..."
    })
    
    google.maps.event.addListenerOnce(diz.map, 'bounds_changed', function(event) {
        if (this.getZoom() > 17) {
            this.setZoom(17);
        }
    });
    this.map.fitBounds(bounds);
    if(id){
        setTimeout(function(){
            diz.refs.map.scrollIntoView(false);
        }, 300);
    }
    
  }
  
  componentDidMount() { this.renderMap(); }
  componentDidUpdate() { this.renderMap(); }
  
  render() {
    return (
        <MuiThemeProvider muiTheme={getMuiTheme()}>
            <Card>
                <CardHeader title={this.props.title} />
                {this.props.data.filters.map(function(list) {
                    return (
                        <CardText key={"filterGroup"+list[0].parent_id}>
                            <h5>{ this.props.data.filterTitles[list[0].parent_id] }</h5>
                            {
                                list.map(function(filter){
                                    return <FlatButton
                                        key={filter.id}
                                        label={filter.name_en}
                                        onTouchTap={this.renderMap.bind(this, filter.id)}
                                    />
                                }, this )
                            }
                        </CardText>
                    )
                }, this) }
                <div ref="map" style={{height:"400px"}}>I should be a map!</div>
            </Card>
        </MuiThemeProvider >
    );
  }
}

/*** /CONTENT MODULES END ***/



/*** SEARCH FORM ***/

var AddressForm = React.createClass({
  getInitialState: function() {
    return {address: ''};
  },
  handleAddressChange: function(e) {
    this.setState({address: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var address = this.state.address.trim();
    if (!address) {
      return;
    }
    this.props.onAddressSubmit({address: address});
    this.setState({address: ''});
  },
  render: function() {
    return (
        <MuiThemeProvider muiTheme={getMuiTheme()}>

            <Card style={{background:"#f9f9f9"}}>
                <CardText>
                <form onSubmit={this.handleSubmit} >
                    Type a street, area or location name to find out everything about it!
                    <TextField
                    className ="InputField"
                    type = "text"
                    floatingLabelText="For example: 'Kalasatama', '00210' or 'Ehrensvärdsvägen'"
                    value={this.state.address}
                    onChange={this.handleAddressChange}
                    rows = {2}
                    fullWidth={true}
                    /><br/>
                    { this.state.address=="" ? null : <RaisedButton type="submit" primary={true} label ="Find details" fullWidth={true} /> }
                </form>
                </CardText>
            </Card>

        </MuiThemeProvider >
    );
  }
});


/*** TABS CONTAINER ***/

var ModuleWrap = React.createClass({
  handleAddressSubmit: function(data) {
    this.setState({
      loading: true,
      data: [],
      error: null
    });
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      type: 'GET',
      data: data,
      success: function(data) {
        this.setState({
            loading: false,
            data: _.toArray(_.groupBy(data, 'category'))
        });
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({
          loading: false,
          data: [],
          error: "No matching address found. A more specific search probably helps."
        });
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: [], loading: false, error: null};
  },
  handleChange : function(value){
      this.setState({
        selectedValue: value,
      });
  },
  render: function() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
      <Card className="moduleBox" style={{boxShadow:"none"}}>
        <AddressForm onAddressSubmit={this.handleAddressSubmit} />
        { this.state.loading ? <CardText style={{textAlign: "center"}}><img src="gps.gif"></img></CardText> : null }
        { this.state.data.length ?
            <Tabs value={this.state.selectedValue} onChange={this.handleChange} id="results">
            {this.state.data.map((list, index) => {
                return  <Tab
                            key={"t"+index}
                            label={list[0].category}
                            value={index}>
                            <ModuleList data={list} />
                        </Tab>;
            })}
            </Tabs> :
            null
        }
        { this.state.error ? <CardText>{this.state.error}</CardText> : null }
      </Card>
      </MuiThemeProvider>
    );
  }
});


/* Contents of one tab */

var ModuleList = React.createClass({
  render: function() {
    var modules = this.props.data.map((module, index) => {
      switch(module.type){
        case "mess":
          return (
            <div>Placeholder</div>
          );
        case "text":
          return (
            <TextModule key={"m"+index} title={module.title} data={module.data} type={module.type}>
            </TextModule>
          );
        case "pie":
          return (
            <PieModule key={"m"+index} title={module.title} data={module.data} type={module.type}>
            </PieModule>
          );
        case "map":
          return (
            <MapModule key={"m"+index} title={module.title} data={module.data} type={module.type}>
            </MapModule>
          );
        case "pics":
          return (
            <PicModule key={"m"+index} title={module.title} data={module.data} type={module.type}>
            </PicModule>
          );
      }
    });
    return (
      <div className="moduleList">
        {modules}
      </div>
    );
  }
});



var Header = React.createClass({

  render: function() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Card>
         <CardMedia style={{position:"relative", height:"400px", overflow: "hidden"}} overlay={<CardTitle title="Everything about anyplace in Helsinki" subtitle="Services, stats and so on" />} >
            <div style={{position: "absolute", top:"0", height:"100%", backgroundSize: "cover", backgroundImage:"url(banner2.jpg)", backgroundPosition: "50% 70%", backgroundAttachment:"fixed"}}></div>
            <div style={{position: "absolute", top:"0", height:"100%", backgroundImage:"url(noise.png)", backgroundAttachment:"fixed"}}></div>
         </CardMedia>
        </Card>
      </MuiThemeProvider>
    );
  }
});

var Footer = React.createClass({
    state : { open: false },
    getInitialState: function() {
    return {open: false};
    },
    handleOpen: function(e) {
    this.setState({open: true});
    },
    handleClose: function(e) {
    this.setState({open: false});
    },
    render: function() {
        const actions = [
            <FlatButton
                label="Close"
                primary={true}
                onTouchTap={this.handleClose}
            />
        ];
        return (
            <MuiThemeProvider muiTheme={getMuiTheme()}>
            <Card style={{background:"#f9f9f9"}}>
                <CardText style={{fontSize:"smaller", textAlign:"right"}}><FlatButton style={{color: "#aaa"}} onTouchTap={this.handleOpen} label="Acknowledgements"></FlatButton></CardText>
                <Dialog
                    title="Acknowledgements"
                    actions={actions}
                    modal={false}
                    open={this.state.open}
                    onRequestClose={this.handleClose}
                    >
                    Data is courtesy of City of Helsinki and Google.<br />
                    Production contributors: Ville Kemppainen, Murad Tanmoy, Zohaib Malik
                </Dialog>
            </Card>
            </MuiThemeProvider>
        );
    }
});







ReactDOM.render(
  <Header />,
  document.getElementById('header')
);

ReactDOM.render(
  <ModuleWrap url="/api" />,
  document.getElementById('content')
);

ReactDOM.render(
  <Footer />,
  document.getElementById('footer')
);



