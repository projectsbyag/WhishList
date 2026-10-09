const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, sequelize } = require('./src/config/db');
const Deal = require('./src/models/Deal');

const deals = [
  {
    title: 'Sample restaurant offer',
    description: 'Example deal for development.',
    category: 'restaurants',
    discount: '20% OFF',
    originalPrice: 10000,
    discountedPrice: 8000,
    dealLink: 'https://example.com/restaurant-deal',
    store: 'Example Restaurant',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Sample electronics clearance',
    description: 'Example clearance deal for development.',
    category: 'electronics',
    discount: '15% OFF',
    originalPrice: 20000,
    discountedPrice: 17000,
    dealLink: 'https://example.com/electronics-deal',
    store: 'Example Electronics',
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  },
];

async function seedDeals() {
  try {
    await connectDB();
    await Deal.bulkCreate(deals);
    console.log(`Inserted ${deals.length} sample deals.`);
  } finally {
    await sequelize.close();
  }
}

seedDeals().catch((error) => {
  console.error('Could not seed deals:', error.message);
  process.exitCode = 1;
});