

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

// navbar

import  {Component} from 'react';
import AppBar from 'material-ui/AppBar';

import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';


import IconMenu from 'material-ui/IconMenu';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import NavigationExpandMoreIcon from 'material-ui/svg-icons/navigation/expand-more';
import MenuItem from 'material-ui/MenuItem';
import DropDownMenu from 'material-ui/DropDownMenu';
import RaisedButton from 'material-ui/RaisedButton';
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import TextField from 'material-ui/TextField';

import {Card, CardActions, CardHeader, CardMedia, CardTitle, CardText} from 'material-ui/Card';

// navbar





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




/* Paragraphs (type text) */

var TextModule = React.createClass({


  render: function() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
      <Card>

         <CardHeader
              title={this.props.title}
            />
       <CardText actAsExpander={true}  >
        {this.props.data.map((p, index) => {
        return <p key={"p"+index}>{p}</p>
        })}

  </CardText>
       </Card>
        </MuiThemeProvider >
    );
  }
});


/* Pics */

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
        console.log({
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
               <CardHeader
                    title={this.props.title}
                  />
            <CardText  >
        <ReactHighcharts config={this.config} ref="chart"></ReactHighcharts>
         </CardText>
            </Card>
 </MuiThemeProvider >
    );

  }
});


/* Map */
export default class MapModule extends React.Component{

  constructor(props) {
    super(props);
    this.state = {value: 2};
  }

  handleChange = (event, index, value) => this.setState({value});
  renderMap(id = null){
      
    this.map = new google.maps.Map(this.refs.map, {
        center: {lat:60.1804927,lng:24.9098811},
        zoom: 12
    });
    var bounds = new google.maps.LatLngBounds();
    for(var service in this.props.data.markers){
        
        if(id && this.props.data.markers[service].service_ids.indexOf(id) == -1){
            continue;
        }
        
        var myLatlng = new google.maps.LatLng( this.props.data.markers[service].latitude, this.props.data.markers[service].longitude );
        var marker = new google.maps.Marker({
            position: myLatlng,
            title:this.props.data.markers[service].name_en
        });

        // To add the marker to the map, call setMap();
        marker.setMap(this.map);
        bounds.extend(marker.getPosition());
    }

    this.map.fitBounds(bounds);
    
  }
  
  
  
  componentDidMount() { this.renderMap(); }
  componentDidUpdate() { this.renderMap(); }
  
  render() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
         <Card>
       <CardHeader
                     title={this.props.title}
                   />
        {this.props.data.filters.map(function(filter) {
            return <FlatButton
                    key={filter.id}
                    label={filter.name_en}
                    onTouchTap={this.renderMap.bind(this, filter.id)}
                />
        }, this)}

        <div ref="map" style={{height:"200px"}}>I should be a map!</div>

         </Card>
      </MuiThemeProvider >
    );
  }
}


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
        <div>
       
        <Card>
         <CardMedia overlay={<CardTitle title="Everything about anyplace in Helsinki" subtitle="Services, stats and so on" />} >
            <div style={{height:"370px", backgroundImage:"url(banner2.jpg)"}}></div>
         </CardMedia>
        </Card>
        <Card style={{background:"#f9f9f9"}}>
        <CardText>
        <form onSubmit={this.handleSubmit} >
            <TextField
            className ="InputField"
            type = "text"
            floatingLabelText="For example: 'Kalasatama', '00210' or 'Ehrensvärdsvägen'"
            value={this.state.address}
            onChange={this.handleAddressChange}
            rows = {2}
             fullWidth={true}
            /><br/>
            <RaisedButton type="submit" primary={true} label ="Find details" fullWidth={true} />
        </form>
        </CardText>
        </Card>
      </div>
        </MuiThemeProvider >
    );
  }
});



var ModuleWrap = React.createClass({
  handleAddressSubmit: function(data) {
    this.setState({
      loading: true,
    });
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      type: 'GET',
      data: data,
      success: function(data) {
        this.setState({
            loading: false,
        });
        this.setState({ data: _.toArray(_.groupBy(data, 'category')) });
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({
          loading: false,
        });
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: []};
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
        { this.state.loading ? <img src="gps.gif"> : null }
        <Tabs value={this.state.selectedValue} onChange={this.handleChange}>
        {this.state.data.map((list, index) => {
            return  <Tab
                        key={"t"+index}
                        label={list[0].category}
                        value={index}>
                        <ModuleList data={list} />
                    </Tab>;
        })}
        </Tabs>
        
      <CardText style={{fontSize:"smaller", textAlign:"right"}}>Data courtesy of City of Helsinki</CardText>
      </Card>
      </MuiThemeProvider>
    );
  }
});





var Form = React.createClass({
 state : {
    open: false,
  },
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
                label="Cancel"
                primary={true}
                onTouchTap={this.handleClose}
              />,
              <FlatButton
                label="Submit"
                primary={true}
                keyboardFocused={true}
                onTouchTap={this.handleClose}
              />,
            ];
    return (
       <MuiThemeProvider muiTheme={getMuiTheme()}>
               <div>
                      <AppBar
                        title="Check Your Helsinki"

                      />
                  <Dialog
                       title="Dialog With Actions"
                       actions={actions}
                       modal={false}
                       open={this.state.open}
                       onRequestClose={this.handleClose}
                     >
                       Sign up coming up!
                     </Dialog>

                    </div>
            </MuiThemeProvider>
    );
  }
});


ReactDOM.render(
  <Form  />,
  document.getElementById('nav')
);





ReactDOM.render(
  <ModuleWrap url="/api" />,
  document.getElementById('content')
);



