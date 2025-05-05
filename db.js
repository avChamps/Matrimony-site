// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'b80vvfgdi6efpgtfiznc-mysql.services.clever-cloud.com',
  user: 'uykl1sm13wtl0tsu',
  password: 'Yp6KGBD5CG8aaQL44cD0',
  database: 'b80vvfgdi6efpgtfiznc'
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err);
  } else {
    console.log('Connected to MySQL DB');
  }
});

module.exports = db;
