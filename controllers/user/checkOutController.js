const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Address = require("../../models/Address");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Coupon = require("../../models/Coupon");
const Razorpay = require("razorpay");
const Offer = require("../../models/Offer");

// helper function
// return new Promise((resolve, reject) => {
var instance = new Razorpay({
  key_id: "rzp_test_tTcfsqC1bRVLSi",
  key_secret: "GmoWj3uV9ZKKDB9T5hJwU6Sn",
});
// });
async function generateRazorpay(orderId, total) {
  var options = {
    amount: Math.round(parseFloat(total) * 100), // Razorpay expects amount in paise (multiply by 100)
    currency: "INR",
    receipt: orderId,
  };

  try {
    const order = await instance.orders.create(options);
    return order.id; // Return Razorpay order ID
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create Razorpay order");
  }
}

exports.getCheckoutPage = async (req, res) => {
  try {
    // console.log(req.params.id);
    const cartId = req.params.id;
    if (!cartId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart Id not found",
      });
    }

    const cart = await Cart.findOne({ _id: cartId }).populate(
      "items.productId"
    );
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart found",
      });
    }

    const items = cart.items;
    const productIds = cart.items.map((item) => item.productId._id);
    const categoryIds = cart.items.map((item) => {
      return item.productId.category || item.productId.categoryId;
    });

    const cartTotal = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    const currentDate = new Date();
    const validCoupons = await Coupon.find({
      $or: [
        { appliedProducts: { $in: productIds } },
        { appliedCategories: { $in: categoryIds } },
      ],
      active: true,
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate },
    }).lean();

    // const finalCoupons = validCoupons.filter(
    //   (coupon) => cartTotal >= (coupon.minPurchase || 0)
    // );

    // console.log("These are the items in the cart: ", items);
    // console.log("Coupons available: ", validCoupons);

    const addresses = await Address.find({ userId: req.session.userId });
    if (!addresses) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Couldn't fetch addresses",
      });
    }

    const user = await User.findById(req.session.userId);
    const walletBalance = user.wallet;
    const razorpayKey = process.env.RAZORPAY_KEY_ID;

    return res.status(200).render("userPages/checkoutPage", {
      cart,
      addresses,
      items,
      coupons: validCoupons,
      walletBalance,
      razorpayKey,
      newTotal: cart.total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
};

exports.checkoutController = async (req, res) => {
  try {
    const {
      cartId,
      addressId,
      paymentMethod,
      walletUsed,
      walletAmount,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;
    const userId = req.user._id;

    if (!cartId || !addressId || !paymentMethod) {
      return res.status(400).json({
        status: "error",
        message: "Cart ID, address ID, and payment method are required",
      });
    }

    let cart = await Cart.findById(cartId).populate("items.productId");
    if (!cart) {
      return res
        .status(404)
        .json({ status: "error", message: "Cart not found" });
    }
    if (cart.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Cart belongs to another user",
      });
    }

    const address = await Address.findById(addressId);
    if (!address || address.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({
          status: "error",
          message: "Invalid delivery address selected",
        });
    }

    if (
      paymentMethod === "razorpay" &&
      (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature)
    ) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Razorpay payment details are required",
        });
    }

    // --- 1️⃣ Get all active offers once
    const now = new Date();
    const activeOffers = await Offer.find({
      active: true,
      status: "active",
      expiryDate: { $gte: now },
    });

    // --- 2️⃣ Process each cart item with best offer calculation
    let finalTotal = 0;
    const orderItems = [];

    for (let cartItem of cart.items) {
      const product = cartItem.productId;
      if (!product) continue;

      // Find applicable offers for this product
      const applicableOffers = activeOffers.filter((offer) => {
        return (
          offer.appliedProducts.some((id) => id.equals(product._id)) ||
          offer.appliedCategories.some((id) => id.equals(product.category))
        );
      });

      // Calculate best offer
      let bestOffer = null;
      let maxSavings = 0;
      let originalPrice = cartItem.price;

      if (applicableOffers.length > 0) {
        applicableOffers.forEach((offer) => {
          let savings = 0;
          if (offer.offerType === "percentage") {
            savings = (originalPrice * offer.offerValue) / 100;
          } else if (offer.offerType === "fixed") {
            savings = offer.offerValue;
          }
          if (savings > maxSavings) {
            maxSavings = savings;
            bestOffer = offer;
          }
        });
      }

      let finalPrice = originalPrice;
      if (bestOffer) {
        if (bestOffer.offerType === "percentage") {
          finalPrice = Math.max(
            originalPrice - (originalPrice * bestOffer.offerValue) / 100,
            0
          );
        } else {
          finalPrice = Math.max(originalPrice - bestOffer.offerValue, 0);
        }
      }

      finalTotal += finalPrice * cartItem.quantity;

      orderItems.push({
        productId: product._id,
        variantId: cartItem.variantId,
        name: cartItem.name,
        color: cartItem.color,
        size: cartItem.size,
        price: finalPrice,
        quantity: cartItem.quantity,
        image: cartItem.image,
        bestOffer: bestOffer
          ? {
              id: bestOffer._id,
              name: bestOffer.name,
              type: bestOffer.offerType,
              value: bestOffer.offerValue,
              savings: maxSavings,
            }
          : null,
      });
    }

    // --- 3️⃣ Wallet deduction logic
    const user = await User.findById(userId);
    let walletDeducted = 0;
    if (walletUsed && walletAmount > 0) {
      const usableAmount = Math.min(walletAmount, user.wallet, finalTotal);
      if (usableAmount > 0) {
        user.wallet -= usableAmount;
        user.walletTransactions.push({
          type: "debit",
          amount: usableAmount,
          description: `Wallet used for Order`,
        });
        await user.save();
        finalTotal -= usableAmount;
        walletDeducted = usableAmount;
      }
    }

    const isFreeOrder = finalTotal === 0;
    const isCOD = paymentMethod === "cod";
    const paymentStatus = isFreeOrder || !isCOD ? "paid" : "pending";

    const order = new Order({
      userId,
      status: paymentStatus,
      grantTotal: parseFloat(finalTotal.toFixed(2)),
      paymentMethod,
      addressId,
      items: orderItems,
      payment_status: paymentStatus,
    });

    if (walletDeducted > 0) {
      order.walletUsed = true;
      order.walletAmount = parseFloat(walletDeducted.toFixed(2));
    }

    if (paymentMethod === "razorpay") {
      order.razorpay = {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
        amount: finalTotal * 100,
        paymentDate: new Date(),
      };
    }

    // --- 4️⃣ Reduce stock
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      const variant = product.variants.id(item.variantId);
      if (!variant || variant.quantity < item.quantity) continue;
      variant.quantity -= item.quantity;
      await product.save();
    }

    await order.save();
    await Cart.findByIdAndDelete(cartId);

    return res.status(200).json({
      status: "success",
      message: "Order placed successfully",
      orderId: order._id,
    });
  } catch (err) {
    console.error("Error during checkout:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred during checkout",
    });
  }
};

