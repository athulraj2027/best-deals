const mongoose = require("mongoose");
const variantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  color: {
    type: String,
    default: null,
    required: true,
  },
  size: {
    type: String,
    enum: ["Compact", ""],
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0.01,
    default: 0.01,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  status: {
    type: Boolean,
    required: true,
    default: true,
  },
  images: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model("Variant", variantSchema);
