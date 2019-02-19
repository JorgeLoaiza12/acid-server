'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _darkSky = require('dark-sky');

var _darkSky2 = _interopRequireDefault(_darkSky);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _es6Promisify = require('es6-promisify');

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('dotenv').load();

var googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_MAPS_KEY,
    Promise: Promise
});
var darksky = new _darkSky2.default(process.env.DARKSKY_KEY);

var redisClient = _redis2.default.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);

/**
 * Permite usar el redis.get como una promesa.
 */
var getAsync = (0, _es6Promisify.promisify)(redisClient.get.bind(redisClient));

/**
 * Funcion que busca el nombre del pais en un objeto en el cual uno de sus tipos contenga la palabra country.
 */
var findCountryName = function findCountryName(data) {
    var filtered_array = data.address_components.filter(function (address_component) {
        return address_component.types.includes("country");
    });
    var long_name = filtered_array.length ? filtered_array[0].long_name : "";
    var short_name = filtered_array.length ? filtered_array[0].short_name : "";
    return {
        short_name: short_name,
        long_name: long_name
    };
};

/**
 * Funcion encargada de hacer las peticiones a los distintos servicios
 */
var processRequest = async function processRequest(req, res) {
    try {
        if (!req.body.lat || !req.body.lng) {
            throw "Ha ocurrido un problema, vuelve a intentar mas tarde.";
        }

        var countryNameInfo = await googleMapsClient.reverseGeocode({ latlng: [req.body.lat, req.body.lng] }).asPromise();
        if (countryNameInfo.status != 200) {
            throw "Ha ocurrido un error";
        }
        var countryName = findCountryName(countryNameInfo.json.results[0]);

        var countryRedis = await getAsync(countryName.long_name);
        if (countryRedis) {
            res.json({ status: 200, data: JSON.parse(countryRedis) });
        } else {
            var fetchCountryData = await (0, _nodeFetch2.default)('https://restcountries.eu/rest/v2/alpha/' + countryName.short_name);
            var countryData = await fetchCountryData.json();
            if (countryData.status === 400 || countryData.status === 503) {
                throw "Ha ocurrido un error";
            }

            var countryWeather = await darksky.latitude(countryData.latlng[0]).longitude(countryData.latlng[1]).units('ca').language('en').exclude('hourly, flags, minutely, daily').get();

            var result = {
                name: countryData.name,
                capital: countryData.capital,
                region: countryData.region,
                subregion: countryData.subregion,
                population: countryData.population,
                languages: countryData.languages,
                flag: countryData.flag,
                timezone: countryWeather.timezone,
                weather: countryWeather.currently
            };
            redisClient.set(countryName.long_name, JSON.stringify(result), redisClient.print);
            res.json({ status: 200, data: result });
        }
    } catch (error) {
        res.json({ status: 503, error: error });
    }
};

// Constantes
var PORT = process.env.PORT;

// App
var app = (0, _express2.default)();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});

app.use(_bodyParser2.default.urlencoded({ extended: true }));
app.use(_bodyParser2.default.json());

app.post('/getInformation', processRequest);

app.listen(PORT, function () {
    console.log('Running on port: ' + PORT);
});