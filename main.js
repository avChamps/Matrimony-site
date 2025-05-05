// server.js
const express = require('express');
const bodyParser = require('body-parser');
const profileRoutes = require('./API/profiles');
const login = require('./API/auth');
const intrests = require('./API/intrests')
const cors = require('cors');
const HOST = 'localhost';

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/api', profileRoutes);
app.use('/api',login)
app.use('/api',intrests)

app.listen(3000, HOST, () => {
    console.log(`Server running at http://${HOST}:${3000}/`);
  });
