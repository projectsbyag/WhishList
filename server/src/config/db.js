const mongoose = require('mongoose');

const connectDB = async () => {
  // Use MongoDB Atlas cloud database (from .env)
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI not set in .env file. Please configure MongoDB Atlas connection string.');
  }
  
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Atlas connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check MONGODB_URI in .env file');
    console.error('2. Verify MongoDB Atlas credentials');
    console.error('3. Check network connection');
    console.error('4. Ensure IP whitelist includes your IP');
    throw err;
  }
};

module.exports = connectDB;