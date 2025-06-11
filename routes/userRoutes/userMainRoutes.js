const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");
const Cart = require("../../models/Cart");

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

const secret_key = "1234567890";

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
  console.log("thank you page rendering");
  const { orderId } = req.query; // Changed from req.params to req.query since it's coming from a query string

  try {
    // Handle case when no orderId is provided
    if (!orderId) {
      console.log("No order ID provided");
      return res.render("userPages/thankYouPage", {
        order: null,
        error: "Order information not available",
      });
    }

    const order = await Order.findById(orderId)
      .populate("items.productId")
      .populate("addressId");

    if (!order) {
      console.log(`Order not found with ID: ${orderId}`);
      return res.render("userPages/thankYouPage", {
        order: null,
        error: "Order not found",
      });
    }

    console.log(`Order found: ${order._id}`);

    // Render the thank you page with the order details
    return res.render("userPages/thankYouPage", {
      order,
      error: null,
    });
  } catch (error) {
    console.error("Error rendering thank you page:", error);
    return res.render("userPages/thankYouPage", {
      order: null,
      error: "Failed to retrieve your order information",
    });
  }
});

//
// Razorpay credentials
const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID || "rzp_test_tTcfsqC1bRVLSi";
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || "GmoWj3uV9ZKKDB9T5hJwU6Sn";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * @route   POST /order/create-razorpay
 * @desc    Create a new Razorpay order
 * @access  Private (requires authentication)
 */
router.post("/order/create-razorpay", async (req, res) => {
  try {
    console.log("RAZORPAY KEY:", process.env.RAZORPAY_KEY_ID); // should print your key

    const { cartId, amount, addressId } = req.body;
    const userId = req.user?._id || req.session?.user?.id;

    // Validate required fields
    if (!cartId || !amount || !addressId) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: cartId, amount, or addressId",
      });
    }

    // Fetch cart
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    // Create options for Razorpay order
    const options = {
      amount: amount * 100, // Converting to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
      notes: {
        cartId: cartId,
        userId: userId?.toString(),
        addressId: addressId,
      },
    };

    // Create Razorpay order
    const response = await razorpay.orders.create(options);
    console.log("Response of order creation:", response);

    // Create pending order in database
    const cartItems = cart.items || [];
    const pendingOrder = new Order({
      userId,
      items: cartItems,
      addressId,
      paymentMethod: "razorpay",
      payment_status: "pending",
      status: "pending",
      grantTotal: cart.total, // ✅ this should exist in cart
      razorpay: {
        orderId: response.id, // ✅ this is the field you're querying later
        amount: response.amount,
        currency: response.currency,
        receipt: response.receipt,
      },
    });

    await pendingOrder.save();
    console.log("Pending order", pendingOrder);
    const order = await Order.find({ userId: userId });
    console.log("order : ", order);

    // Return order details to client
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

/**
 * @route   POST /verify-payment
 * @desc    Verify Razorpay payment
 * @access  Private
 */
router.post("/verify-payment/:id", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartId,
    } = req.body;

    console.log("Verify payment request body:", req.body);

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
    });

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Update order payment details
    order.payment_status = "paid";
    order.status = "paid";
    order.razorpay.paymentId = razorpay_payment_id;
    order.razorpay.signature = razorpay_signature;

    // Update product inventory
    for (const item of order.items) {
      try {
        // Find product and update the variant quantity
        await Product.updateOne(
          { _id: item.productId, "variants._id": item.variantId },
          { $inc: { "variants.$.quantity": -item.quantity } }
        );
      } catch (err) {
        console.error(
          `Error updating inventory for product ${item.productId}:`,
          err
        );
        // Continue with other products even if one fails
      }
    }

    await order.save();

    // Clear the cart
    if (cartId) {
      await Cart.findByIdAndUpdate(cartId, {
        $set: { items: [], subtotal: 0, tax: 0, shipping: 0, total: 0 },
      });
    }
    console.log("Verified order : ", order);
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

