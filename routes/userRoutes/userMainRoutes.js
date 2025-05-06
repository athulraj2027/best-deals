const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");

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

// router.route("/payment/callback").post(async (req, res) => {
//   const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
//     req.body;
//   const secret = "YOUR_KEY_SECRET";

//   const generatedSignature = crypto
//     .createHmac("sha256", secret)
//     .update(razorpay_order_id + "|" + razorpay_payment_id)
//     .digest("hex");

//   if (generatedSignature === razorpay_signature) {
//     const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
//     if (order) {
//       order.status = "paid";
//       // Update stock based on order items
//       for (const item of order.items) {
//         await Product.updateOne(
//           { _id: item.productId, "variants._id": item.variantId },
//           { $inc: { "variants.$.quantity": -item.quantity } },
//           { new: true }
//         );
//       }
//       await order.save();
//     }
//     res.status(200).send("Payment successful");
//   } else {
//     res.status(400).send("Invalid signature");
//   }
// });

// router.route("/verify-Onlinepayment").post(async (req, res) => {
//   try {
//     console.log('hi');

//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
//       req.body;

//     // Verify the payment signature
//     const generatedSignature = crypto
//       .createHmac("sha256", "GmoWj3uV9ZKKDB9T5hJwU6Sn")
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     const order = await Order.findOne({
//       "paymentDetails.razorpayOrderId": razorpay_order_id,
//     });

//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found." });
//     }

//     if (generatedSignature === razorpay_signature) {
//       // Payment is valid, update order
//       order.status = "paid";
//       // order.paymentDetails.razorpayPaymentId = razorpay_payment_id;
//       // order.paymentDetails.razorpaySignature = razorpay_signature;

//       // Reduce stock
//       for (const item of order.items) {
//         const product = await Product.findById(item.productId);
//         const variant = product.variants.id(item.variantId);

//         if (variant) {
//           variant.quantity -= item.quantity;
//           await product.save();
//         }
//       }

//       // Clear cart
//       await Cart.findOneAndDelete({ user: req.session.user.id });

//       await order.save();

//       return res.status(200).json({
//         success: true,
//         message: "Payment verified and order placed.",
//         redirectUrl: `/orderSuccess/${order.orderId}`,
//       });
//     } else {
//       order.paymentStatus = "Failed";
//       await order.save();

//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed.",
//         redirectUrl: `/userOrders/${order.orderId}`,
//       });
//     }
//   } catch (error) {
//     console.error("Error verifying payment:", error);

//     // Handle unexpected errors (e.g., Razorpay API down)
//     try {
//       const order = await Order.findOne({
//         "paymentDetails.razorpayOrderId": req.body.razorpay_order_id,
//       });

//       if (order) {
//         order.paymentStatus = "Failed";
//         await order.save();

//         return res.status(500).json({
//           success: false,
//           message: "Payment verification failed due to an error.",
//           redirectUrl: `/userOrders/${order.orderId}`,
//         });
//       }
//     } catch (findError) {
//       console.error("Error finding order:", findError);
//     }

//     return res
//       .status(500)
//       .json({ success: false, message: "Payment verification failed." });
//   }
// });

router.route("/order").post(async (req, res) => {
  console.log("Request body : ", req.body);
  const { amount } = req.body;
  const razorpay = new Razorpay({
    key_id: "rzp_test_tTcfsqC1bRVLSi",
    key_secret: "GmoWj3uV9ZKKDB9T5hJwU6Sn",
  });
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `order_${Date.now()}`,
    payment_capture: 1,
  };
  try {
    const response = await razorpay.orders.create(options);
    console.log("response of the order creation : ", response);
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

router.post("/verify-payment/:id", (req, res) => {
  const cartId = req.params.id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const secret_key = "GmoWj3uV9ZKKDB9T5hJwU6Sn";
  console.log("verify payment request body : ", req.body);
  const data = crypto.createHmac("sha256", secret_key);
  data.update(JSON.stringify(req.body));
  const digest = data.digest("hex");
  if (digest === req.headers["x-razorypay-signature"]) {
    console.log("request is legit");

    res.json({ status: "ok" });
  } else {
    res.status(400).send("Invalid signature");
  }
});

router.post("/refund", async (req, res) => {
  try {
    //Verify the payment Id first, then access the Razorpay API.
    const razorpay = new Razorpay({
      key_id: "rzp_test_tTcfsqC1bRVLSi",
      key_secret: "GmoWj3uV9ZKKDB9T5hJwU6Sn",
    });
    const options = {
      payment_id: req.body.paymentId,
      amount: req.body.amount,
    };

    const refund = razorpay.payments.refund(options);

    //We can send the response and store information in a database

    res.send("Successfully refunded");
  } catch (error) {
    console.log(error);
    res.status(400).send("unable to issue a refund");
  }
});

router.use("/", homePageRoutes);

module.exports = router;
