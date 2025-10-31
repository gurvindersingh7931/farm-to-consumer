'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add indexes for efficient search and filtering
    // These indexes will significantly improve query performance for crop and farmer searches

    // Crop table indexes
    await queryInterface.addIndex('Crops', {
      fields: ['name', 'description', 'category'],
      using: 'gin',
      operator: 'gin_trgm_ops',
      name: 'idx_crops_search',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['category'],
      where: { isActive: true },
      name: 'idx_crops_category',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['pricePerKg'],
      where: { isActive: true },
      name: 'idx_crops_price_range',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['organic'],
      where: { isActive: true },
      name: 'idx_crops_organic',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['isOrganic'],
      where: { isActive: true },
      name: 'idx_crops_isOrganic',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['isAvailable'],
      where: { isActive: true },
      name: 'idx_crops_availability',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['harvestDate'],
      where: { isActive: true },
      name: 'idx_crops_harvest_date',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['farmerId'],
      where: { isActive: true },
      name: 'idx_crops_farmer_id',
      concurrently: true
    });

    await queryInterface.addIndex('Crops', {
      fields: ['createdAt'],
      where: { isActive: true },
      name: 'idx_crops_created_at',
      concurrently: true
    });

    // Farmer table indexes
    await queryInterface.addIndex('Farmers', {
      fields: ['farmName', 'farmDescription', 'farmLocation', 'city', 'state'],
      using: 'gin',
      operator: 'gin_trgm_ops',
      name: 'idx_farmers_search',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['state'],
      name: 'idx_farmers_state',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['city'],
      name: 'idx_farmers_city',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['hasVerifiedBadge'],
      name: 'idx_farmers_verified_badge',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['isBoosted'],
      name: 'idx_farmers_boosted',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['farmerId'],
      where: { farmerId: { [Sequelize.Op.ne]: null } },
      name: 'idx_farmers_user_id',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['latitude', 'longitude'],
      where: { 
        latitude: { [Sequelize.Op.ne]: null },
        longitude: { [Sequelize.Op.ne]: null }
      },
      name: 'idx_farmers_coordinates',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['createdAt'],
      name: 'idx_farmers_created_at',
      concurrently: true
    });

    // User table indexes (for join optimization)
    await queryInterface.addIndex('Users', {
      fields: ['isPremium'],
      where: { role: 'farmer' },
      name: 'idx_users_premium',
      concurrently: true
    });

    await queryInterface.addIndex('Users', {
      fields: ['role'],
      where: { role: 'farmer' },
      name: 'idx_users_farmer_role',
      concurrently: true
    });

    await queryInterface.addIndex('Users', {
      fields: ['isActive'],
      name: 'idx_users_active_status',
      concurrently: true
    });

    await queryInterface.addIndex('Users', {
      fields: ['createdAt'],
      name: 'idx_users_created_at',
      concurrently: true
    });

    // Composite indexes for common query patterns
    await queryInterface.addIndex('Crops', {
      fields: ['category', 'pricePerKg'],
      where: { isActive: true },
      name: 'idx_crops_category_price',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['state', 'city'],
      name: 'idx_farmers_state_city',
      concurrently: true
    });

    await queryInterface.addIndex('Farmers', {
      fields: ['hasVerifiedBadge', 'isBoosted'],
      where: { farmerId: { [Sequelize.Op.ne]: null } },
      name: 'idx_farmers_premium_verified',
      concurrently: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove all indexes
    const indexes = [
      'idx_crops_search', 'idx_crops_category', 'idx_crops_price_range',
      'idx_crops_organic', 'idx_crops_isOrganic', 'idx_crops_availability',
      'idx_crops_harvest_date', 'idx_crops_farmer_id', 'idx_crops_created_at',
      'idx_farmers_search', 'idx_farmers_state', 'idx_farmers_city',
      'idx_farmers_verified_badge', 'idx_farmers_boosted', 'idx_farmers_user_id',
      'idx_farmers_coordinates', 'idx_farmers_created_at', 'idx_users_premium',
      'idx_users_farmer_role', 'idx_users_active_status', 'idx_users_created_at',
      'idx_crops_category_price', 'idx_farmers_state_city', 'idx_farmers_premium_verified'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('Crops', indexName);
      } catch (error) {
        // Index might not exist, continue
      }
      
      try {
        await queryInterface.removeIndex('Farmers', indexName);
      } catch (error) {
        // Index might not exist, continue
      }
      
      try {
        await queryInterface.removeIndex('Users', indexName);
      } catch (error) {
        // Index might not exist, continue
      }
    }
  }
};
