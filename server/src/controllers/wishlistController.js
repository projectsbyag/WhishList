const WishlistItem = require('../models/WishlistItem');
const Deal = require('../models/Deal');

exports.list = async (req, res) => {
  const items = await WishlistItem.findAll({
    where: { userId: req.user.id },
    include: [{ model: Deal, as: 'deal' }]
  });
  
  // Enrich items with deal data in case cached fields are missing
  const enriched = items.map(item => {
    const obj = item.toJSON();
    const deal = obj.deal;
    if (deal) {
      if (!obj.title) obj.title = deal.title;
      if (!obj.image) obj.image = deal.image || deal.imageUrl || null;
      if (obj.price == null) obj.price = deal.discountedPrice ?? deal.price ?? null;
    }
    return obj;
  });
  res.json(enriched);
};

exports.add = async (req, res) => {
  const { dealId, note, title, name, description } = req.body;
  
  // If dealId provided, add by deal reference
  if (dealId) {
    const deal = await Deal.findByPk(dealId);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    
    const existing = await WishlistItem.findOne({ 
      where: { userId: req.user.id, dealId } 
    });
    if (existing) return res.status(400).json({ message: 'Already in wishlist' });
    
    const item = await WishlistItem.create({
      userId: req.user.id,
      dealId,
      title: deal.title,
      image: deal.image || deal.imageUrl || null,
      price: deal.discountedPrice ?? deal.price ?? null,
      category: deal.category,
      note,
    });
    return res.status(201).json(item);
  }

  // Otherwise allow adding a generic wishlist item (no deal)
  const itemTitle = title || name;
  if (!itemTitle) return res.status(400).json({ message: 'title or name required' });
  
  const item = await WishlistItem.create({
    userId: req.user.id,
    title: itemTitle,
    description: description || note || '',
  });
  res.status(201).json(item);
};

exports.remove = async (req, res) => {
  const id = req.params.id;
  const result = await WishlistItem.destroy({ 
    where: { id, userId: req.user.id } 
  });
  if (result === 0) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Removed' });
};

// Create a new wishlist item
exports.createWishlistItem = async (req, res) => {
  try {
    const payload = Object.assign({}, req.body, { userId: req.user.id });
    const newItem = await WishlistItem.create(payload);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all wishlist items
exports.getWishlistItems = async (req, res) => {
  try {
    const items = await WishlistItem.findAll({ 
      where: { userId: req.user.id },
      include: [{ model: Deal, as: 'deal' }]
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a wishlist item
exports.updateWishlistItem = async (req, res) => {
  try {
    const [updated] = await WishlistItem.update(
      req.body,
      { where: { id: req.params.id, userId: req.user.id } }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Item not found' });
    }
    const item = await WishlistItem.findByPk(req.params.id);
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a wishlist item
exports.deleteWishlistItem = async (req, res) => {
  try {
    const deleted = await WishlistItem.destroy({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
