-- Add indexes for efficient search and filtering
-- These indexes will significantly improve query performance for crop and farmer searches

-- Crop table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_search 
ON "Crops" USING gin(to_tsvector('english', name || ' ' || description || ' ' || category));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_category 
ON "Crops" (category) WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_price_range 
ON "Crops" ("pricePerKg") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_organic 
ON "Crops" ("organic") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_isOrganic 
ON "Crops" ("isOrganic") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_availability 
ON "Crops" ("isAvailable") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOTIFY EXISTS idx_crops_harvest_date 
ON "Crops" ("harvestDate") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_farmer_id 
ON "Crops" ("farmerId") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_created_at 
ON "Crops" ("createdAt") WHERE "isActive" = true;

-- Farmer table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_search 
ON "Farmers" USING gin(to_tsvector('english', "farmName" || ' ' || "farmDescription" || ' ' || "farmLocation" || ' ' || city || ' ' || state));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_state 
ON "Farmers" (state);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_city 
ON "Farmers" (city);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_verified_badge 
ON "Farmers" ("hasVerifiedBadge");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_boosted 
ON "Farmers" ("isBoosted");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_user_id 
ON "Farmers" ("farmerId") WHERE "farmerId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_coordinates 
ON "Farmers" (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_created_at 
ON "Farmers" ("createdAt");

-- User table indexes (for join optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_premium 
ON "Users" ("isPremium") WHERE "role" = 'farmer';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_farmer_role 
ON "Users" ("role") WHERE "role" = 'farmer';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_status 
ON "Users" ("isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON "Users" ("createdAt");

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crops_category_price 
ON "Crops" (category, "pricePerKg") WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_state_city 
ON "Farmers" (state, city);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_premium_verified 
ON "Farmers" ("hasVerifiedBadge", "isBoosted") WHERE "farmerId" IS NOT NULL;

-- Geographic indexes for location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_farmers_geo_location 
ON "Farmers" USING btree (
  ST_Point(longitude, latitude) 
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_crops_search IS 'Full-text search index for crop name, description, and category';
COMMENT ON INDEX idx_farmers_search IS 'Full-text search index for farmer farm name, description, location';
COMMENT ON INDEX idx_farmers_coordinates IS 'Geographic index for latitude/longitude filtering';
COMMENT ON INDEX idx_crops_category_price IS 'Composite index for category and price filtering';
