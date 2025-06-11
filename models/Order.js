const mongoose = require("mongoose");
const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "delivered",
      "cancelled",
      "paid",
      "return requested",
      "return accepted",
      "returned",
    ],
    default: "pending",
  },
  grantTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  payment_status: {
    type: String,
    enum: ["pending", "paid", "refunded", "failed"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  items: [OrderItemSchema],
  razorpay: {
    orderId: {
      type: String,
      // This stores the Razorpay order ID returned when creating an order
    },
    paymentId: {
      type: String,
      // This stores the Razorpay payment ID after successful payment
    },
    signature: {
      type: String,
      // This stores the Razorpay signature for payment verification
    },
    amount: {
      type: Number,
      // Amount in smallest currency unit (e.g., paise for INR, cents for USD)
    },
    currency: {
      type: String,
      default: "INR",
    },
    receipt: {
      type: String,
      // Optional: Razorpay receipt ID (could be your internal order ID)
    },
    paymentDate: {
      type: Date,
    },
  },
  // originalPrice: { type: Number, required: true },
});

module.exports = mongoose.model("Order", orderSchema);
