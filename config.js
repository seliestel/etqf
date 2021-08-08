require('dotenv').config()

const {Pool} = require('pg')
const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: (isProduction ? process.env.DATABASE_URL : process.env.DEV_DATABASE_URL),
  ssl: {
    rejectUnauthorized: false
  }
})

module.exports = {pool}