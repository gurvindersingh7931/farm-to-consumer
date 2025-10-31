const path = require('path');
require('dotenv').config();

module.exports = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'farm_to_consumer',
    username: process.env.DB_USER || process.env.USER || 'apple',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {}
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME_TEST || 'farm_to_consumer_test',
    username: process.env.DB_USER || process.env.USER || 'apple',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {}
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'farm_to_consumer',
    username: process.env.DB_USER || process.env.USER || 'apple',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
