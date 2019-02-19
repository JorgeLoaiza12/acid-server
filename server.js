'use strict';

import redis from 'redis';
import express from 'express';
import DarkSky from 'dark-sky';
import bodyParser from 'body-parser';
import { promisify } from 'es6-promisify';
import fetch from 'node-fetch';
const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_MAPS_KEY,
    Promise: Promise
});
const darksky = new DarkSky(process.env.DARKSKY_KEY);

const redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);

/**
 * Permite usar el redis.get como una promesa.
 */
const getAsync = promisify(redisClient.get.bind(redisClient));

/**
 * Funcion que busca el nombre del pais en un objeto en el cual uno de sus tipos contenga la palabra country.
 */
const findCountryName = (data) => {
    let filtered_array = data.address_components.filter((address_component) => {
        return address_component.types.includes("country");
    });
    const long_name = filtered_array.length ? filtered_array[0].long_name : "";
    const short_name = filtered_array.length ? filtered_array[0].short_name : "";
    return {
        short_name,
        long_name
    };
}

/**
 * Funcion encargada de hacer las peticiones a los distintos servicios
 */
const processRequest = async (req, res) => {
    try {
        if (!req.body.lat || !req.body.lng) {
            throw "Ha ocurrido un problema, vuelve a intentar mas tarde.";
        }

        const countryNameInfo = await googleMapsClient.reverseGeocode({ latlng: [req.body.lat, req.body.lng] }).asPromise();
        if (countryNameInfo.status != 200) {
            throw ("Ha ocurrido un error");
        }
        const countryName = findCountryName(countryNameInfo.json.results[0]);


        let countryRedis = await getAsync(countryName.long_name);
        if (countryRedis) {
            res.json({ status: 200, data: JSON.parse(countryRedis) });
        } else {
            let fetchCountryData = await fetch(`https://restcountries.eu/rest/v2/alpha/${countryName.short_name}`)
            let countryData = await (fetchCountryData).json();
            if (countryData.status === 400 || countryData.status === 503) {
                throw ("Ha ocurrido un error");
            }

            let countryWeather = await darksky
                .latitude(countryData.latlng[0])
                .longitude(countryData.latlng[1])
                .units('ca')
                .language('en')
                .exclude('hourly, flags, minutely, daily')
                .get();

            let result = {
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
}

// Constantes
const PORT = process.env.PORT;

// App
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/getInformation', processRequest);

app.listen(PORT, () => {
    console.log(`Running on port: ${PORT}`);
});
