const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["Home", "Work", "Other"],
    },
    streetAddress: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Address", addressSchema);
