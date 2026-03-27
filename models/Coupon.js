const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchase: {
      type: Number,
      default: 0,
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
    usageLimit: {
      type: Number,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Virtual property to determine coupon status
couponSchema.virtual("status").get(function () {
  const now = new Date();

  if (!this.active) return "inactive";
  if (now > this.expiryDate) return "expired";
  if (now < this.startDate) return "upcoming";
  return "active";
});

// Index for faster searches
// couponSchema.index({ code: 1 });
couponSchema.index({ active: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ createdAt: 1 });

module.exports = mongoose.model("Coupon", couponSchema);