exports.applyCouponController = async (req, res) => {
  try {
    const { cartId, couponCode } = req.body;
    console.log("Apply coupon request:", req.body);

    if (!couponCode || !cartId) {
      console.log("no cartid,couponcode");
      return res.status(400).json({
        status: "error",
        message: "Coupon code and cart ID are required",
      });
    }

    // Find cart and coupon
    const cart = await Cart.findById(cartId);
    if (!cart) {
      console.log("no cart");
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      });
    }

    const coupon = await Coupon.findOne({
      code: couponCode,
      active: true,
    });

    if (!coupon) {
      console.log("no coupon");
      return res.status(404).json({
        status: "error",
        message: "Invalid coupon code",
      });
    }

    // Validate coupon conditions
    const today = new Date();

    // Check if expired
    if (coupon.expiryDate && new Date(coupon.expiryDate) < today) {
      console.log("expiry");
      return res.status(400).json({
        status: "error",
        message: "This coupon has expired",
      });
    }

    // Check if minimum purchase requirement is met
    if (coupon.minPurchase && cart.total < coupon.minPurchase) {
      console.log(" minimum purchase");
      return res.status(400).json({
        status: "error",
        message: `This coupon requires a minimum purchase of $${coupon.minPurchase.toFixed(2)}`,
      });
    }

    // Check if coupon has remaining usage count
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      // Only check usage count if there's a limit set
      if (coupon.usageCount <= 0) {
        console.log("usagecount error");
        return res.status(400).json({
          status: "error",
          message: "This coupon has reached its usage limit",
        });
      }
    }

    // Check if cart already has this coupon applied
    if (
      cart.appliedCoupon &&
      cart.appliedCoupon.toString() === coupon._id.toString()
    ) {
      console.log(" already appliet to cart");
      return res.status(400).json({
        status: "error",
        message: "This coupon is already applied to your cart",
      });
    }

    // Calculate discount amount
    let discountAmount = 0;

    // Save original total if not already saved
    if (!cart.originalTotal) {
      cart.originalTotal = cart.total;
    }

    if (coupon.discountType === "fixed") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discountAmount = (coupon.discountValue / 100) * cart.originalTotal;
    }

    // Calculate new total (apply discount to original total)
    let newTotal = cart.originalTotal - discountAmount;

    // Handle wallet application if wallet is already applied
    if (cart.walletApplied && cart.walletAmount > 0) {
      newTotal = Math.max(0, newTotal - cart.walletAmount);
    }

    // Ensure total is never negative
    newTotal = Math.max(0, newTotal);

    // Update cart with coupon details
    cart.discountAmount = discountAmount;
    cart.appliedCoupon = coupon._id;
    cart.total = newTotal;
    cart.updatedTotal = newTotal; // Update the updatedTotal field as well

    // Update coupon usage count
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      // Only decrement if there's a usage limit
      coupon.usageCount = Math.max(0, (coupon.usageCount || 0) - 1);
    }

    // Save changes
    await Promise.all([coupon.save(), cart.save()]);

    return res.status(200).json({
      status: "success",
      message: "Coupon applied successfully!",
      discount: parseFloat(discountAmount.toFixed(2)), // ← number
      newTotal: parseFloat(newTotal.toFixed(2)),
    });
  } catch (err) {
    console.error("Error applying coupon:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred while applying coupon",
    });
  }
};

