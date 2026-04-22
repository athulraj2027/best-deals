const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");
const Cart = require("../../models/Cart");
const Coupon = require("../../models/Coupon");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const signInRoutes = require("./signInRoutes");
const signUpRoutes = require("./signUpRoutes");
const verifyOtpRoutes = require("./verifyOtpRoutes");
const productsRoutes = require("./productsRoutes");
const shopRoutes = require("./shopRoutes");
const homePageRoutes = require("./homePageRoutes");
const profileRoutes = require("./profileRoutes");
const forgotPasswordRoutes = require("./forgotPasswordRoutes");
const cartRoutes = require("./cartRoutes");
const wishlistRoutes = require("./wishlistRoutes");
const checkOutRoutes = require("./checkOutRoutes");

const verifyOtpController = require("../../controllers/user/verifyOtpController");
const checkBlockedUserMiddleware = require("../../middlewares/checkBlockedUserMiddleware");
const Razorpay = require("razorpay");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const { generateOrderId } = require("../../config/generate-order");
const { calculateCartTotal } = require("../../services/pricingService");

router.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  next();
});

router.use(checkBlockedUserMiddleware);
router.use("/signin", signInRoutes);
router.use("/signup", signUpRoutes);
router.use("/verify-otp", verifyOtpRoutes);
router.use("/product", productsRoutes);
router.route("/resend-otp").post(verifyOtpController.resendOtp);
router.use("/shop", shopRoutes);
router.use("/forgot-password", forgotPasswordRoutes);
router.use("/profile", profileRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/checkout", checkOutRoutes);

router.route("/logout").post(async (req, res) => {
  console.log("logout working");
  try {
    await User.findByIdAndUpdate(req.session.userId, { isActive: false });
    delete req.session.userId;
    delete req.session.email;
    delete req.session.name;
    res.clearCookie("auth_token");
    res.redirect("/");
  } catch (err) {
    console.error("Error during logout:", err);
    res.status(500).send("Error during logout");
  }
});

// Corrected thank-you route handler
router.get("/thank-you", userGuestMiddleware, async (req, res) => {
  console.log("Thank you page rendering");

  const { orderId } = req.query;

  try {
    if (!orderId) {
      return res.render("userPages/thankYouPage", {
        order: null,
        orderMeta: null,
        itemsSummary: null,
        shippingAddress: null,
        paymentInfo: null,
        couponInfo: null,
        error: "Order information not available",
      });
    }

    // ── Fetch order with all populated refs ──────────────────────────────────
    const order = await Order.findById(orderId)
      .populate("userId", "name email phone") // basic user info
      .populate("addressId") // full address doc
      .populate("items.productId", "name images slug") // product details per item
      .lean(); // plain JS object — faster, easier to manipulate below

    if (!order) {
      return res.render("userPages/thankYouPage", {
        order: null,
        orderMeta: null,
        itemsSummary: null,
        shippingAddress: null,
        paymentInfo: null,
        couponInfo: null,
        error: "Order not found",
      });
    }

    // ── 1. Order meta ─────────────────────────────────────────────────────────
    const orderMeta = {
      id: order._id.toString(),
      orderId: order.orderId, // human-readable order ID
      status: order.status,
      statusLabel: formatStatus(order.status), // e.g. "Return Requested"
      orderDate: order.orderDate,
      orderDateFmt: formatDate(order.orderDate), // "12 Jan 2025, 3:45 PM"
      totalItems: order.items.reduce((s, i) => s + i.quantity, 0),
      grandTotal: order.grandTotal,
      tax: order.tax || 0,
      isDelivered: order.status === "delivered",
      isCancelled: order.status === "cancelled",
      isReturning: ["return_requested", "return_accepted", "returned"].includes(
        order.status,
      ),
    };

    // ── 2. Items summary ──────────────────────────────────────────────────────
    const itemsSummary = order.items.map((item) => ({
      orderItemId: item._id.toString(),
      productId: item.productId?._id?.toString() || item.productId?.toString(),
      productSlug: item.productId?.slug || null,
      name: item.name,
      color: item.color,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
      lineTotal: +(item.price * item.quantity).toFixed(2),
      image: item.image,
      // Extra product-level info if populated
      productImages: item.productId?.images || [],
    }));

    // Subtotal before tax/coupon
    const subtotal = +itemsSummary
      .reduce((s, i) => s + i.lineTotal, 0)
      .toFixed(2);

    // ── 3. Shipping address ───────────────────────────────────────────────────
    const addr = order.addressId || {};
    const shippingAddress = {
      id: addr._id?.toString(),
      type: addr.type || "Other",
      name: addr.name || order.userId?.name || "",
      streetAddress: addr.streetAddress || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zipCode || "",
      country: addr.country || "",
      phoneNumber: addr.phoneNumber || "",
      // Single formatted string for display
      fullAddress: [
        addr.streetAddress,
        addr.city,
        addr.state && addr.zipCode
          ? `${addr.state} ${addr.zipCode}`
          : addr.state || addr.zipCode,
        addr.country,
      ]
        .filter(Boolean)
        .join(", "),
    };

    // ── 4. Payment info ───────────────────────────────────────────────────────
    const isRazorpay = order.paymentMethod === "razorpay";
    const isCOD = order.paymentMethod === "cod";
    const isWallet = order.paymentMethod === "wallet";

    const paymentInfo = {
      method: order.paymentMethod,
      methodLabel: formatPaymentMethod(order.paymentMethod), // "Razorpay", "Cash on Delivery", etc.
      status: order.payment_status,
      statusLabel: formatPaymentStatus(order.payment_status),
      isPaid: order.payment_status === "paid",
      isRefunded: order.payment_status === "refunded",
      isFailed: order.payment_status === "failed",
      isPending: order.payment_status === "pending",
      // Razorpay-specific details (null for COD/wallet)
      razorpay: isRazorpay
        ? {
            orderId: order.razorpay?.orderId || null,
            paymentId: order.razorpay?.paymentId || null,
            signature: order.razorpay?.signature || null,
            amount: order.razorpay?.amount || null, // in paise
            amountINR: order.razorpay?.amount
              ? +(order.razorpay.amount / 100).toFixed(2)
              : null, // converted to ₹
            currency: order.razorpay?.currency || "INR",
            receipt: order.razorpay?.receipt || null,
            paymentDate: order.razorpay?.paymentDate || null,
            paymentDateFmt: order.razorpay?.paymentDate
              ? formatDate(order.razorpay.paymentDate)
              : null,
          }
        : null,
    };

    // ── 5. Coupon info ────────────────────────────────────────────────────────
    const couponInfo = order.coupon?.code
      ? {
          code: order.coupon.code,
          discountAmount: order.coupon.discountAmount || 0,
          // Discount as a percentage of subtotal for display
          discountPct:
            subtotal > 0
              ? +((order.coupon.discountAmount / subtotal) * 100).toFixed(1)
              : 0,
        }
      : null;

    // ── 6. Price breakdown (handy for the view) ───────────────────────────────
    const priceBreakdown = {
      subtotal,
      couponDiscount: couponInfo?.discountAmount || 0,
      tax: order.tax || 0,
      grandTotal: order.grandTotal,
      // Derived: what the user actually saved
      totalSavings: +(couponInfo?.discountAmount || 0).toFixed(2),
    };

    // ── 7. Customer info ──────────────────────────────────────────────────────
    const customerInfo = {
      id: order.userId?._id?.toString(),
      name: order.userId?.name || "Guest",
      email: order.userId?.email || null,
      phone: order.userId?.phone || shippingAddress.phoneNumber || null,
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return res.render("userPages/thankyouPage", {
      order, // raw order doc (for anything not covered below)
      orderMeta, // status, dates, counts
      itemsSummary, // enriched items array
      shippingAddress, // flat address object
      paymentInfo, // payment method + razorpay details
      couponInfo, // coupon code + discount (null if none)
      priceBreakdown, // subtotal / tax / grand total
      customerInfo, // user name / email / phone
      error: null,
    });
  } catch (error) {
    console.error("Error rendering thank you page:", error);
    return res.render("userPages/thankYouPage", {
      order: null,
      orderMeta: null,
      itemsSummary: null,
      shippingAddress: null,
      paymentInfo: null,
      couponInfo: null,
      priceBreakdown: null,
      customerInfo: null,
      error: "Failed to retrieve your order information",
    });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatStatus(status) {
  const map = {
    pending: "Order Placed",
    processing: "Processing",
    paid: "Payment Confirmed",
    delivered: "Delivered",
    cancelled: "Cancelled",
    "return requested": "Return Requested",
    "return accepted": "Return Accepted",
    returned: "Returned",
  };
  return map[status] || status;
}

function formatPaymentMethod(method) {
  const map = {
    cod: "Cash on Delivery",
    razorpay: "Razorpay",
    wallet: "Wallet",
  };
  return map[method] || method;
}

function formatPaymentStatus(status) {
  const map = {
    pending: "Awaiting Payment",
    paid: "Paid",
    refunded: "Refunded",
    failed: "Payment Failed",
  };
  return map[status] || status;
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

router.post("/order/create-razorpay", async (req, res) => {
  try {
    const { addressId, walletUsed, couponCode } = req.body;
    console.log("body for RZ creation : ", req.body);

    const userId = req.user?._id || req.session?.userId;

    const user = await User.findById(userId);

    // Validate required fields
    if (!addressId) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: cartId, amount, or addressId",
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode });

      if (coupon) {
        if (!coupon.active || coupon.expiryDate < new Date()) {
          throw new Error("Coupon expired");
        }
        cart.appliedCoupon = coupon._id;
        await cart.save();
      }

      if (cart.subtotal < coupon.minPurchase) {
        return res.json({
          success: false,
          message: "Minimum purchase not met",
        });
      }
    }

    for (let item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) throw new Error("No product found ");
      const variant = product.variants.id(item.variantId);

      if (!variant || variant.quantity < item.quantity) {
        throw new Error(`${item.name} is out of stock`);
      }

      variant.quantity -= item.quantity;
      await product.save();
    }

    // Calculate pricing
    const pricing = await calculateCartTotal(
      cart,
      user,
      walletUsed,
      "razorpay",
    );

    console.log("pricing : ", pricing);
    // Deduct wallet

    if (pricing.finalTotal > 1000 && paymentMethod === "cod")
      return res
        .status(400)
        .json({ message: "The order cannot be done with cash on delivery" });

    const orderItems = pricing.items.map((item) => ({
      productId: item.cartItem.productId._id,
      variantId: item.cartItem.variantId,
      name: item.cartItem.name,
      color: item.cartItem.color,
      size: item.cartItem.size,
      price: item.cartItem.price,
      quantity: item.cartItem.quantity,
      image: item.cartItem.image,
      paidAmount: item.paidAmount,
      payment_status: "pending",
    }));

    const options = {
      amount: pricing.finalTotal * 100, // Converting to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
      notes: {
        cartId: cart._id,
        userId: userId?.toString(),
        addressId: addressId,
      },
    };

    // Create Razorpay order
    const response = await razorpay.orders.create(options);
    console.log("Response of order creation:", response);

    // Create pending order in database
    const cartItems = cart.items || [];
    const orderId = generateOrderId();
    const pendingOrder = new Order({
      orderId,
      userId,
      items: orderItems,
      addressId,
      paymentMethod: "razorpay",
      payment_status: "pending",
      status: "pending",
      grandTotal: cart.total,
      razorpay: {
        orderId: response.id,
        amount: response.amount,
        currency: response.currency,
        receipt: response.receipt,
      },
    });

    await pendingOrder.save();

    return res.status(200).json({
      status: "success",
      id: response.id,
      currency: response.currency,
      amount: response.amount,
      orderId: pendingOrder._id,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create payment order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartId,
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        status: "error",
        message: "Missing payment verification details",
      });
    }

    // Generate signature for verification
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Verify signature
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        status: "error",
        message: "Invalid payment signature",
      });
    }

    // Find order by Razorpay order ID
    const order = await Order.findOne({
      "razorpay.orderId": razorpay_order_id,
      userId: req.session.userId,
    });

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Update order payment details
    order.grandTotal = order.razorpay.amount / 100;
    order.payment_status = "paid";
    order.status = "processing";
    order.razorpay.paymentId = razorpay_payment_id;
    order.razorpay.signature = razorpay_signature;

    // Update product inventory
    for (const item of order.items) {
      try {
        item.payment_status = "paid";
        // Find product and update the variant quantity
        await Product.updateOne(
          { _id: item.productId, "variants._id": item.variantId },
          { $inc: { "variants.$.quantity": -item.quantity } },
        );
      } catch (err) {
        console.error(
          `Error updating inventory for product ${item.productId}:`,
          err,
        );
      }
    }

    await order.save();

    // Clear the cart
    if (cartId) {
      await Cart.findOneAndUpdate(
        { userId: order.userId },
        { $set: { items: [], subtotal: 0, tax: 0, total: 0 } },
      );
    }
    return res.status(200).json({
      status: "success",
      message: "Payment verified successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.route("/order").post(async (req, res) => {
  console.log("Request body:", req.body);
  const { amount } = req.body;

  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `order_${Date.now()}`,
    payment_capture: 1,
  };

  try {
    const response = await razorpay.orders.create(options);

    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
});

router.post("/refund", async (req, res) => {
  try {
    // Validate the payment ID and amount
    if (!req.body.paymentId || !req.body.amount) {
      return res.status(400).json({
        status: "error",
        message: "Payment ID and refund amount are required",
      });
    }

    const options = {
      payment_id: req.body.paymentId,
      amount: req.body.amount * 100, // Converting to paise
    };

    // Process refund
    const refund = await razorpay.payments.refund(options);
    console.log("Refund processed:", refund);

    // Update order status if order ID is provided
    if (req.body.orderId) {
      await Order.findByIdAndUpdate(req.body.orderId, {
        $set: {
          refundStatus: "refunded",
          "refundDetails.razorpayRefundId": refund.id,
          "refundDetails.amount": refund.amount / 100,
          "refundDetails.status": refund.status,
          "refundDetails.processedAt": new Date(),
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return res.status(400).json({
      status: "error",
      message: "Unable to process refund",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.route("/use-wallet").post(async (req, res) => {
  try {
    const { cartId } = req.body;
    const userId = req.session.userId;

    if (!cartId) {
      return res.status(400).json({
        status: "error",
        message: "Cart ID is required",
      });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    if (cart.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Cart belongs to another user",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const cartTotal = cart.originalTotal ?? cart.total;
    let baseAmount = cartTotal;
    if (cart.appliedCoupon && cart.discountAmount) {
      baseAmount -= cart.discountAmount;
    }

    const walletBalance = user.wallet;
    const applicableAmount = Math.min(walletBalance, baseAmount);

    if (applicableAmount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "No wallet balance available to apply",
      });
    }

    const newTotal = baseAmount - applicableAmount;

    return res.status(200).json({
      status: "success",
      message: "Wallet preview calculated successfully",
      walletAmount: parseFloat(applicableAmount.toFixed(2)),
      newTotal: parseFloat(newTotal.toFixed(2)),
    });
  } catch (err) {
    console.error("Error calculating wallet preview:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred while calculating wallet preview",
    });
  }
});

router.route("/remove-wallet").post(async (req, res) => {
  try {
    console.log("removing wallet preview");
    const { cartId } = req.body;
    const userId = req.session.userId;

    if (!cartId) {
      return res.status(400).json({
        status: "error",
        message: "Cart ID is required",
      });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    if (cart.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Cart belongs to another user",
      });
    }

    // Start with original total (if available)
    const cartTotal = cart.originalTotal ?? cart.total;

    let newTotal = cartTotal;

    // If a coupon is applied, subtract that from originalTotal
    if (cart.appliedCoupon && cart.discountAmount > 0) {
      newTotal = cartTotal - cart.discountAmount;
    }

    return res.status(200).json({
      status: "success",
      message: "Wallet preview removed successfully",
      newTotal: parseFloat(newTotal.toFixed(2)),
    });
  } catch (err) {
    console.error("Error removing wallet preview:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred while removing wallet preview",
    });
  }
});

router.use("/", homePageRoutes);

module.exports = router;
