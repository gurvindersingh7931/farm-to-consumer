import db from './config/database';
import { createHttpsServer, validateSSLCertificates } from './config/https';

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const startServer = async () => {
  try {
    // Test database connection first
    await db.authenticate();
    console.log('✅ Database connection established successfully.');

    // Import models after database connection is established
    const { User, Farmer, Crop, Subscription, Order } = await import('./models');
    console.log('✅ Models imported successfully.');

    // Sync database models
    await db.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database models synchronized.');

    // Import app after models are ready
    const { default: app } = await import('./app');

    // Validate SSL certificates in production
    if (process.env.NODE_ENV === 'production') {
      const sslValid = validateSSLCertificates();
      if (!sslValid) {
        console.warn('⚠️  SSL certificates not properly configured for production');
      }
    }

    // Create HTTPS server if in production
    const httpsServer = createHttpsServer(app);
    
    if (httpsServer) {
      // Start HTTPS server
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server is running on port ${HTTPS_PORT}`);
        console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Secure API URL: https://localhost:${HTTPS_PORT}/api`);
      });
    }

    // Start HTTP server (development or fallback)
    app.listen(PORT, () => {
      console.log(`🚀 HTTP Server is running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      
      if (process.env.NODE_ENV === 'production' && !httpsServer) {
        console.warn('⚠️  Running in production without HTTPS - not recommended!');
      }
    });

    // Security recommendations
    if (process.env.NODE_ENV === 'production') {
      console.log('\n🔐 Security Recommendations:');
      console.log('   - Ensure JWT_SECRET is set and secure');
      console.log('   - Use HTTPS in production');
      console.log('   - Configure proper CORS origins');
      console.log('   - Set up rate limiting');
      console.log('   - Monitor failed login attempts');
      console.log('   - Keep dependencies updated');
    }

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