exports.addDeliveryAddressController = async (req, res) => {
  const { streetAddress, city, state, zipCode, country, phoneNumber } =
    req.body;
  const userId = req.session.userId;
  try {
    if (!streetAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Add street address",
      });
    }
    if (!city) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Add city",
      });
    }

    if (!state) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Add state",
      });
    }
    if (!zipCode) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Add zipcode",
      });
    }
    if (!country) {
      return res.status(400).jsosn({
        status: "error",
        title: "Error",
        message: "Add country",
      });
    }
    if (!phoneNumber) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Add phone number",
      });
    }

    const stateRegex = /^[A-Za-z\s]{2,50}$/;
    const countryRegex = /^[A-Za-z\s]{2,60}$/;
    const cityRegex = /^[A-Za-z\s]{2,50}$/;
    const zipCodeRegex = /^\d{6}$/;
    const streetAddressRegex = /^[A-Za-z0-9\s,.#-]{5,100}$/;

    if (!stateRegex.test(state)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for state name",
      });
    }
    if (!countryRegex.test(country)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for country name",
      });
    }
    if (!cityRegex.test(city)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for city name",
      });
    }
    if (!zipCodeRegex.test(zipCode)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for Zip Code",
      });
    }

    if (!streetAddressRegex.test(streetAddress)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for street address",
      });
    }
    console.log("saving the new address");

    const newAddress = new Address({
      userId,
      type: "Other",
      streetAddress,
      city,
      state,
      zipCode,
      country,
    });

    await newAddress.save();

    if (!newAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found or something wrong in adding address",
      });
    }

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Address created successfully",
    });
  } catch (err) {
    console.log("Error in adding delivery address : ", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
};
