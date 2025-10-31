#!/usr/bin/env node

/**
 * Database Seeding Script
 * 
 * This script creates comprehensive dummy data for the farm-to-consumer application
 * including farmers, consumers, crops, orders, and subscriptions.
 * 
 * Usage: node seed-database.js
 */

require('dotenv').config();
const { sequelize } = require('./dist/config/database');
const seeder = require('./dist/seeders/dummy-data');

async function runSeeder() {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync database
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');
    
    // Run seeder
    await seeder.createDummyData();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('✅ Database connection closed');
  }
}

runSeeder();
