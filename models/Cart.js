// models/Cart.js
const mongoose = require("mongoose");

// Cart Item Schema
const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity can not be less than 1."],
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    default: function () {
      return this.price * this.quantity;
    },
  },
});

// Cart Schema
const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [CartItemSchema],
  subtotal: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  shipping: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "completed", "abandoned"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware to calculate totals
CartSchema.pre("save", function (next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((acc, item) => acc + item.subtotal, 0);

  // Calculate tax (example: 10%)
  this.tax = this.subtotal * 0.1;

  // Calculate shipping (example: flat rate)
  this.shipping = this.items.length > 0 ? 10 : 0;

  // Calculate total
  this.total = this.subtotal + this.tax + this.shipping;

  // Update timestamp
  this.updatedAt = Date.now();

  next();
});

// Instance methods
CartSchema.methods = {
  // Add item to cart
  async addItem(productId, quantity = 1) {
    try {
      const Product = mongoose.model("Product");
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error("Product not found");
      }

      const existingItem = this.items.find(
        (item) => item.product.toString() === productId.toString()
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.subtotal = existingItem.price * existingItem.quantity;
      } else {
        this.items.push({
          product: productId,
          quantity: quantity,
          price: product.price,
          subtotal: product.price * quantity,
        });
      }

      return await this.save();
    } catch (error) {
      throw error;
    }
  },

  // Remove item from cart
  async removeItem(productId) {
    this.items = this.items.filter(
      (item) => item.product.toString() !== productId.toString()
    );
    return await this.save();
  },

  // Update item quantity
  async updateItemQuantity(productId, quantity) {
    const item = this.items.find(
      (item) => item.product.toString() === productId.toString()
    );

    if (!item) {
      throw new Error("Item not found in cart");
    }

    if (quantity <= 0) {
      return await this.removeItem(productId);
    }

    item.quantity = quantity;
    item.subtotal = item.price * quantity;

    return await this.save();
  },

  // Clear cart
  async clearCart() {
    this.items = [];
    return await this.save();
  },

  // Get cart total items count
  getItemCount() {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  },
};

// Static methods
CartSchema.statics = {
  // Find active cart for user
  async findActiveCart(userId) {
    return await this.findOne({
      user: userId,
      status: "active",
    }).populate("items.product");
  },

  // Create new cart for user
  async createCart(userId) {
    return await this.create({
      user: userId,
      items: [],
    });
  },
};

const Cart = mongoose.model("Cart", CartSchema);

module.exports = Cart;
