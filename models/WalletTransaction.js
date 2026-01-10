// models/User.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: {
    type: String, // 'credit' or 'debit'
    enum: ["credit", "debit"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: String, // "Added from Razorpay", "Order #1234", etc.
  date: {
    type: Date,
    default: Date.now,
  },
});

// Customer model
module.exports = transactionSchema;