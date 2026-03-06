#!/usr/bin/env node

/**
 * Punjab Bulk Data Seeder
 *
 * - 50 farmer profiles across Punjab
 * - 2000 consumer profiles across Punjab
 * - 5–20 crops per farmer (mixed categories, premium / organic mix, no images)
 * - Farmer ratings from newly added consumer profiles
 *
 * Usage:
 *   cd backend
 *   npm run build
 *   node seed-punjab-large.js
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./dist/config/database').default || require('./dist/config/database');
const sequelize = db.sequelize;
const { User, Farmer, Crop, FarmerRating } = require('./dist/models');

// Load JSON data pools
const namePools = require('./src/seeders/data/punjab-name-pools.json');
const locations = require('./src/seeders/data/punjab-locations.json');
const cropTemplates = require('./src/seeders/data/punjab-crop-templates.json');

const TARGET_FARMERS = 50;
const TARGET_CONSUMERS = 2000;

/** Random date between 1 Mar 2026 00:00 and 6 Mar 2026 23:59:59 */
const USER_CREATED_START = new Date('2026-03-01T00:00:00.000Z');
const USER_CREATED_END = new Date('2026-03-06T23:59:59.999Z');

function randomDateInRange(start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const randomMs = startMs + Math.random() * (endMs - startMs);
  return new Date(randomMs);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeZipFromPrefix(prefix) {
  const suffix = String(randomInt(0, 99)).padStart(2, '0');
  return `${prefix}${suffix}`;
}

function buildAddressForCity(cityInfo) {
  return {
    address: `Village ${cityInfo.city} Block ${String.fromCharCode(65 + randomInt(0, 5))}`,
    city: cityInfo.city,
    state: cityInfo.state,
    zipCode: makeZipFromPrefix(cityInfo.zipPrefix),
    country: 'India',
    latitude: cityInfo.latitude,
    longitude: cityInfo.longitude
  };
}

function buildFarmName(cityInfo, index) {
  const prefixes = [
    'Green Valley',
    'Golden Harvest',
    'Sunrise',
    'Heritage',
    'Organic Roots',
    'Healthy Fields',
    'Fresh Basket',
    'River View',
    'Modern Agro',
    'Kisan Pride'
  ];
  const suffixes = ['Farm', 'Orchards', 'Agro Farm', 'Plantation', 'Fields', 'Growers'];
  const prefix = prefixes[index % prefixes.length];
  const suffix = suffixes[index % suffixes.length];
  return `${prefix} ${cityInfo.city} ${suffix}`;
}

function buildCropDefinitions() {
  const categories = ['vegetables', 'fruits', 'grains', 'herbs', 'others'];
  const templateByCategory = {
    vegetables: cropTemplates.vegetables,
    fruits: cropTemplates.fruits,
    grains: cropTemplates.grains,
    herbs: cropTemplates.herbs,
    others: cropTemplates.others
  };

  const allTemplates = [];
  for (const cat of categories) {
    const list = templateByCategory[cat] || [];
    for (const t of list) {
      allTemplates.push(t);
    }
  }
  return { categories, templateByCategory, allTemplates };
}

function buildCropForFarmer(farmerUserId, cityInfo, cropTemplate, indexOffset) {
  const today = new Date();
  const harvestOffsetDays = randomInt(-5, 5) + indexOffset;
  const expiryOffsetDays = harvestOffsetDays + randomInt(10, 45);

  const harvestDate = new Date(today.getTime() + harvestOffsetDays * 24 * 60 * 60 * 1000);
  const expiryDate = new Date(today.getTime() + expiryOffsetDays * 24 * 60 * 60 * 1000);

  const basePrice = cropTemplate.basePricePerKg;
  const pricePerKg = Math.max(
    10,
    basePrice + randomInt(-5, 15)
  );

  const quantity = randomInt(50, 400);

  const isPremium = Math.random() < (cropTemplate.defaultPremium ? 0.8 : 0.3);
  const isOrganic = Math.random() < (cropTemplate.defaultOrganic ? 0.9 : 0.4);

  return {
    farmerId: farmerUserId,
    name: cropTemplate.name,
    description: cropTemplate.description,
    pricePerKg,
    quantity,
    unit: 'kg',
    category: cropTemplate.category,
    imageUrl: null, // explicitly no images
    isActive: true,
    isPremium,
    isAvailable: quantity > 0,
    harvestDate,
    expiryDate,
    location: `${cityInfo.city}, ${cityInfo.state}`,
    organic: isOrganic,
    isOrganic: isOrganic,
    isApproved: true,
    approvedAt: today
  };
}

async function createPunjabBulkData() {
  console.log('🌾 Starting Punjab bulk data seeding...');

  const farmerPasswordHash = await bcrypt.hash('farmer123', 10);
  const consumerPasswordHash = await bcrypt.hash('consumer123', 10);

  const createdFarmers = [];
  const createdConsumers = [];

  const { allTemplates } = buildCropDefinitions();
  const cityList = locations.cities;

  // 1. Create farmers + farmer profiles + crops
  console.log(`👨‍🌾 Creating up to ${TARGET_FARMERS} farmers with crops...`);
  for (let i = 0; i < TARGET_FARMERS; i++) {
    const cityInfo = cityList[i % cityList.length];
    const firstName = pickRandom(namePools.farmerFirstNames);
    const lastName = pickRandom(namePools.farmerLastNames);

    const email = `farmer${String(i + 1).padStart(3, '0')}.punjab@example.com`;
    const phone = `+91 98${randomInt(10, 99)}${String(100000 + i).slice(0, 6)}`;

    const farmerCreatedAt = randomDateInRange(USER_CREATED_START, USER_CREATED_END);
    let farmerUser;
    try {
      farmerUser = await User.create({
        firstName,
        lastName,
        email,
        password: farmerPasswordHash,
        role: 'farmer',
        phone,
        isActive: true,
        isPremium: Math.random() < 0.5,
        createdAt: farmerCreatedAt,
        updatedAt: farmerCreatedAt
      });
      console.log(`✅ Created farmer user ${email}`);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(`⚠️ Farmer user already exists for email ${email}, reusing...`);
        farmerUser = await User.findOne({ where: { email } });
        if (!farmerUser) {
          console.error(`❌ Failed to lookup existing farmer user for ${email}`);
          continue;
        }
      } else {
        console.error('❌ Error creating farmer user:', error.message);
        continue;
      }
    }

    // Create or find farmer profile
    let farmerProfile = await Farmer.findOne({ where: { userId: farmerUser.id } });
    if (!farmerProfile) {
      const addr = buildAddressForCity(cityInfo);
      farmerProfile = await Farmer.create({
        userId: farmerUser.id,
        phone,
        farmName: buildFarmName(cityInfo, i),
        farmDescription:
          'Diversified farm in Punjab supplying vegetables, fruits and grains directly to consumers.',
        farmLocation: `${cityInfo.city}, ${cityInfo.state}`,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country,
        latitude: addr.latitude,
        longitude: addr.longitude,
        website: null,
        isVerified: Math.random() < 0.6,
        hasVerifiedBadge: Math.random() < 0.4,
        isBoosted: farmerUser.isPremium,
        createdAt: farmerCreatedAt,
        updatedAt: farmerCreatedAt
      });
      console.log(`  🧭 Created farmer profile for ${email} in ${cityInfo.city}`);
    }

    createdFarmers.push(farmerUser);

    // Create crops for this farmer
    const existingCrops = await Crop.count({ where: { farmerId: farmerUser.id } });
    const cropsToCreate = Math.max(0, randomInt(5, 20) - existingCrops);

    if (cropsToCreate > 0) {
      for (let c = 0; c < cropsToCreate; c++) {
        const template = pickRandom(allTemplates);
        const cropData = buildCropForFarmer(farmerUser.id, cityInfo, template, c);
        try {
          await Crop.create(cropData);
        } catch (error) {
          console.log(`  ⚠️ Skipped crop ${template.name} for farmer ${email}: ${error.message}`);
        }
      }
      console.log(
        `  🌱 Added ${cropsToCreate} crops for farmer ${email} (total now >= 5 and <= 20)`
      );
    } else {
      console.log(`  🌱 Farmer ${email} already has ${existingCrops} crops, skipping new ones.`);
    }
  }

  // 2. Create consumers
  console.log(`👥 Creating up to ${TARGET_CONSUMERS} consumers across Punjab...`);
  for (let i = 0; i < TARGET_CONSUMERS; i++) {
    const cityInfo = cityList[i % cityList.length];
    const firstName = pickRandom(namePools.consumerFirstNames);
    const lastName = pickRandom(namePools.consumerLastNames);
    const email = `consumer${String(i + 1).padStart(4, '0')}.punjab@example.com`;
    const phone = `+91 97${randomInt(10, 99)}${String(200000 + i).slice(0, 6)}`;

    const consumerCreatedAt = randomDateInRange(USER_CREATED_START, USER_CREATED_END);
    let consumerUser;
    try {
      consumerUser = await User.create({
        firstName,
        lastName,
        email,
        password: consumerPasswordHash,
        role: 'consumer',
        phone,
        isActive: true,
        isPremium: Math.random() < 0.25,
        createdAt: consumerCreatedAt,
        updatedAt: consumerCreatedAt
      });
      if ((i + 1) % 100 === 0) {
        console.log(`✅ Created consumer user ${i + 1}/${TARGET_CONSUMERS}`);
      }
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        if ((i + 1) % 100 === 0) {
          console.log(`⚠️ Consumer user already exists for email ${email}, reusing...`);
        }
        consumerUser = await User.findOne({ where: { email } });
        if (!consumerUser) {
          console.error(`❌ Failed to lookup existing consumer user for ${email}`);
          continue;
        }
      } else {
        console.error('❌ Error creating consumer user:', error.message);
        continue;
      }
    }

    createdConsumers.push(consumerUser);
  }

  console.log(`👨‍🌾 Farmers created/reused: ${createdFarmers.length}`);
  console.log(`👥 Consumers created/reused: ${createdConsumers.length}`);

  // 3. Create farmer ratings from newly added consumers
  console.log('⭐ Creating farmer ratings from consumers...');

  if (createdFarmers.length === 0 || createdConsumers.length === 0) {
    console.log('⚠️ No farmers or consumers available for ratings, skipping ratings seeding.');
    return;
  }

  for (const farmer of createdFarmers) {
    // Each farmer gets between 20 and 80 ratings
    const ratingsCount = randomInt(20, 80);
    const usedConsumerIds = new Set();

    for (let r = 0; r < ratingsCount; r++) {
      const consumer = pickRandom(createdConsumers);
      if (usedConsumerIds.has(consumer.id)) {
        continue;
      }
      usedConsumerIds.add(consumer.id);

      const ratingValue = randomInt(3, 5); // bias towards good ratings

      try {
        await FarmerRating.create({
          farmerId: farmer.id,
          userId: consumer.id,
          rating: ratingValue
        });
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          // rating already exists for this pair; ignore
          continue;
        }
        console.log(
          `  ⚠️ Could not create rating for farmer ${farmer.id} from consumer ${consumer.id}: ${error.message}`
        );
      }
    }

    console.log(
      `  ⭐ Farmer ${farmer.email} received approximately ${ratingsCount} ratings from consumers`
    );
  }

  console.log('🎉 Punjab bulk data seeding completed.');
}

async function run() {
  try {
    console.log('🚀 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // We assume migrations already ran; do not alter schema here.
    await createPunjabBulkData();
  } catch (error) {
    console.error('❌ Error during Punjab bulk seeding:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('✅ Database connection closed');
  }
}

run();

