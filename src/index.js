

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
            <ShitModule key={"m"+index} title={module.title} data={module.data} type={module.type}>
            </ShitModule>
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



/* Placeholder */

var ShitModule = React.createClass({


  render: function() {
      console.log(this.props.data);
    return (
      <section style={{display:"none"}} className="module">
        <h2>
          {this.props.title}
        </h2>
        {JSON.stringify(this.props.data)}
      </section>
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
      console.log("hey");
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
    console.log(this);
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
  renderMap(){
    this.map = new google.maps.Map(this.refs.map, {
        center: {lat:60.1804927,lng:24.9098811},
        zoom: 12
    });
    var bounds = new google.maps.LatLngBounds();
    for(var service in this.props.data){
        var myLatlng = new google.maps.LatLng( this.props.data[service].latitude, this.props.data[service].longitude );
        var marker = new google.maps.Marker({
            position: myLatlng,
            title:this.props.data[service].name_en
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



        <div ref="map" style={{height:"200px"}}>I should be a map!</div>

         </Card>
      </MuiThemeProvider >
    );
  }
};

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
             <CardHeader
               title="Murad Tanmoy"
               subtitle="Vanha Mantie"
               avatar="murad.jpg"
             />
         <CardMedia overlay={<CardTitle title="Check the latest information on your local area" subtitle="StreetCheck has information across Helsinki " />} >
            <div style={{height:"500px", background:"grey"}}></div>
         </CardMedia>
        </Card><br/>
        <Card>
            
        <CardText>
        <form onSubmit={this.handleSubmit}>
            <TextField
            className ="InputField"
            type = "text"
            hintText="Buleverdi 30"
            floatingLabelText="Address You want to check"
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
    console.log(this.props);
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      type: 'GET',
      data: data,
      success: function(data) {
        this.setState({ data: _.toArray(_.groupBy(data, 'category')) });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: []};
  },
  handleChange : function(value){
      console.log("hei");
      this.setState({
        selectedValue: value,
      });
  },
  render: function() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
      <div className="moduleBox">
        <AddressForm onAddressSubmit={this.handleAddressSubmit}  />
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
      </div>
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
                        iconElementRight={<RaisedButton label="Sign up"
                        onTouchTap={this.handleOpen}

                         />}

                      />
                  <Dialog
                       title="Dialog With Actions"
                       actions={actions}
                       modal={false}
                       open={this.state.open}
                       onRequestClose={this.handleClose}
                     >
                       The actions in this window were passed in as an array of React objects.
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



