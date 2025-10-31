#!/usr/bin/env node

/**
 * Add Extra Crops Seeder
 * 
 * This script adds variety of crops to existing farmers
 * 
 * Usage: node add-extra-crops.js
 */

require('dotenv').config();
const { sequelize } = require('./dist/config/database');
const { User, Crop } = require('./dist/models');

async function addExtraCrops() {
  try {
    console.log('🌽 Adding extra crop varieties...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Get existing farmers
    const farmers = await User.findAll({ 
      where: { role: 'farmer' },
      limit: 5 
    });

    if (farmers.length === 0) {
      console.log('❌ No farmers found. Please create farmers first.');
      return;
    }

    console.log(`Found ${farmers.length} farmers`);

    const extraCrops = [
      // Vegetables
      {
        farmerId: farmers[0].id,
        name: 'Organic Cucumbers',
        description: 'Fresh, crisp organic cucumbers perfect for salads and pickling',
        pricePerKg: 55,
        quantity: 80,
        unit: 'kg',
        category: 'vegetables',
        harvestDate: '2024-10-06',
        expiryDate: '2024-10-30',
        location: 'Chandigarh, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: true
      },
      {
        farmerId: farmers[1].id,
        name: 'Sweet Carrots',
        description: 'Sweet and crunchy carrots, great for juicing',
        pricePerKg: 40,
        quantity: 120,
        unit: 'kg',
        category: 'vegetables',
        harvestDate: '2024-10-05',
        expiryDate: '2024-11-10',
        location: 'Ludhiana, Punjab',
        organic: false,
        isActive: true,
        isAvailable: true,
        isPremium: false
      },
      {
        farmerId: farmers[2].id,
        name: 'Premium Onions',
        description: 'Fresh onions, essential for daily cooking',
        pricePerKg: 30,
        quantity: 300,
        unit: 'kg',
        category: 'vegetables',
        harvestDate: '2024-10-04',
        expiryDate: '2024-12-31',
        location: 'Amritsar, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: true
      },
      {
        farmerId: farmers[3].id,
        name: 'Fresh Spinach',
        description: 'Dark leafy greens rich in iron and nutrients',
        pricePerKg: 80,
        quantity: 40,
        unit: 'kg',
        category: 'vegetables',
        harvestDate: '2024-10-07',
        expiryDate: '2024-10-20',
        location: 'Jalandhar, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: false
      },
      {
        farmerId: farmers[4].id,
        name: 'Broccoli Heads',
        description: 'Nutritious broccoli heads, perfect for healthy meals',
        pricePerKg: 90,
        quantity: 60,
        unit: 'kg',
        category: 'vegetables',
        harvestDate: '2024-10-08',
        expiryDate: '2024-10-28',
        location: 'Mohali, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: true
      },

      // Fruits
      {
        farmerId: farmers[0].id,
        name: 'Organic Bananas',
        description: 'Sweet and nutritious organic bananas, great for energy',
        pricePerKg: 70,
        quantity: 150,
        unit: 'kg',
        category: 'fruits',
        harvestDate: '2024-10-06',
        expiryDate: '2024-10-25',
        location: 'Chandigarh, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: true
      },
      {
        farmerId: farmers[1].id,
        name: 'Juicy Oranges',
        description: 'Fresh oranges rich in vitamin C',
        pricePerKg: 85,
        quantity: 90,
        unit: 'kg',
        category: 'fruits',
        harvestDate: '2024-10-05',
        expiryDate: '2024-11-15',
        location: 'Ludhiana, Punjab',
        organic: false,
        isActive: true,
        isAvailable: true,
        isPremium: false
      },
      {
        farmerId: farmers[2].id,
        name: 'Alphonso Mangoes',
        description: 'Sweet Alphonso mangoes, king of fruits',
        pricePerKg: 120,
        quantity: 50,
        unit: 'kg',
        category: 'fruits',
        harvestDate: '2024-09-30',
        expiryDate: '2024-10-30',
        location: 'Amritsar, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: true
      },

      // Grains
      {
        farmerId: farmers[0].id,
        name: 'Superfood Quinoa',
        description: 'Protein-rich superfood quinoa',
        pricePerKg: 300,
        quantity: 25,
        unit: 'kg',
        category: 'grains',
        harvestDate: '2024-10-03',
        expiryDate: '2024-12-31',
        location: 'Chandigarh, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: true
      },

      // Herbs
      {
        farmerId: farmers[3].id,
        name: 'Fresh Basil',
        description: 'Aromatic basil leaves perfect for Italian cuisine',
        pricePerKg: 300,
        quantity: 20,
        unit: 'kg',
        category: 'herbs',
        harvestDate: '2024-10-08',
        expiryDate: '2024-10-22',
        location: 'Jalandhar, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: false
      },
      {
        farmerId: farmers[3].id,
        name: 'Sacred Tulsi',
        description: 'Sacred tulsi leaves for tea and medicinal use',
        pricePerKg: 250,
        quantity: 15,
        unit: 'kg',
        category: 'herbs',
        harvestDate: '2024-10-09',
        expiryDate: '2024-10-23',
        location: 'Jalandhar, Punjab',
        organic: true,
        isActive: true,
        isAvailable: true,
        isPremium: false
      }
    ];

    // Create crops
    let createdCrops = 0;
    for (const cropData of extraCrops) {
      try {
        await Crop.create(cropData);
        console.log(`✅ Created crop: ${cropData.name}`);
        createdCrops++;
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`⚠️  Crop already exists: ${cropData.name}`);
        } else {
          console.log(`❌ Error creating crop ${cropData.name}: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Successfully created ${createdCrops} new crops!`);
    
    // Show summary
    const totalCrops = await Crop.count();
    const activeCrops = await Crop.count({ where: { isActive: true } });
    const availableCrops = await Crop.count({ where: { isAvailable: true } });
    const organicCrops = await Crop.count({ where: { organic: true } });
    
    console.log('\n📊 Current Database Summary:');
    console.log(`- Total Crops: ${totalCrops}`);
    console.log(`- Active Crops: ${activeCrops}`);
    console.log(`- Available Crops: ${availableCrops}`);
    console.log(`- Organic Crops: ${organicCrops}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('✅ Database connection closed');
  }
}

addExtraCrops();
