const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('🔧 Database Configuration:');
console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`Port: ${process.env.DB_PORT || '5432'}`);
console.log(`Database: ${process.env.DB_NAME || 'farm_to_consumer'}`);
console.log(`Username: ${process.env.DB_USER || process.env.USER || 'apple'}`);

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'farm_to_consumer',
  username: process.env.DB_USER || process.env.USER || 'apple',
  password: process.env.DB_PASSWORD || '',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

console.log('✅ Sequelize instance created successfully');

// Create wrapper functions to avoid circular references
const authenticateFn = () => sequelize.authenticate();
const syncFn = (options) => sequelize.sync(options);
const closeFn = () => sequelize.close();

// Create a wrapper object instead of adding properties to sequelize
const db = Object.create(Object.getPrototypeOf(sequelize));
Object.assign(db, sequelize);
db.sequelize = sequelize;
db.authenticate = authenticateFn;
db.sync = syncFn;
db.close = closeFn;

module.exports = db;
