#!/bin/bash

# Configuration Status Checker
# This script checks all pending configurations

echo "🔍 Farm-to-Consumer Backend Configuration Status"
echo "================================================="

# Check .env file
echo ""
echo "📄 Environment Variables (.env):"
echo "--------------------------------"

if [ -f .env ]; then
    echo "✅ .env file exists"
    
    # Check critical variables
    if grep -q "JWT_SECRET=" .env; then
        JWT_SECRET=$(grep "JWT_SECRET=" .env | cut -d'=' -f2)
        if [ ${#JWT_SECRET} -ge 32 ]; then
            echo "✅ JWT_SECRET configured (${#JWT_SECRET} chars)"
        else
            echo "❌ JWT_SECRET too short (${#JWT_SECRET} chars, need 32+)"
        fi
    else
        echo "❌ JWT_SECRET missing"
    fi
    
    if grep -q "DB_PASSWORD=" .env; then
        echo "✅ DB_PASSWORD configured"
    else
        echo "❌ DB_PASSWORD missing"
    fi
    
    if grep -q "RAZORPAY_KEY_ID=" .env && ! grep -q "RAZORPAY_KEY_ID=your_razorpay_key_id" .env; then
        echo "✅ Razorpay configured"
    else
        echo "❌ Razorpay not configured"
    fi
    
    if grep -q "GOOGLE_MAPS_API_KEY=" .env && ! grep -q "GOOGLE_MAPS_API_KEY=your_google_maps_api_key" .env; then
        echo "✅ Google Maps API configured"
    else
        echo "❌ Google Maps API not configured"
    fi
    
    if grep -q "SSL_KEY_PATH=" .env && ! grep -q "SSL_KEY_PATH=/path/to/your/private.key" .env; then
        echo "✅ SSL certificates configured"
    else
        echo "❌ SSL certificates not configured"
    fi
else
    echo "❌ .env file missing"
fi

# Check package.json dependencies
echo ""
echo "📦 Security Packages:"
echo "--------------------"

if grep -q "express-rate-limit" package.json; then
    echo "✅ express-rate-limit"
else
    echo "❌ express-rate-limit missing"
fi

if grep -q "express-slow-down" package.json; then
    echo "✅ express-slow-down"
else
    echo "❌ express-slow-down missing"
fi

if grep -q "express-mongo-sanitize" package.json; then
    echo "✅ express-mongo-sanitize"
else
    echo "❌ express-mongo-sanitize missing"
fi

if grep -q "xss-clean" package.json; then
    echo "✅ xss-clean"
else
    echo "❌ xss-clean missing"
fi

if grep -q "hpp" package.json; then
    echo "✅ hpp"
else
    echo "❌ hpp missing"
fi

if grep -q "compression" package.json; then
    echo "✅ compression"
else
    echo "❌ compression missing"
fi

if grep -q "express-validator" package.json; then
    echo "✅ express-validator"
else
    echo "❌ express-validator missing"
fi

# Check directories
echo ""
echo "📁 Directory Structure:"
echo "----------------------"

if [ -d "ssl" ]; then
    echo "✅ ssl/ directory exists"
    if [ -f "ssl/private.key" ]; then
        echo "✅ SSL private key exists"
    else
        echo "❌ SSL private key missing"
    fi
    if [ -f "ssl/certificate.crt" ]; then
        echo "✅ SSL certificate exists"
    else
        echo "❌ SSL certificate missing"
    fi
else
    echo "❌ ssl/ directory missing"
fi

if [ -d "src/config" ]; then
    echo "✅ src/config/ directory exists"
    if [ -f "src/config/database.js" ]; then
        echo "✅ database.js exists"
    else
        echo "❌ database.js missing"
    fi
else
    echo "❌ src/config/ directory missing"
fi

# Check migrations
echo ""
echo "🗄️  Database Migrations:"
echo "----------------------"

if [ -f "src/models/migrations/20240130000000-add-search-indexes.js" ]; then
    echo "✅ Security indexes migration exists"
else
    echo "❌ Security indexes migration missing"
fi

# Check Sequelize config
echo ""
echo "⚙️  Sequelize Configuration:"
echo "---------------------------"

if [ -f ".sequelizerc" ]; then
    echo "✅ .sequelizerc exists"
    if grep -q "database.js" .sequelizerc; then
        echo "✅ Points to database.js"
    else
        echo "❌ Points to wrong config file"
    fi
else
    echo "❌ .sequelizerc missing"
fi

# Summary
echo ""
echo "📊 Configuration Summary:"
echo "========================"

TOTAL_CHECKS=0
PASSED_CHECKS=0

# Count checks (simplified)
if [ -f .env ]; then ((PASSED_CHECKS++)); fi
((TOTAL_CHECKS++))

if grep -q "express-rate-limit" package.json; then ((PASSED_CHECKS++)); fi
((TOTAL_CHECKS++))

if [ -d "ssl" ]; then ((PASSED_CHECKS++)); fi
((TOTAL_CHECKS++))

if [ -f "src/config/database.js" ]; then ((PASSED_CHECKS++)); fi
((TOTAL_CHECKS++))

if [ -f ".sequelizerc" ]; then ((PASSED_CHECKS++)); fi
((TOTAL_CHECKS++))

PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "Configuration Complete: ${PASSED_CHECKS}/${TOTAL_CHECKS} (${PERCENTAGE}%)"

if [ $PERCENTAGE -ge 80 ]; then
    echo "🎉 Configuration is mostly complete!"
elif [ $PERCENTAGE -ge 60 ]; then
    echo "⚠️  Configuration is partially complete"
else
    echo "❌ Configuration needs significant work"
fi

echo ""
echo "🚀 To complete setup, run:"
echo "   chmod +x setup.sh"
echo "   ./setup.sh"
