const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const offerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    appliedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "Category",
      },
    ],
    appliedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "Product",
      },
    ],
    offerType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    offerValue: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "upcoming"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
