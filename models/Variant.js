const mongoose = require("mongoose");
const variantSchema = new mongoose.Schema({
  color: { type: String, default: null },
  size: { type: String, default: null },
  price: { type: String, required: true },
  stock: { type: Number, default: 0 },
  images: { type: Array },
});

module.exports = mongoose.model("Variant", variantSchema);
