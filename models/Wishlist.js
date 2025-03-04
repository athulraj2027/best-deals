const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for individual wishlist items
const WishlistItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: Schema.Types.ObjectId,
    ref: 'Variant',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: null
  },
  size: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/100x100?text=No+Image'
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Main wishlist schema
const WishlistSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [WishlistItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create compound index for faster lookups
WishlistSchema.index({ userId: 1, 'items.productId': 1, 'items.variantId': 1 });

// Method to check if an item already exists in the wishlist
WishlistSchema.methods.itemExists = function(productId, variantId) {
  return this.items.some(item => 
    item.productId.toString() === productId.toString() && 
    item.variantId.toString() === variantId.toString()
  );
};

module.exports = mongoose.model('Wishlist', WishlistSchema);