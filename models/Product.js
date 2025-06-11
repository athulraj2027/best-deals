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
      url: String, // Store image URL
      order: Number, // Store the order of the image
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
    description: {
      type: String,
      required: true,
      trim: true,
    },
    best_offer: {
      type: {
        offer_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Offer",
        },
        name: {type:String,},
        discount_type: {
          type: String,
          enum: ["percentage", "fixed"],
        },
        discount_value: Number,
        discounted_price: Number,
        savings: Number,
        valid_until: Date,
      },
      default: undefined, // <-- This makes it undefined by default
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    variants: [variantSchema],
    status: {
      type: Boolean,
      default: true, // true for Listed, false for Unlisted
    },
    inStock: {
      type: Boolean,
      default: true, // Product is available in stock
    },
    onSale: {
      type: Boolean,
      default: false, // Product is on sale/special deal
    },
    avgRating: {
      type: Number,
      default: 0, // Average product rating
      min: 0,
      max: 5,
    },
    popularity: {
      type: Number,
      default: 0, // Metric for product popularity (could be view count or purchase count)
    },
    featured: {
      type: Boolean,
      default: false, // Featured products appear first in default sort
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Create indexes for better search performance
productSchema.index({ name: "text", description: "text", brand: "text" });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
