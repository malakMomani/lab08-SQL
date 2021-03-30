
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const { query, response } = require('express');


const PORT = process.env.PORT;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;


const app = express();
app.use(cors());

const client = new pg.Client(DATABASE_URL);

app.get('/', (req, res) => {
  res.status(200).send('All Good');
});

app.get('/location', (req, res) => {
  const city = req.query.city;
  const queryParam = {
    key: GEOCODE_API_KEY,
    q: city,
    format: 'json'
  }
  const url = `https://us1.locationiq.com/v1/search.php`;
  const sqlQuery = `SELECT search_query FROM locations`;
  const dbLocations = client.query(sqlQuery);
  const apiLocation = {};

  superagent.get(url).query(queryParam).then((resData) => {
    apiLocation = new Location(city, resData.body[0]);
  });

  if (dbLocations.includes(city)) {
    res.status(200).send(apiLocation);

  } else {
    const safeValue = [apiLocation.search_query, apiLocation.formatted_query, apiLocation.latitude, apiLocation.longitude];
    const sqlInsertRow = `INSERT INTO locations(search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)`;

    client.query(sqlInsertRow , safeValue).then(result =>{
      res.status(200).json(result);
    });
  }
});

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.display_name;
  this.latitude = geoData.lat;
  this.longitude = geoData.lon;
}


app.use('*', (req, res) => {
  res.status(404).send('Something went wrong!!');
});

client.connect().then(() => {
  app.listen(PORT, () => {
    console.log('Connected to database', client.connectionParameters.database);
    console.log('Listening to port ', PORT);
  });
});
