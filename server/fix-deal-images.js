/**
 * Fix Deal Images - Add placeholder images to deals without images
 * Run this from server folder: node fix-deal-images.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('./src/models/Deal');

// Map categories to placeholder images
const imagePlaceholders = {
  restaurants: 'https://via.placeholder.com/400x300?text=Restaurant+Deal',
  hotels: 'https://via.placeholder.com/400x300?text=Hotel+Deal',
  airlines: 'https://via.placeholder.com/400x300?text=Flight+Deal',
  groceries: 'https://via.placeholder.com/400x300?text=Groceries+Deal',
  electronics: 'https://via.placeholder.com/400x300?text=Electronics+Deal',
  fashion: 'https://via.placeholder.com/400x300?text=Fashion+Deal',
  other: 'https://via.placeholder.com/400x300?text=Special+Deal'
};

async function fixDealImages() {
  try {
    console.log('📁 Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('❌ MONGODB_URI not set in .env file');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Find deals without images
    const dealsWithoutImages = await Deal.find({
      $or: [
        { imageUrl: { $exists: false } },
        { imageUrl: null },
        { imageUrl: '' },
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    });

    console.log(`\n📊 Found ${dealsWithoutImages.length} deals without images\n`);

    if (dealsWithoutImages.length === 0) {
      console.log('✅ All deals have images!');
      await mongoose.connection.close();
      return;
    }

    // Update each deal with placeholder image based on category
    for (const deal of dealsWithoutImages) {
      const placeholder = imagePlaceholders[deal.category] || imagePlaceholders.other;
      
      deal.imageUrl = placeholder;
      deal.image = placeholder;
      
      await deal.save();
      
      console.log(`✅ Updated: ${deal.title}`);
      console.log(`   Category: ${deal.category}`);
      console.log(`   Image: ${placeholder}\n`);
    }

    console.log(`\n✅ Successfully updated ${dealsWithoutImages.length} deals with placeholder images!`);
    console.log('\n📝 Note: Replace placeholder URLs with real images later');
    console.log('   You can upload images to /images folder and use /images/filename.png');

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

// Run the function
fixDealImages();
