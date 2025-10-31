import User from './User';
import Farmer from './Farmer';
import Crop from './Crop';
import Subscription from './Subscription';
import Order from './Order';
import Feedback from './Feedback';

// Define associations
User.hasOne(Farmer, { foreignKey: 'userId', as: 'farmerProfile' });
Farmer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Crop, { foreignKey: 'farmerId', as: 'farmerCrops' });
Crop.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order associations
User.hasMany(Order, { foreignKey: 'consumerId', as: 'consumerOrders' });
User.hasMany(Order, { foreignKey: 'farmerId', as: 'farmerOrders' });
Order.belongsTo(User, { foreignKey: 'consumerId', as: 'consumer' });
Order.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

Crop.hasMany(Order, { foreignKey: 'cropId', as: 'orders' });
Order.belongsTo(Crop, { foreignKey: 'cropId', as: 'crop' });

// Feedback associations
User.hasMany(Feedback, { foreignKey: 'userId', as: 'feedbacks' });
Feedback.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, Farmer, Crop, Subscription, Order, Feedback };
