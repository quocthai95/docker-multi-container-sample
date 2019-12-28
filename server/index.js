const keys = require('./keys');


// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json())

// Postgres client setup
const { Pool} = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
})

pgClient.on ('error', () => console.log('Lost PG Connection'));
// create table with name values and has one property: number type Int
pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)').catch(err => console.log(err)); 


// redis client setup
const redis = require('redis');
const redisClient  = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  try {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
  }
  catch (err) {
    res.send(error);
  }
})

app.get('/values/current', (req, res) => {
  try {
    redisClient.hgetall('values', (err, values) => {
      res.send(values);
    })
  } catch (error) {
    res.send(error);
  }
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if(parseInt(index) > 40) {
    return res.status(422).send('Index too high ye');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({working: true});
})

app.listen(5000, err => {
  console.log('Listening 5000 server');
})