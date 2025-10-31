const bcrypt = require('bcryptjs');
const { User, Farmer, Crop, Order, Subscription } = require('../../dist/models');
const { createExtraCrops } = require('./extra-crops');

async function createDummyData() {
  console.log('🌱 Starting to create dummy data...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  try {
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@farmconnect.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      isPremium: true
    });
    console.log('✅ Created admin user');
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('⚠️  Admin user already exists');
    } else {
      throw error;
    }
  }

  // Create farmer users
  const farmers = [
    {
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.kumar@example.com',
      password: await bcrypt.hash('farmer123', 10),
      phone: '+91 9876543210',
      isActive: true,
      isPremium: true,
      farmerProfile: {
        farmName: 'Green Valley Farm',
        phone: '+91 9876543210',
        address: 'Village Patel Nagar, Block A',
        city: 'Chandigarh',
        state: 'Punjab',
        zipCode: '160017',
        country: 'India',
        latitude: 30.7333,
        longitude: 76.7794,
        website: 'https://greenvalleyfarm.com',
        farmDescription: 'Organic farm specializing in fresh vegetables and fruits. We deliver fresh produce daily.',
        isVerified: true,
        hasVerifiedBadge: true,
        isBoosted: true
      },
      crops: [
        {
          name: 'Fresh Tomatoes',
          description: 'Hand-picked organic tomatoes, perfect for salads and cooking',
          pricePerKg: 45,
          quantity: 100,
          unit: 'kg',
          category: 'vegetables',
          harvestDate: '2024-10-01',
          expiryDate: '2024-10-20',
          location: 'Chandigarh, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: true,
          imageUrl: '/uploads/crop-images/tomatoes-dummy.jpg'
        },
        {
          name: 'Sweet Corn',
          description: 'Fresh sweet corn harvested daily, perfect for grilling',
          pricePerKg: 60,
          quantity: 50,
          unit: 'kg',
          category: 'vegetables',
          harvestDate: '2024-10-02',
          expiryDate: '2024-10-25',
          location: 'Chandigarh, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: true,
          imageUrl: '/uploads/crop-images/corn-dummy.jpg'
        }
      ]
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@example.com',
      password: await bcrypt.hash('farmer123', 10),
      phone: '+91 9876543211',
      isActive: true,
      isPremium: false,
      farmerProfile: {
        farmName: 'Sunrise Orchards',
        phone: '+91 9876543211',
        address: 'Plot No. 42, Sector 15',
        city: 'Ludhiana',
        state: 'Punjab',
        zipCode: '141008',
        country: 'India',
        latitude: 30.9010,
        longitude: 75.8573,
        farmDescription: 'Traditional fruit orchard with generations of farming experience. Specializing in seasonal fruits.',
        isVerified: false,
        hasVerifiedBadge: false,
        isBoosted: false
      },
      crops: [
        {
          name: 'Fresh Apples',
          description: 'Sweet and crunchy apples from our family orchard',
          pricePerKg: 80,
          quantity: 75,
          unit: 'kg',
          category: 'fruits',
          harvestDate: '2024-09-28',
          expiryDate: '2024-11-15',
          location: 'Ludhiana, Punjab',
          organic: false,
          isActive: true,
          isAvailable: true,
          isPremium: false,
          imageUrl: '/uploads/crop-images/apples-dummy.jpg'
        }
      ]
    },
    {
      firstName: 'Mohammad',
      lastName: 'Ali',
      email: 'mohammad.ali@example.com',
      password: await bcrypt.hash('farmer123', 10),
      phone: '+91 9876543212',
      isActive: true,
      isPremium: true,
      farmerProfile: {
        farmName: 'Golden Rice Fields',
        phone: '+91 9876543212',
        address: 'House No. 123, Market Road',
        city: 'Amritsar',
        state: 'Punjab',
        zipCode: '143001',
        country: 'India',
        latitude: 31.6340,
        longitude: 74.8723,
        website: 'https://goldenrice.com',
        farmDescription: 'Premium rice and grain producer with organic certification. Trusted by families for generations.',
        isVerified: true,
        hasVerifiedBadge: true,
        isBoosted: true
      },
      crops: [
        {
          name: 'Basmati Rice',
          description: 'Premium quality basmati rice, aromatic and flavorful',
          pricePerKg: 120,
          quantity: 200,
          unit: 'kg',
          category: 'grains',
          harvestDate: '2024-10-01',
          expiryDate: '2024-12-31',
          location: 'Amritsar, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: true,
          imageUrl: '/uploads/crop-images/rice-dummy.jpg'
        },
        {
          name: 'Wheat Flour',
          description: 'Stone-ground wheat flour, freshly milled',
          pricePerKg: 35,
          quantity: 150,
          unit: 'kg',
          category: 'grains',
          harvestDate: '2024-09-30',
          expiryDate: '2024-11-30',
          location: 'Amritsar, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: true,
          imageUrl: '/uploads/crop-images/flour-dummy.jpg'
        }
      ]
    },
    {
      firstName: 'Sunita',
      lastName: 'Devi',
      email: 'sunita.devi@example.com',
      password: await bcrypt.hash('farmer123', 10),
      phone: '+91 9876543213',
      isActive: true,
      isPremium: false,
      farmerProfile: {
        farmName: 'Herbal Haven',
        phone: '+91 9876543213',
        address: 'Near Shiv Temple, Main Road',
        city: 'Jalandhar',
        state: 'Punjab',
        zipCode: '144001',
        country: 'India',
        latitude: 31.3260,
        longitude: 75.5762,
        farmDescription: 'Specialized herb garden with medicinal and culinary herbs. Eco-friendly and sustainable practices.',
        isVerified: false,
        hasVerifiedBadge: false,
        isBoosted: false
      },
      crops: [
        {
          name: 'Fresh Mint',
          description: 'Fresh mint leaves, perfect for teas and garnishing',
          pricePerKg: 200,
          quantity: 25,
          unit: 'kg',
          category: 'herbs',
          harvestDate: '2024-10-03',
          expiryDate: '2024-10-18',
          location: 'Jalandhar, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: false,
          imageUrl: '/uploads/crop-images/mint-dummy.jpg'
        },
        {
          name: 'Coriander',
          description: 'Fresh coriander leaves for daily cooking needs',
          pricePerKg: 150,
          quantity: 30,
          unit: 'kg',
          category: 'herbs',
          harvestDate: '2024-10-03',
          expiryDate: '2024-10-18',
          location: 'Jalandhar, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: false,
          imageUrl: '/uploads/crop-images/coriander-dummy.jpg'
        }
      ]
    },
    {
      firstName: 'Amit',
      lastName: 'Singh',
      email: 'amit.singh@example.com',
      password: await bcrypt.hash('farmer123', 10),
      phone: '+91 9876543214',
      isActive: true,
      isPremium: true,
      farmerProfile: {
        farmName: 'Modern Plantation',
        phone: '+91 9876543214',
        address: 'Industrial Area, Phase 2',
        city: 'Mohali',
        state: 'Punjab',
        zipCode: '140055',
        country: 'India',
        latitude: 30.7554,
        longitude: 76.6900,
        website: 'https://modernplantation.in',
        farmDescription: 'Tech-driven farm using hydroponics and modern irrigation. Premium quality vegetables and fruits.',
        isVerified: true,
        hasVerifiedBadge: true,
        isBoosted: true
      },
      crops: [
        {
          name: 'Bell Peppers',
          description: 'Colorful bell peppers, perfect for stir-fries and salads',
          pricePerKg: 75,
          quantity: 60,
          unit: 'kg',
          category: 'vegetables',
          harvestDate: '2024-10-04',
          expiryDate: '2024-11-04',
          location: 'Mohali, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: true,
          imageUrl: '/uploads/crop-images/bell-peppers-dummy.jpg'
        },
        {
          name: 'Strawberries',
          description: 'Sweet and juicy strawberries, grown in controlled environment',
          pricePerKg: 250,
          quantity: 40,
          unit: 'kg',
          category: 'fruits',
          harvestDate: '2024-10-05',
          expiryDate: '2024-10-22',
          location: 'Mohali, Punjab',
          organic: true,
          isActive: true,
          isAvailable: true,
          isPremium: true,
          imageUrl: '/uploads/crop-images/strawberries-dummy.jpg'
        }
      ]
    }
  ];

  // Create farmer users and their profiles
  const createdFarmers = [];
  for (const farmerData of farmers) {
    try {
      const farmerUser = await User.create({
        firstName: farmerData.firstName,
        lastName: farmerData.lastName,
        email: farmerData.email,
        password: farmerData.password,
        role: 'farmer',
        phone: farmerData.phone,
        isActive: farmerData.isActive,
        isPremium: farmerData.isPremium
      });

      const farmerProfile = await Farmer.create({
        ...farmerData.farmerProfile,
        userId: farmerUser.id
      });

      // Create crops for this farmer
      for (const cropData of farmerData.crops) {
        await Crop.create({
          ...cropData,
          farmerId: farmerUser.id
        });
      }

      createdFarmers.push(farmerUser);
      console.log(`✅ Created farmer: ${farmerData.firstName} ${farmerData.lastName}`);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(`⚠️  Farmer already exists: ${farmerData.firstName} ${farmerData.lastName}`);
        try {
          const existingFarmer = await User.findOne({ where: { email: farmerData.email } });
          if (existingFarmer) {
            createdFarmers.push(existingFarmer);
          }
        } catch (lookupError) {
          console.log(`❌ Could not find existing farmer: ${farmerData.email}`);
        }
      } else {
        throw error;
      }
    }
  }

  // Create consumer users
  const consumers = [
    {
      firstName: 'Anita',
      lastName: 'Verma',
      email: 'anita.verma@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543300',
      isActive: true,
      isPremium: true,
      role: 'consumer'
    },
    {
      firstName: 'Rahul',
      lastName: 'Gupta',
      email: 'rahul.gupta@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543301',
      isActive: true,
      isPremium: false,
      role: 'consumer'
    },
    {
      firstName: 'Kavita',
      lastName: 'Jain',
      email: 'kavita.jain@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543302',
      isActive: true,
      isPremium: true,
      role: 'consumer'
    },
    {
      firstName: 'Vikram',
      lastName: 'Malhotra',
      email: 'vikram.malhotra@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543303',
      isActive: true,
      isPremium: false,
      role: 'consumer'
    },
    {
      firstName: 'Deepika',
      lastName: 'Thakur',
      email: 'deepika.thakur@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543304',
      isActive: true,
      isPremium: true,
      role: 'consumer'
    },
    {
      firstName: 'Rohit',
      lastName: 'Mishra',
      email: 'rohit.mishra@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543305',
      isActive: true,
      isPremium: false,
      role: 'consumer'
    },
    {
      firstName: 'Neha',
      lastName: 'Agarwal',
      email: 'neha.agarwal@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543306',
      isActive: true,
      isPremium: true,
      role: 'consumer'
    },
    {
      firstName: 'Arjun',
      lastName: 'Rajput',
      email: 'arjun.rajput@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543307',
      isActive: true,
      isPremium: false,
      role: 'consumer'
    },
    {
      firstName: 'Priyanka',
      lastName: 'Chopra',
      email: 'priyanka.chopra@example.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543308',
      isActive: true,
      isPremium: true,
      role: 'consumer'
    },
    {
      firstName: 'Kuldeep',
      lastName: 'Singh',
      email: 'kuldeep_singh_consumer@gmail.com',
      password: await bcrypt.hash('consumer123', 10),
      phone: '+91 9876543309',
      isActive: true,
      isPremium: false,
      role: 'consumer'
    }
  ];

  const createdConsumers = [];
  for (const consumerData of consumers) {
    try {
      const consumer = await User.create(consumerData);
      createdConsumers.push(consumer);
      console.log(`✅ Created consumer: ${consumerData.firstName} ${consumerData.lastName}`);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(`⚠️  Consumer already exists: ${consumerData.firstName} ${consumerData.lastName}`);
        // Still add to the array for consistency
        try {
          const existingConsumer = await User.findOne({ where: { email: consumerData.email } });
          if (existingConsumer) {
            createdConsumers.push(existingConsumer);
          }
        } catch (lookupError) {
          console.log(`❌ Could not find existing consumer: ${consumerData.email}`);
        }
      } else {
        throw error;
      }
    }
  }

  // Create some sample orders
  const crops = await Crop.findAll({ include: [{ model: User, as: 'farmer' }] });
  const consumers_users = await User.findAll({ where: { role: 'consumer' } });

  if (crops.length > 0 && consumers_users.length > 0) {
    // Create sample orders
    const orders = [
      {
        consumerId: consumers_users[0].id,
        farmerId: crops[0].farmerId,
        cropId: crops[0].id,
        quantity: 5,
        status: 'pending',
        totalAmount: crops[0].pricePerKg * 5,
        notes: 'Please deliver fresh vegetables'
      },
      {
        consumerId: consumers_users[1].id,
        farmerId: crops[1].farmerId,
        cropId: crops[1].id,
        quantity: 3,
        status: 'accepted',
        totalAmount: crops[1].pricePerKg * 3,
        notes: 'Delivery preferred in morning'
      },
      {
        consumerId: consumers_users[2].id,
        farmerId: crops[2].farmerId,
        cropId: crops[2].id,
        quantity: 10,
        status: 'completed',
        totalAmount: crops[2].pricePerKg * 10,
        notes: 'Excellent quality rice'
      },
      {
        consumerId: consumers_users[3].id,
        farmerId: crops[3].farmerId,
        cropId: crops[3].id,
        quantity: 2,
        status: 'pending',
        totalAmount: crops[3].pricePerKg * 2,
        notes: 'Need fresh herbs for cooking'
      },
      {
        consumerId: consumers_users[4].id,
        farmerId: crops[4].farmerId,
        cropId: crops[4].id,
        quantity: 8,
        status: 'accepted',
        totalAmount: crops[4].pricePerKg * 8,
        notes: 'Regular customer, preferred timing'
      }
    ];

    for (const orderData of orders) {
      await Order.create(orderData);
      console.log(`✅ Created order for crop ${orderData.cropId}`);
    }
  }

  // Create some premium subscriptions
  const premiumFarmers = createdFarmers.filter(f => f.isPremium);
  const premiumConsumers = createdConsumers.filter(c => c.isPremium);

  for (const farmer of premiumFarmers.slice(0, 3)) {
    await Subscription.create({
      userId: farmer.id,
      planType: 'annual',
      price: 999,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      status: 'active',
      paymentMethod: 'online',
      transactionId: `txn_${Date.now()}_${farmer.id}`,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    console.log(`✅ Created premium subscription for farmer ${farmer.firstName}`);
  }

  for (const consumer of premiumConsumers.slice(0, 3)) {
    await Subscription.create({
      userId: consumer.id,
      planType: 'monthly',
      price: 99,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
      status: 'active',
      paymentMethod: 'online',
      transactionId: `txn_${Date.now()}_${consumer.id}`,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    console.log(`✅ Created premium subscription for consumer ${consumer.firstName}`);
  }

  // Create additional crops
  await createExtraCrops();

  console.log('\n🎉 Dummy data creation completed!');
  console.log('\n📊 Summary:');
  console.log(`- 1 Admin user`);
  console.log(`- ${createdFarmers.length} Farmer users with profiles`);
  console.log(`- ${createdConsumers.length} Consumer users`);
  console.log(`- ${await Crop.count()} Crops`);
  console.log(`- ${await Order.count()} Orders`);
  console.log(`- ${await Subscription.count()} Premium subscriptions`);

  console.log('\n🔑 Test Credentials:');
  console.log('Admin: admin@farmconnect.com / admin123');
  console.log('Farmers: rajesh.kumar@example.com / farmer123');
  console.log('Consumers: kuldeep_singh_consumer@gmail.com / consumer123');
}

// Run the seeder
createDummyData()
  .then(() => {
    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  });
