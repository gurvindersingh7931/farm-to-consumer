# Database Seeding Guide

This guide explains how to populate the farm-to-consumer database with comprehensive dummy data for testing and development.

## 📊 Current Data Summary

✅ **Successfully Created:**
- **1 Admin User** - admin@farmconnect.com
- **5 Farmer Users** with complete profiles across Punjab, India
- **10 Consumer Users** for testing
- **22 Crop Listings** with variety across vegetables, fruits, grains, and herbs
- **5 Sample Orders** with different statuses
- **6 Premium Subscriptions** (3 farmers, 3 consumers)

## 🌱 Database Contents

### **Farmers & Profiles**
1. **Rajesh Kumar** (Premium) - Green Valley Farm, Chandigarh
   - Organic tomatoes, sweet corn
   - Verified badge, boosted visibility

2. **Priya Sharma** (Free) - Sunrise Orchards, Ludhiana  
   - Fresh apples
   - Basic listing

3. **Mohammad Ali** (Premium) - Golden Rice Fields, Amritsar
   - Premium basmati rice, wheat flour
   - Verified badge, boosted visibility

4. **Sunita Devi** (Free) - Herbal Haven, Jalandhar
   - Fresh mint, coriander, herbs
   - Specialized herb garden

5. **Amit Singh** (Premium) - Modern Plantation, Mohali
   - Bell peppers, strawberries (hydroponic)
   - Verified badge, tech-driven farm

### **Consumer Users**
- Anita Verma, Rahul Gupta, Kavita Jain, Vikram Malhotra
- Deepika Thakur, Rohit Mishra, Neha Agarwal, Arjun Rajput  
- Priyanka Chopra, Kuldeep Singh

### **Crop Variety**
- **Vegetables**: Tomatoes, Corn, Cucumbers, Carrots, Onions, Spinach, Broccoli, Bell Peppers
- **Fruits**: Apples, Mangoes, Bananas, Oranges, Strawberries  
- **Grains**: Basmati Rice, Wheat Flour, Quinoa, Barley
- **Herbs**: Mint, Coriander, Basil, Tulsi, Curry Leaves

## 🔑 Test Credentials

### **Admin Access**
- **Email**: admin@farmconnect.com
- **Password**: admin123
- **Role**: Admin (full access to all features)

### **Farmer Access**
- **Email**: rajesh.kumar@example.com
- **Password**: farmer123
- **Premium**: ✅ Yes (verified, boosted)
- **Farm**: Green Valley Farm, Chandigarh

### **Consumer Access**
- **Email**: kuldeep_singh_consumer@gmail.com  
- **Password**: consumer123
- **Premium**: No (can upgrade)
- **Location**: General consumer in Punjab

## 🚀 Running Seeders

### **Add More Crops Only**
```bash
cd backend
node add-extra-crops.js
```

### **Full Database Reset & Seed**
```bash
cd backend
npm run build
node seed-database.js
```

### **Manual Testing**
You can also create users manually through the registration system:
1. Start both frontend and backend
2. Navigate to `/signup`
3. Create accounts with different roles

## 🏗️ Database Schema

### **Users Table**
- Standard user fields (email, password, name, role)
- `isPremium`: Boolean for subscription status
- `role`: enum('farmer', 'consumer', 'admin')

### **Farmers Table**
- Complete farm profiles with location data
- `isVerified`, `hasVerifiedBadge`, `isBoosted` for premium features
- Maps integration ready (latitude, longitude)

### **Crops Table**
- Rich crop data (name, description, price, quantity, unit)
- `category`: vegetables, fruits, grains, herbs, other
- `organic`, `isPremium`, `isAvailable` flags
- Harvest and expiry date tracking

### **Orders Table**
- Consumer-to-farmer order management
- Status tracking (pending, accepted, rejected, completed)
- Order history and analytics ready

### **Subscriptions Table**
- Premium subscription management
- Razorpay integration ready
- Expiry date tracking

## 🎯 Testing Features

### **What You Can Test**

1. **Authentication**
   - Login/logout with different roles
   - Role-based route protection

2. **Farmer Features**
   - Complete farmer profile setup
   - Crop listing management (CRUD)
   - Order acceptance/rejection
   - Premium subscription upgrade

3. **Consumer Features**
   - Browse crop listings (with filters)
   - Distance-based search
   - Order placement
   - Order history

4. **Admin Features**
   - User management dashboard
   - Farmer verification
   - Platform analytics
   - Subscription monitoring

5. **Premium Features**
   - Verified badges
   - Boosted visibility
   - Advanced listing options

### **Sample Scenarios**

1. **Journey**: Consumer browses crops → Places order → Farmer accepts → Order completed
2. **Premium**: Farmer upgrades → Gets verified badge → Increased visibility
3. **Admin**: Monitor platform → Verify farmers → Manage subscriptions

## 🌍 Geographic Coverage

All dummy data is focused on **Punjab, India** for realistic testing:
- **Chandigarh** (2 farms)
- **Ludhiana** (1 farm) 
- **Amritsar** (1 farm)
- **Jalandhar** (1 farm)
- **Mohali** (1 farm)

## 📱 Frontend URLs

Once both servers are running:
- **Frontend**: http://localhost:4200 or http://localhost:4201
- **Backend API**: http://localhost:3000/api/
- **Image Assets**: http://localhost:3000/uploads/

## 🔧 Troubleshooting

### **Common Issues**
1. **Database Connection**: Ensure PostgreSQL is running
2. **CORS Errors**: Check port configuration (4200 vs 4201)
3. **Image Loading**: Verify static file serving in backend
4. **Password Issues**: Use exact passwords listed above

### **Reset Database**
If you need a clean start:
```bash
cd backend
npx sequelize-cli db:drop
npx sequelize-cli db:create  
node add-extra-crops.js
```

---

## 📞 Support

For any issues with the dummy data generation:
1. Check database connection status
2. Verify all environment variables are set
3. Ensure backend builds successfully (`npm run build`)
4. Check that migrations have run

The database is now fully populated and ready for comprehensive testing of all farm-to-consumer platform features! 🌱