/**
 * @route   POST /order
 * @desc    Create a new Razorpay order (simplified version)
 * @access  Public
 */
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
    console.log("Response of order creation:", response);

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

/**
 * @route   POST /refund
 * @desc    Process refund for a payment
 * @access  Private (Admin only)
 */
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
  console.log("using wallet");
  try {
    const { cartId, walletBalance } = req.body;
    const userId = req.session.userId; // Assuming you have user authentication middleware

    if (!cartId) {
      console.log("no cartid");
      return res.status(400).json({
        status: "error",
        message: "Cart ID is required",
      });
    }

    // Find the cart
    const cart = await Cart.findById(cartId);

    if (!cart) {
      console.log("no cart");
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    // Verify cart belongs to user
    console.log("userId : ", userId);
    console.log("cart.userId: ", cart.userId);
    if (cart.userId.toString() !== userId.toString()) {
      console.log("cart mismatch with user");
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Cart belongs to another user",
      });
    }

    // Get user's actual wallet balance
    const user = await User.findById(userId);
    if (!user) {
      console.log("no user");
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Store original total if not already saved
    if (!cart.originalTotal) {
      console.log("no originaltotal");
      cart.originalTotal = cart.total;
    }

    // Calculate how much wallet balance can be applied
    // Use the smaller of: requested amount, actual wallet balance, or cart total
    const actualWalletBalance = user.wallet;
    const cartTotal = cart.originalTotal;

    // If coupon is applied, use the discounted amount as the base
    let baseAmount = cartTotal;
    if (cart.appliedCoupon && cart.discountAmount) {
      baseAmount = cartTotal - cart.discountAmount;
    }

    const applicableAmount = Math.min(
      parseFloat(walletBalance) || 0,
      actualWalletBalance,
      baseAmount
    );

    if (applicableAmount <= 0) {
      console.log("aplicable amount less than 0");
      return res.status(400).json({
        status: "error",
        message: "No wallet balance available to apply",
      });
    }

    // Calculate new total after applying wallet
    const newTotal = Math.max(0, baseAmount - applicableAmount);

    // Update cart with wallet information
    cart.walletApplied = true;
    cart.walletAmount = applicableAmount;
    cart.total = newTotal;
    cart.updatedTotal = newTotal; // Update the updatedTotal field as well

    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Wallet balance applied successfully",
      walletAmount: applicableAmount.toFixed(2),
      discount: applicableAmount.toFixed(2),
      newTotal: newTotal.toFixed(2),
    });
  } catch (err) {
    console.error("Error applying wallet balance:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred while applying wallet balance",
    });
  }
});

router.route("/remove-wallet").post(async (req, res) => {
  try {
    console.log("removing wallet");
    const { cartId } = req.body;
    const userId = req.user._id; // Assuming you have user authentication middleware

    if (!cartId) {
      return res.status(400).json({
        status: "error",
        message: "Cart ID is required",
      });
    }

    // Find the cart
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    // Verify cart belongs to user
    if (cart.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Cart belongs to another user",
      });
    }

    // Check if wallet is applied
    if (!cart.walletApplied) {
      return res.status(400).json({
        status: "success",
        message: "No wallet balance was applied",
      });
    }

    // Calculate new total - keep any coupon discounts applied
    let newTotal = cart.originalTotal;
    if (cart.appliedCoupon && cart.discountAmount > 0) {
      newTotal -= cart.discountAmount;
    }

    // Update cart
    cart.total = newTotal;
    cart.updatedTotal = newTotal;
    cart.walletApplied = false;
    cart.walletAmount = 0;

    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Wallet balance removed successfully",
      newTotal: newTotal.toFixed(2),
    });
  } catch (err) {
    console.error("Error removing wallet balance:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred while removing wallet balance",
    });
  }
});
router.use("/", homePageRoutes);

module.exports = router;
