const mongoose = require("mongoose");
const transactionSchema = require("./WalletTransaction");
// Customer Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      default: undefined,
      sparse: true,
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
      required: function () {
        return !this.googleId;
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      // required: true,
    },
    address: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    wallet: { type: Number, default: 0, min: 0 },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        return generateReferralCode(); // Call the function below
      },
    },
    walletTransactions: [transactionSchema],
  },
  {
    timestamps: true,
  }
);

function generateReferralCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// Customer model
module.exports = mongoose.model("User", userSchema);
