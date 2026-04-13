const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Wishlist Item Schema (represents individual items in the wishlist)
const WishlistItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant", // Assuming you have a Variant model
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
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
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

// Main Wishlist Schema
const WishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [WishlistItemSchema],
  },
  { timestamps: true },
);

// Method to calculate total value of wishlist items
WishlistSchema.methods.getTotalValue = function () {
  return this.items.reduce((sum, item) => sum + item.price, 0);
};

const Wishlist = mongoose.model("Wishlist", WishlistSchema);

module.exports = Wishlist;
