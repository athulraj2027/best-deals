const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    actualPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ["men", "women", "kids"],
    },
    variants: [variantSchema],
    status: {
      type: Boolean,
      default: true, // true for Listed, false for Unlisted
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Create indexes for better search performance
productSchema.index({ name: "text", brand: "text" });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
