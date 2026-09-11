const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const auth = require('../middleware/auth');

// Public listing with optional category filter
router.get('/', async (req, res) => {
  const { category, q } = req.query;
  const filter = { isActive: true }; // Only show active deals
  if (category) filter.category = category;
  if (q) filter.title = new RegExp(q, 'i');

  // If no deals exist yet, insert a small set of sample deals so the frontend shows content.
  const total = await Deal.countDocuments();
  if (total === 0) {
    const now = new Date();
    const samples = [
      {
        title: 'Sunrise Cafe - Breakfast Deal',
        description: 'Enjoy a delicious 2-course breakfast at Sunrise Cafe with fresh coffee.',
        category: 'restaurants',
        price: 7.99,
        originalPrice: 12.99,
        discountedPrice: 7.99,
        imageUrl: 'https://via.placeholder.com/400x300?text=Sunrise+Cafe+Breakfast',
        image: 'https://via.placeholder.com/400x300?text=Sunrise+Cafe+Breakfast',
        discount: '30% OFF',
        dealLink: 'https://example.com/breakfast-deal',
        store: 'Sunrise Cafe',
        isActive: true,
        expiryDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3) // 3 days
      },
      {
        title: 'Grand Hotel - Weekend Stay',
        description: '2-night weekend stay with breakfast included and complimentary wifi.',
        category: 'hotels',
        price: 129.00,
        originalPrice: 199.00,
        discountedPrice: 129.00,
        imageUrl: 'https://via.placeholder.com/400x300?text=Grand+Hotel+Stay',
        image: 'https://via.placeholder.com/400x300?text=Grand+Hotel+Stay',
        discount: '40% OFF',
        dealLink: 'https://example.com/hotel-deal',
        store: 'Grand Hotel',
        isActive: true,
        expiryDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7) // 7 days
      },
      {
        title: 'FlyAway - Discounted Flight',
        description: 'Save big on select domestic and international routes this season.',
        category: 'airlines',
        price: 199.00,
        originalPrice: 299.00,
        discountedPrice: 199.00,
        imageUrl: 'https://via.placeholder.com/400x300?text=FlyAway+Airlines',
        image: 'https://via.placeholder.com/400x300?text=FlyAway+Airlines',
        discount: '25% OFF',
        dealLink: 'https://example.com/flight-deal',
        store: 'FlyAway Airlines',
        isActive: true,
        expiryDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10) // 10 days
      },
      {
        title: 'TechHub - Electronics Sale',
        description: 'Latest gadgets and electronics at unbeatable prices. Limited stock available.',
        category: 'electronics',
        price: 89.99,
        originalPrice: 149.99,
        discountedPrice: 89.99,
        imageUrl: 'https://via.placeholder.com/400x300?text=TechHub+Electronics',
        image: 'https://via.placeholder.com/400x300?text=TechHub+Electronics',
        discount: '40% OFF',
        dealLink: 'https://example.com/tech-deal',
        store: 'TechHub',
        isActive: true,
        expiryDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5)
      },
      {
        title: 'Fashion Week - Designer Clothes',
        description: 'Premium designer clothing collection at reduced prices. Quality guaranteed.',
        category: 'fashion',
        price: 45.99,
        originalPrice: 99.99,
        discountedPrice: 45.99,
        imageUrl: 'https://via.placeholder.com/400x300?text=Fashion+Week+Sale',
        image: 'https://via.placeholder.com/400x300?text=Fashion+Week+Sale',
        discount: '54% OFF',
        dealLink: 'https://example.com/fashion-deal',
        store: 'Fashion Week',
        isActive: true,
        expiryDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14)
      }
    ];
    try {
      await Deal.insertMany(samples);
      console.log('✅ Sample deals with images created');
    } catch (err) {
      console.error('Failed to insert sample deals', err);
    }
  }

  const deals = await Deal.find(filter).limit(100);
  res.json(deals);
});

// Admin create (simple - auth required; admin role expected)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const d = await Deal.create(req.body);
  res.status(201).json(d);
});

// Get single deal by ID
router.get('/:id', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin update deal
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin delete deal
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
