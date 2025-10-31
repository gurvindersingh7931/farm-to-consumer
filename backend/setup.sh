#!/bin/bash

# Farm-to-Consumer Backend Setup Script
# This script helps set up all pending configurations

echo "🚀 Farm-to-Consumer Backend Setup"
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your actual values."
else
    echo "✅ .env file exists"
fi

# Install missing packages
echo ""
echo "📦 Installing missing security packages..."
npm install express-rate-limit express-slow-down express-mongo-sanitize xss-clean hpp compression express-validator

# Install TypeScript types
echo "📦 Installing TypeScript types..."
npm install --save-dev @types/compression @types/express-rate-limit @types/hpp

# Create SSL directory
echo ""
echo "🔒 Creating SSL directory..."
mkdir -p ssl
echo "✅ SSL directory created at ./ssl/"
echo "   Place your SSL certificates here:"
echo "   - ssl/private.key"
echo "   - ssl/certificate.crt"
echo "   - ssl/ca_bundle.crt"

# Check database connection
echo ""
echo "🗄️  Testing database connection..."
if npm run db:migrate:status > /dev/null 2>&1; then
    echo "✅ Database connection successful"
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npm run db:migrate
    
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed"
    else
        echo "❌ Database migration failed"
    fi
else
    echo "❌ Database connection failed"
    echo "   Please check your database configuration in .env file"
fi

# Build the project
echo ""
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
fi

# Final checklist
echo ""
echo "📋 Configuration Checklist:"
echo "=========================="

# Check .env variables
echo "🔍 Checking .env configuration..."

if grep -q "JWT_SECRET=" .env && ! grep -q "JWT_SECRET=your-super-secure" .env; then
    echo "✅ JWT_SECRET configured"
else
    echo "❌ JWT_SECRET needs to be set"
fi

if grep -q "DB_PASSWORD=" .env && ! grep -q "DB_PASSWORD=farm_user" .env; then
    echo "✅ DB_PASSWORD configured"
else
    echo "❌ DB_PASSWORD needs to be set"
fi

if grep -q "RAZORPAY_KEY_ID=" .env && ! grep -q "RAZORPAY_KEY_ID=your_razorpay_key_id" .env; then
    echo "✅ Razorpay configured"
else
    echo "❌ Razorpay needs to be configured"
fi

if grep -q "GOOGLE_MAPS_API_KEY=" .env && ! grep -q "GOOGLE_MAPS_API_KEY=your_google_maps_api_key" .env; then
    echo "✅ Google Maps API configured"
else
    echo "❌ Google Maps API needs to be configured"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Edit .env file with your actual values"
echo "2. Set up SSL certificates in ssl/ directory (for production)"
echo "3. Configure Razorpay payment gateway"
echo "4. Set up Google Maps API key"
echo "5. Run: npm start (to start the server)"
echo ""
echo "🔐 Security Features Enabled:"
echo "- HTTPS support"
echo "- Rate limiting"
echo "- Input validation"
echo "- SQL injection protection"
echo "- XSS protection"
echo "- CORS security"
echo "- JWT authentication"
echo "- Password hashing"
echo ""
echo "✅ Setup completed!"
