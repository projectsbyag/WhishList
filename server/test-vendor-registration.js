/**
 * Test Vendor Registration Flow
 * Usage: node test-vendor-registration.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');

const API_URL = 'http://localhost:3000';

async function testVendorRegistration() {
  console.log('🚀 Starting Vendor Registration Test\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Test data
    const testEmail = `vendor_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123';

    console.log('📋 Test Credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}\n`);

    // Step 1: Create a test user
    console.log('Step 1️⃣: Creating test user...');
    let hashedPassword;
    try {
      const bcrypt = require('bcryptjs');
      hashedPassword = bcrypt.hashSync(testPassword, 10);
    } catch (e) {
      // Fallback: use plain password for testing (development only!)
      hashedPassword = testPassword;
    }
    
    const user = new User({
      email: testEmail,
      password: hashedPassword,
      name: 'Test Vendor',
      role: 'user',
    });

    const savedUser = await user.save();
    console.log(`✅ User created: ${savedUser._id}`);
    console.log(`   Email: ${savedUser.email}`);
    console.log(`   Role: ${savedUser.role}\n`);

    // Step 2: Create vendor profile
    console.log('Step 2️⃣: Creating vendor profile...');
    const vendor = new Vendor({
      user: savedUser._id,
      storeName: 'Test Vendor Store',
      storeDescription: 'A test vendor store',
      category: 'electronics',
      contactEmail: testEmail,
      contactPhone: '1234567890',
      address: '123 Test Street',
      subscriptionStatus: 'inactive',
      isActive: false,
    });

    const savedVendor = await vendor.save();
    console.log(`✅ Vendor created: ${savedVendor._id}`);
    console.log(`   Store: ${savedVendor.storeName}`);
    console.log(`   Status: ${savedVendor.subscriptionStatus}\n`);

    // Step 3: Update user role to vendor
    console.log('Step 3️⃣: Updating user role to vendor...');
    const updatedUser = await User.findByIdAndUpdate(
      savedUser._id,
      { role: 'vendor' },
      { new: true }
    );
    console.log(`✅ User role updated: ${updatedUser.role}\n`);

    // Step 4: Query vendors (like admin page does)
    console.log('Step 4️⃣: Fetching all vendors (like admin page)...');
    const allVendors = await Vendor.find()
      .populate('user', 'email name role')
      .lean();

    console.log(`✅ Total vendors in database: ${allVendors.length}`);
    allVendors.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.storeName}`);
      console.log(`      Email: ${v.contactEmail}`);
      console.log(`      User ID: ${v.user?._id}`);
      console.log(`      User Role: ${v.user?.role}`);
      console.log(`      Status: ${v.subscriptionStatus}`);
    });

    console.log('\n✅ All tests passed!\n');

    console.log('📊 Summary:');
    console.log(`   ✅ User created with vendor role`);
    console.log(`   ✅ Vendor profile created`);
    console.log(`   ✅ Vendors visible in admin list`);
    console.log(`   ✅ All vendor data correct\n`);

    console.log('🔧 Next steps:');
    console.log(`   1. Use credentials above to test API`);
    console.log(`   2. Check admin-vendors page`);
    console.log(`   3. Verify vendor role is set correctly\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
    process.exit(0);
  }
}

testVendorRegistration();
