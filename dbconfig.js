var pg = require('pg');
require('dotenv').config();


const pool = new pg.Pool({
    database:process.env.DATABASE,
    user:process.env.USER,
    host:process.env.HOST,
    port:process.env.DB_PORT,
    password:String(process.env.PASSWORD),
    max:10,
    connectionTimeoutMillis:50000,
})

module.exports = pool;