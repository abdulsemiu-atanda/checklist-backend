require('@babel/register')
require('dotenv').config({path: ['.env', `.env.${process.env.NODE_ENV || 'development'}`]})

module.exports = {
  "development": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres"
  },
  "test": {
    "use_env_variable": "TEST_DATABASE_URL",
    "dialect": "postgres",
    "logging": false
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "logging": false
  }
}
