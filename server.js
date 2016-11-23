
var path = require('path');
var webpack = require('webpack');
var express = require('express');
var config = require('./webpack.config');

var bodyParser = require('body-parser');
var geocoder = require('geocoder');
var request = require('request');
var tj = require('togeojson'),
    fs = require('fs'),
    jsdom = require('jsdom').jsdom;
var inside = require('point-in-polygon');
var xlsx = require('xlsx');

var _ = require('underscore');

var app = express();
var compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
  publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'src')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows this server to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});


/***** MAIN ENDPOINT (req = address, res = front modules as JSON) *****/

app.get('/api', function(req, res) {


    /* User input string that will be attempted to locate */
    var inputAddress = req.query.address;

    /* Number of different modules that should be requested */
    var expectedNum = 6; //can be dynamic or defined by hand

    /* Results of those requests go in this array */
    var modules = [];
    
    
    
    /* ABSTRACTED STUFF */

    /* Helper function that returns the request only after all modules are attempted, can be refactored elsewhere */
    function addModule(newModule){
        modules.push(newModule);
        tryResponse();
    }

    function tryResponse(){
        if(modules.length == expectedNum){
            /*** RESPONSE ***/
            res.send(modules);
        }
    }



    /* HELPER FUNCTIONS FOR WHATEVER NODE PACKAGES DONT DO */

    /* Helper for title case */
    function toTitleCase(str){
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    /* Helper to cherrypick object properties (from the Excel file mostly) */
    function pruneObject(everything, desired){
        var result = {};
        for(var key in everything){
            if(desired.indexOf(key) != -1){
                result[key] = everything[key];
            }
        }
        return result;
    }



    /* ROOT REQUEST: Get location */
    /* Documentation of the location object (variable name data): */
    /* https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingResponses */
    geocoder.geocode(inputAddress, function ( err, data ) {

        /* In addition to whatever Google knows, the coordinate pair must be mapped to a "Peruspiiri" */
        var perusPiiri;
        var perusPiiriKml = jsdom(fs.readFileSync('datasets/peruspiiri.kml', 'utf8')); //Peruspiiri boundary file
        var perusPiiriJson = tj.kml(perusPiiriKml);

        /* For each peruspiiri */
        for(var feature in perusPiiriJson.features){
            var polygon = perusPiiriJson.features[feature].geometry.coordinates[0];

            if( inside([data.results[0].geometry.location.lng, data.results[0].geometry.location.lat, 0], polygon) ){

                /* Peruspiiri object */
                perusPiiri = perusPiiriJson.features[feature];
                //console.log(perusPiiri);
                break; //comment this out if it turns out a location can have several matches

            }
        }


        /*** MODULE CALLS ***/
        // each different because the APIs are different
        /*
            AFTER PARSING:
                var moduleVariableName = {
                    title: "Module title for UI view",
                    type: "", //map, text, pics, pie
                    category: "", //Basic, Demographic, Services
                    data: { something : "freestyle JSON depending on type" }
                }
                addModule( moduleVariableName );
            
            FAILURE HANDLING:
                expectedNum = expectedNum - 1;
                tryResponse();
                
        */

        /* 1: INTRO */
        
        /* 1.1 INTRO MAP */
        var introMapModule = {
            title: "Location and surrounding area",
            type: "map",
            category: "Basic",
            data: [{latitude:data.results[0].geometry.location.lat, longitude:data.results[0].geometry.location.lng}]
        }
        addModule( introMapModule );
        
        /* 1.2 TEXT MODULE */
        var titleArr = [];
        for(var idx in data.results[0].address_components){
            var component = data.results[0].address_components[idx].long_name;
            if(titleArr.indexOf(component) == -1){
                titleArr.push(component);
            }
        }
        var titleStr = titleArr.join(" / ");
        var descrArr = [];
            descrArr.push(typeof perusPiiri != "undefined" ? titleStr + " is located in " + toTitleCase(perusPiiri.properties.NIMI) + "." : "Couldn't map "+titleStr+" to any Helsinki neighborhood. Maybe it's not in Helsinki?");

        var introModule = {
            title: titleStr,
            type: "text",
            category: "Basic",
            data: descrArr
        }
        addModule(introModule);



        /* 2: DEMOGRAPHICS */
        
        /* 2.1 AGE DEMOGRAPHICS */
        
                
        
        
        /*
            url = encoded POST url string,
            title = Title for module,
            filters = simplified JSON object, should be documented but refer to existing usage
            value = key of the value of interest
        */
        function makeDemographyPie(url, title, filters, value){

            request(url, function (error, response, body) {
                
                var parsedRootBody = JSON.parse(body);

                if (!error && response.statusCode == 200 && body.length) {
                    
                    var filterQuery = [];
                    for(var filter in filters){
                        filterQuery.push( {code: filters[filter].key, selection: {filter: "item", values: filters[filter].value} } );
                    }
                    
                    console.log(filterQuery);

                    request.post({
                        url: url,
                        json: {
                            query: filterQuery,
                            response: {
                                format: "json"
                            }
                        }
                    },
                    function (error, response, postBody) {
                        console.log(url);
                        postBody = postBody.trim();
                        var parsedBody = JSON.parse(postBody);
                        
                        if (!error && response.statusCode == 200 && postBody.length) {
                            
                            //First object with code representing desired value such as age
                            var theLabels = _.where(parsedRootBody.variables, {code: value})[0];
                            
                            var responseData = {}
                            for(var row in parsedBody.data){
                                
                                var thisRowKey = parsedBody.data[row].key[1];
                                
                                //Don't need sum in pie
                                if(thisRowKey == "all"){ continue; }
                                
                                var ageGroupIdx = theLabels.values.indexOf(thisRowKey);
                                var label = theLabels.valueTexts[ageGroupIdx]
                                responseData[label] = parseInt(parsedBody.data[row].values[0]);
                            }
                            
                            var ageDemographicsModule = {
                                title: title,
                                type: "pie",
                                category: "Demographic",
                                data: responseData
                            }
                            addModule( ageDemographicsModule );
                            
                        }else{
                            expectedNum--;
                            tryResponse();
                        }
                        
            
                    });
                    
                }else{
                    
                    expectedNum--;
                    tryResponse();
                }

            });
        }          


        makeDemographyPie(
            'http://api.aluesarjat.fi/PXWeb/api/v1/fi/'
                    +encodeURI('Helsingin seudun tilastot')+'/'
                    +encodeURI('Pääkaupunkiseutu alueittain')+'/'
                    +encodeURI('Väestö')+'/'
                    +encodeURI('Väestörakenne')+'/'
                    +encodeURI('A02S_HKI_Vakiluku1962.px'),
            "Age demographics",
            [
                { key: "Alue", value: [perusPiiri.properties.KOKOTUNNUS] },
                { key: "Vuosi", value: ["54"] }
            ],
            "Ikä"
        );

        makeDemographyPie(
            'http://api.aluesarjat.fi/PXWeb/api/v1/fi/'
                    +encodeURI('Helsingin seudun tilastot')+'/'
                    +encodeURI('Pääkaupunkiseutu alueittain')+'/'
                    +encodeURI('Väestö')+'/'
                    +encodeURI('Perheet')+'/'
                    +encodeURI('A01S_HKI_Perhetyypit.px'),
            "Family sizes",
            [
                { key: "Alue", value: [perusPiiri.properties.KOKOTUNNUS] },
                { key: "Vuosi", value: ["17"] }
            ],
            "Perhetyyppi"
        );
        
        makeDemographyPie(
            'http://api.aluesarjat.fi/PXWeb/api/v1/fi/'
                    +encodeURI('Helsingin seudun tilastot')+'/'
                    +encodeURI('Pääkaupunkiseutu alueittain')+'/'
                    +encodeURI('Väestö')+'/'
                    +encodeURI('Koulutustaso')+'/'
                    +encodeURI('A01S_HKI_Vaesto_koulutusaste.px'),
            "Education levels",
            [
                { key: "Alue", value: [perusPiiri.properties.KOKOTUNNUS] },
                { key: "Vuosi", value: ["16"] }
            ],
            "Koulutusaste"
        );
        

        /* 3: SERVICES */
        request('http://www.hel.fi/palvelukarttaws/rest/v2/unit/?lat='+(data.results[0].geometry.location.lat).toFixed(5)+'&lon='+(data.results[0].geometry.location.lng).toFixed(5)+'&distance=800', function (error, response, body) {
            if (!error && response.statusCode == 200 && JSON.parse(body).length) {
                
                var serviceModule = {
                    title: "Services in the area",
                    type: "map",
                    category: "Services",
                    data: JSON.parse(body)
                }
                addModule( serviceModule );

            }else{
                expectedNum = expectedNum - 1;
                tryResponse();
            }
        })


    });
});


app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
