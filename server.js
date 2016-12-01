
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

const util = require('util');

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
    var expectedNum = 7; //can be dynamic or defined by hand

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
        
        if(!data.results.length){
            res.status(400);
            res.send('Address not found.');
            return false;
        }

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
            data: {markers: [{latitude:data.results[0].geometry.location.lat, longitude:data.results[0].geometry.location.lng}], filters: []}
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

        

        /* Absolutely crazy procedural thing that gets attractiveness data */
        request.post({
                url: "http://api.aluesarjat.fi/PXWeb/api/v1/fi/"
                        +encodeURI("Helsingin seudun tilastot") + "/"
                        +encodeURI("Pääkaupunkiseutu alueittain") + "/"
                        +encodeURI("Väestö") + "/"
                        +encodeURI("Väestonmuutokset") + "/"
                        +encodeURI("A01S_HKI_Muuttoliike.px"),
                json: {
                    // filter
                    query: [{
                            "code": "Vuosi",
                            "selection": {
                                "filter": "item",
                                "values": ["16"] //2016
                            }
                        },
                        {
                        "code": "Ikä",
                            "selection": {
                                "filter": "item",
                                "values": ["99V"] //all ages
                            }
                        }],
                    response: {
                        format: "json"
                    }
                }
            },
            function (error, response, postBody) {
                
                postBody = postBody.trim();
                var parsedBody = JSON.parse(postBody);
                
                if (!error && response.statusCode == 200 && postBody.length && typeof perusPiiri != "undefined") {
                    
                    var attractivenessDescr = "";
                    
                    /* API returns a flat array so group by key[0] which is the Peruspiiri ID */
                    var groupedByArea = _.groupBy(parsedBody.data, function(item){ return item.key[0] });
                    
                    /* Sort to get index, also print value of the attractiveness of Peruspiiri in question */
                    var sortedByRatio = _.sortBy(
                        groupedByArea,
                        function(collection){
                            
                            /*
                                BAD EXPLANATION FROM avoindata.fi

                                    1 Kuntaan muuttaneet   =  Alueelle kunnan ulkopuolelta muuttaneet
                                                              (ppl moved to area from outside Helsinki)
                                    2 Sisäinen tulomuutto  =  Alueelle kunnasta muuttaneet, mukaan lukien alueen sisäiset muutot
                                                              (ppl moved to area from inside Helsinki, INCLUDING PPL WHO USED TO LIVE THERE)
                                    3 Kunnasta muuttaneet  =  Alueelta kunnan ulkopuolelle muuttaneet
                                    4 Sisäinen lähtömuutto =  Alueelta kuntaan muuttaneet, mukaan lukien alueen sisäiset muutot
                                                              (ppl moved out to any area in Helsinki, INCLUDING PPL WHOSE NEW CRIB IS IN THE SAME AREA)
                                    5 Kokonaisnettomuutto  =  Alueen kaikkien tulo- ja lähtömuuttojen erotus
                                
                            */
                            
                            var movingDir1Obj  = _.filter(collection, function(item){ return item.key[1] == "1" }),
                                movingDir2Obj = _.filter(collection, function(item){ return item.key[1] == "2" }),
                                movingDir3Obj = _.filter(collection, function(item){ return item.key[1] == "3" }),
                                movingDir4Obj = _.filter(collection, function(item){ return item.key[1] == "4" });
                            
                            var pplMovedIn = parseInt(movingDir1Obj[0].values[0]) + parseInt(movingDir2Obj[0].values[0]),
                                pplMovedOut = parseInt(movingDir3Obj[0].values[0]) + parseInt(movingDir4Obj[0].values[0]);
                            
                            //Attractiveness = ratio of people moving in/out
                            var attractiveness = (pplMovedIn / pplMovedOut);
                            
                            //Print spaghettifully here
                            if(collection[0].key[0] == perusPiiri.properties.KOKOTUNNUS){
                                attractivenessDescr += "The in/out migration ratio of "
                                                    + toTitleCase(perusPiiri.properties.NIMI)
                                                    + " is " + (attractiveness * 100).toFixed(2) + "%.";
                            }
                            
                            //return value for _.sortBy to sort by
                            return attractiveness;
                        }
                    );
                    
                    // Plus one because it's a rank, not index
                    var attractivenessRank = _.findIndex(sortedByRatio.reverse(), function(collection){
                        return collection[0].key[0] == perusPiiri.properties.KOKOTUNNUS;
                    }) + 1;
                    
                    attractivenessDescr += " "+toTitleCase(perusPiiri.properties.NIMI) + " is the #" + attractivenessRank + "/" + _.size(groupedByArea) + " most attractive area in Helsinki.";
                    
                    descrArr.push(attractivenessDescr);
                    
                }
                
                var introModule = {
                    title: titleStr,
                    type: "text",
                    category: "Basic",
                    data: descrArr
                }
                addModule(introModule);

        });



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
                        
                        postBody = postBody.trim();
                        var parsedBody = JSON.parse(postBody);
                        
                        if (!error && response.statusCode == 200 && postBody.length) {
                            
                            //First object with code representing desired value such as age
                            var theLabels = _.where(parsedRootBody.variables, {code: value})[0];
                            
                            var responseData = {}
                            for(var row in parsedBody.data){
                                
                                var thisRowKey = parsedBody.data[row].key[1];
                                
                                //Don't need sum in pie
                                if(thisRowKey.toLowerCase() == "all"){ continue; }
                                
                                var ageGroupIdx = theLabels.values.indexOf(thisRowKey);
                                var label = theLabels.valueTexts[ageGroupIdx]
                                responseData[label] = parseInt(parsedBody.data[row].values[0]);
                            }
                            
                            var newDemographicsModule = {
                                title: title,
                                type: "pie",
                                category: "Demographic",
                                data: responseData
                            }
                            addModule( newDemographicsModule );
                            
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
        
        if(typeof perusPiiri != "undefined"){
                
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
                        +encodeURI('Väestonmuutokset')+'/'
                        +encodeURI('A01S_HKI_Muuttoliike.px'),
                "Attractiveness",
                [
                    { key: "Alue", value: [perusPiiri.properties.KOKOTUNNUS] },
                    { key: "Ikä", value: ["99V"] },
                    { key: "Muuttosuunta", value: ["1", "2", "3", "4"] },
                    { key: "Vuosi", value: ["16"] }
                ],
                "Muuttosuunta"
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
            
        }else{
            expectedNum = expectedNum - 4;
            tryResponse();
        }

        /* 3: SERVICES */
        request('http://www.hel.fi/palvelukarttaws/rest/v2/unit/?lat='+(data.results[0].geometry.location.lat).toFixed(5)+'&lon='+(data.results[0].geometry.location.lng).toFixed(5)+'&distance=500', function (error, response, body) {
            if (!error && response.statusCode == 200 && JSON.parse(body).length) {
                
                request('http://www.hel.fi/palvelukarttaws/rest/v2/service/', function (error, response, serviceListBody) {
                    if (!error && response.statusCode == 200 && JSON.parse(serviceListBody).length) {
                        
                        var parsedBody = JSON.parse(body);
                        var parsedServiceBody = JSON.parse(serviceListBody);
                        var relevantServices = [];
                        
                        for(var service in parsedBody){
                            for(idx in parsedBody[service].service_ids){
                                if(typeof _.find(relevantServices, function(item){ return item.id == parsedBody[service].service_ids[idx] }) == "undefined"){
                                    relevantServices.push(_.find(parsedServiceBody, function(item){ return item.id == parsedBody[service].service_ids[idx]}));
                                }
                            }
                        }
                        
                        var serviceModule = {
                            title: "Services in the area",
                            type: "map",
                            category: "Services",
                            data: {markers: parsedBody, filters: relevantServices }
                        }
                        addModule( serviceModule );

                    }else{
                        expectedNum = expectedNum - 1;
                        tryResponse();
                    }
                })

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
