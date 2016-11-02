

"use strict"

const React = require('react');
const ReactDOM = require('react-dom');
const ReactHighcharts = require('react-highcharts');
const _ = require('underscore');

var ModuleList = React.createClass({
  render: function() {
    var modules = this.props.data.map(function(module) {
      switch(module.type){
        case "mess":
          return (
            <ShitModule title={module.title} data={module.data} type={module.type}>
            </ShitModule>
          );
        case "text":
          return (
            <TextModule title={module.title} data={module.data} type={module.type}>
            </TextModule>
          );
        case "pie":
          return (
            <PieModule title={module.title} data={module.data} type={module.type}>
            </PieModule>
          );
        case "map":
          return (
            <MapModule title={module.title} data={module.data} type={module.type}>
            </MapModule>
          );
        case "pics":
          return (
            <PicModule title={module.title} data={module.data} type={module.type}>
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
  rawMarkup: function() {
    var md = new Remarkable();
    var rawMarkup = md.render(this.props.children.toString());
    return { __html: rawMarkup };
  },

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
  rawMarkup: function() {
    var md = new Remarkable();
    var rawMarkup = md.render(this.props.children.toString());
    return { __html: rawMarkup };
  },

  render: function() {
      console.log(this.props.data);
    return (
      <section className="module">
        <h2>
          {this.props.title}
        </h2>
        {this.props.data.map(function(p) {
        return <p>{p}</p>
        })}
      </section>
    );
  }
});


/* Pics */

var PicModule = React.createClass({
  rawMarkup: function() {
    var md = new Remarkable();
    var rawMarkup = md.render(this.props.children.toString());
    return { __html: rawMarkup };
  },

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
  rawMarkup: function() {
    var md = new Remarkable();
    var rawMarkup = md.render(this.props.children.toString());
    return { __html: rawMarkup };
  },
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
            y: this.props.data[service]
        });
    }
  },
  componentDidMount() { this.renderPie(); },
  componentDidUpdate() { this.renderPie(); },
  render: function() {

    return (
      <section className="module">
        <h2>
          {this.props.title}
        </h2>
        <ReactHighcharts config={this.config} ref="chart"></ReactHighcharts>
      </section>
    );

  }
});


/* Map */

var MapModule = React.createClass({
  rawMarkup: function() {
    var md = new Remarkable();
    var rawMarkup = md.render(this.props.children.toString());
    return { __html: rawMarkup };
  },
  renderMap: function(){
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
  },
  componentDidMount() { this.renderMap(); },
  componentDidUpdate() { this.renderMap(); },
  render: function() {
    return (
      <section className="module">
        <h2>
          {this.props.title}
        </h2>
        <div ref="map" style={{height:"500px"}}>I should be a map!</div>
      </section>
    );
  }
});

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
      <section className="addressForm">
        <form onSubmit={this.handleSubmit}>
            <input
            type="text"
            placeholder="Address search"
            value={this.state.address}
            onChange={this.handleAddressChange}
            />
            <input type="submit" value="Find details" />
        </form>
      </section>
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
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: []};
  },
  render: function() {
    return (
      <div className="moduleBox">
        <AddressForm onAddressSubmit={this.handleAddressSubmit}  />
        <ModuleList data={this.state.data} />
      </div>
    );
  }
});



ReactDOM.render(
  <ModuleWrap url="/api" />,
  document.getElementById('content')
);
