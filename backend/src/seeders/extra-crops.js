const { User, Crop } = require('../../dist/models');

async function createExtraCrops() {
  console.log('🌽 Creating additional crop varieties...');

  // Get existing farmers
  const farmers = await User.findAll({ 
    where: { role: 'farmer' },
    limit: 5 
  });

  if (farmers.length === 0) {
    console.log('❌ No farmers encontrados. Please run the main seeder first.');
    return;
  }

  const extraCrops = [
    // Vegetables
    {
      farmerId: farmers[0].id,
      name: 'Cucumbers',
      description: 'Fresh, crisp cucumbers perfect for salads and pickling',
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
      isPremium: true,
      imageUrl: '/uploads/crop-images/cucumbers-dummy.jpg'
    },
    {
      farmerId: farmers[1].id,
      name: 'Carrots',
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
      isPremium: false,
      imageUrl: '/uploads/crop-images/carrots-dummy.jpg'

    },
    {
      farmerId: farmers[2].id,
      name: 'Onions',
      description: 'Fresh onions, essential for every kitchen',
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
      isPremium: true,
      imageUrl: '/uploads/crop-images/onions-dummy.jpg'
    },
    {
      farmerId: farmers[3].id,
      name: 'Spinach',
      description: 'Dark leafy greens rich in nutrients',
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
      isPremium: false,
      imageUrl: '/uploads/crop-images/spinach-dummy.jpg'
    },
    {
      farmerId: farmers[4].id,
      name: 'Broccoli',
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
      isPremium: true,
      imageUrl: '/uploads/crop-images/broccoli-dummy.jpg'
    },

    // Fruits
    {
      farmerId: farmers[0].id,
      name: 'Bananas',
      description: 'Sweet and nutritious bananas, great for energy',
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
      isPremium: true,
      imageUrl: '/uploads/crop-images/bananas-dummy.jpg'
    },
    {
      farmerId: farmers[1].id,
      name: 'Oranges',
      description: 'Juicy oranges rich in vitamin C',
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
      isPremium: false,
      imageUrl: '/uploads/crop-images/oranges-dummy.jpg'
    },
    {
      farmerId: farmers[2].id,
      name: 'Mangoes',
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
      isPremium: true,
      imageUrl: '/uploads/crop-images/mangoes-dummy.jpg'
    },
    {
      farmerId: farmers[3].id,
      name: 'Pomegranates',
      description: 'Sweet and tangy pomegranates, antioxidant rich',
      pricePerKg: 150,
      quantity: 30,
      unit: 'kg',
      category: 'fruits',
      harvestDate: '2024-10-04',
      expiryDate: '2024-11-20',
      location: 'Jalandhar, Punjab',
      organic: true,
      isActive: true,
      isAvailable: true,
      isPremium: false,
      imageUrl: '/uploads/crop-images/pomegranates-dummy.jpg'
    },
    {
      farmerId: farmers[4].id,
      name: 'Grapes',
      description: 'Fresh grapes, perfect snacking fruit',
      pricePerKg: 100,
      quantity: 70,
      unit: 'kg',
      category: 'fruits',
      harvestDate: '2024-10-07',
      expiryDate: '2024-11-05',
      location: 'Mohali, Punjab',
      organic: true,
      isActive: true,
      isAvailable: true,
      isPremium: true,
      imageUrl: '/uploads/crop-images/grapes-dummy.jpg'
    },

    // Grains
    {
      farmerId: farmers[0].id,
      name: 'Quinoa',
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
      isPremium: true,
      imageUrl: '/uploads/crop-images/quinoa-dummy.jpg'
    },
    {
      farmerId: farmers[1].id,
      name: 'Barley',
      description: 'Nutritious barley grains for soups and salads',
      pricePerKg: 50,
      quantity: 100,
      unit: 'kg',
      category: 'grains',
      harvestDate: '2024-09-28',
      expiryDate: '2024-12-15',
      location: 'Ludhiana, Punjab',
      organic: false,
      isActive: true,
      isAvailable: true,
      isPremium: false,
      imageUrl: '/uploads/crop-images/barley-dummy.jpg'
    },

    // Herbs
    {
      farmerId: farmers[3].id,
      name: 'Basil',
      description: 'Aromatic basil leaves for Italian cuisine',
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
      isPremium: false,
      imageUrl: '/uploads/crop-images/basil-dummy.jpg'
    },
    {
      farmerId: farmers[3].id,
      name: 'Tulsi',
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
      isPremium: false,
      imageUrl: '/uploads/crop-images/tulsi-dummy.jpg'
    },
    {
      farmerId: farmers[3].id,
      name: 'Curry Leaves',
      description: 'Aromatic curry leaves for Indian cooking',
      pricePerKg: 200,
      quantity: 35,
      unit: 'kg',
      category: 'herbs',
      harvestDate: '2024-10-06',
      expiryDate: '2024-10-20',
      location: 'Jalandhar, Punjab',
      organic: true,
      isActive: true,
      isAvailable: true,
      isPremium: false,
      imageUrl: '/uploads/crop-images/curry-leaves-dummy.jpg'
    },

    // Some sold-out items
    {
      farmerId: farmers[0].id,
      name: 'Premium Potatoes',
      description: 'Fresh potatoes, currently sold out',
      pricePerKg: 35,
      quantity: 0,
      unit: 'kg',
      category: 'vegetables',
      harvestDate: '2024-09-25',
      expiryDate: '2024-12-15',
      location: 'Chandigarh, Punjab',
      organic: true,
      isActive: true,
      isAvailable: false,
      isPremium: true,
      imageUrl: '/uploads/crop-images/potatoes-dummy.jpg'
    },
    {
      farmerId: farmers[1].id,
      name: 'Premium Pumpkin',
      description: 'Large pumpkins perfect for festivals',
      pricePerKg: 25,
      quantity: 0,
      unit: 'kg',
      category: 'vegetables',
      harvestDate: '2024-10-01',
      expiryDate: '2024-11-30',
      location: 'Ludhiana, Punjab',
      organic: false,
      isActive: true,
      isAvailable: false,
      isPremium: true,
      imageUrl: '/uploads/crop-images/pumpkin-dummy.jpg'
    }
  ];

  // Create crops
  for (const cropData of extraCrops) {
    try {
      await Crop.create(cropData);
      console.log(`✅ Created crop: ${cropData.name}`);
    } catch (error) {
      console.log(`⚠️  Skipped duplicate crop: ${cropData.name}`);
    }
  }

  console.log(`✅ Created ${extraCrops.length} additional crops`);
}

module.exports = { createExtraCrops };
