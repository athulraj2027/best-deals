const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Address = require("../../models/Address");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Coupon = require("../../models/Coupon");
const Razorpay = require("razorpay");
const Offer = require("../../models/Offer");
const {
  determineBestOffer,
} = require("../../services/offers/determineBestOffer");
const { calculateCartTotal } = require("../../services/pricingService");

exports.getCheckoutPage = async (req, res) => {
  try {
    const cartId = req.params.id;

    if (!cartId) {
      return res.status(400).json({
        status: "error",
        message: "Cart Id not found",
      });
    }

    const cart = await Cart.findById(cartId).populate({
      path: "items.productId",
      populate: { path: "category" },
    });

    if (!cart) {
      return res.status(400).json({
        status: "error",
        message: "No cart found",
      });
    }

    let validItems = [];
    let removedItems = [];
    let subtotal = 0;

    for (let item of cart.items) {
      const product = item.productId;

      if (!product || !product.status) {
        removedItems.push(item.name);
        continue;
      }

      if (!product.category || product.category.status !== "listed") {
        removedItems.push(item.name + " (category unavailable)");
        continue;
      }

      const variant = product.variants.id(item.variantId);

      if (!variant || variant.quantity <= 0) {
        removedItems.push(item.name);
        continue;
      }

      if (item.quantity > variant.quantity) {
        item.quantity = variant.quantity; // auto fix
      }

      const bestOffer = await determineBestOffer(product, variant.price);

      let finalPrice = variant.price;
      if (bestOffer) {
        finalPrice = bestOffer.discounted_price;
      }

      item.price = finalPrice;

      subtotal += finalPrice * item.quantity;
      validItems.push(item);
    }

    cart.items = validItems;
    cart.subtotal = subtotal;
    cart.tax = subtotal * 0.1;
    cart.total = cart.subtotal + cart.tax;

    await cart.save();

    // ❌ If cart becomes empty → redirect
    if (cart.items.length === 0) {
      return res.redirect("/cart");
    }

    // ✅ Coupon logic (unchanged)
    const productIds = cart.items.map((item) => item.productId._id);
    const categoryIds = cart.items.map((item) => item.productId.category);

    const currentDate = new Date();

    const validCoupons = await Coupon.find({
      active: true,
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate },
      $or: [
        { appliedProducts: { $in: productIds } },
        { appliedCategories: { $in: categoryIds } },
        {
          $and: [
            { appliedProducts: { $exists: true, $size: 0 } },
            { appliedCategories: { $exists: true, $size: 0 } },
          ],
        },
      ],
    }).lean();

    const addresses = await Address.find({ userId: req.session.userId });
    const user = await User.findById(req.session.userId);

    return res.render("userPages/checkoutPage", {
      cart,
      items: cart.items,
      addresses,
      coupons: validCoupons,
      walletBalance: user.wallet,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      removedItems, // ✅ important for UI
      newTotal: cart.total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.checkoutController = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log("req body ; ", req.body);
    let coupon = null;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const user = await User.findById(userId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const { walletUsed, couponCode, addressId, paymentMethod } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: "Address is required" });
    }

    // Apply coupon
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
      console.log("item : ", item);
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
      paymentMethod,
    );

    console.log("pricing : ", pricing);
    // Deduct wallet

    if (pricing.finalTotal > 1000 && paymentMethod === "cod")
      return res
        .status(400)
        .json({ message: "The order cannot be done with cash on delivery" });

    // return;
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
      payment_status: paymentMethod === "cod" ? "pending" : "pending",
    }));

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(10000 + Math.random() * 90000);
    const orderId = `ORD-${date}-${random}-${Date.now()}`;

    const order = new Order({
      userId: user._id,
      addressId,
      paymentMethod,
      items: orderItems,
      tax: pricing.tax,
      grandTotal: pricing.finalTotal,
      payment_status: paymentMethod === "cod" ? "pending" : "pending",
      status: "pending",
      coupon: couponCode
        ? {
            code: couponCode,
            discountAmount: pricing.couponDiscount,
          }
        : undefined,
      orderId,
    });

    if (pricing.walletDeduction > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        user.wallet -= pricing.walletDeduction;
        user.walletTransactions.push({
          type: "debit",
          amount: pricing.walletDeduction,
          description: `Paid for order id ${order.orderId} `,
        });
        await user.save({ session });
        await order.save({ session });

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
      }
    }

    // Wallet-only payment
    if (pricing.finalTotal === 0) {
      order.payment_status = "paid";
      order.items.forEach((item) => {
        item.payment_status = "paid";
      });
    }

    await order.save();

    if (coupon) {
      coupon.usageCount += 1;
      await coupon.save();
    }

    if (paymentMethod === "cod" || pricing.finalTotal === 0) {
      cart.items = [];
      cart.appliedCoupon = null;
      cart.discountAmount = 0;
      cart.walletApplied = false;
      cart.walletAmount = 0;
      await cart.save();
    }

    return res.json({
      status: "success",
      orderId: order._id,
      redirectUrl: "/order-success",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(500).json({ message: "Checkout failed" });
  }
};

exports.applyCouponController = async (req, res) => {
  console.log("req body for apply coupon :", req.body);
  console.log("req session : ", req.session);
  const { couponCode, cartId } = req.body;
  const cart = await Cart.findById(cartId);
  const user = await User.findById(req.session.userId);

  if (!cart)
    return res.status(400).json({ success: false, message: "Cart not found" });

  const coupon = await Coupon.findOne({ code: couponCode });
  if (!coupon)
    return res
      .status(400)
      .json({ success: false, message: "Coupon not found" });

  if (!coupon.active) {
    return res.json({ success: false, message: "Coupon inactive" });
  }

  if (coupon.startDate > new Date()) {
    return res.json({ success: false, message: "Coupon not started" });
  }

  if (cart.subtotal < coupon.minPurchase) {
    return res.json({ success: false, message: "Minimum purchase not met" });
  }
  if (coupon.expiryDate < new Date()) {
    return res.json({ success: false, message: "Coupon expired" });
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return res.json({ success: false, message: "Coupon limit reached" });
  }
  cart.appliedCoupon = coupon._id;
  await cart.save();

  const pricing = await calculateCartTotal(cart, user, false);

  console.log("pricing : ", pricing);

  res.json({
    status: "success",
    newTotal: Number(pricing.finalTotal.toFixed(2)),
    couponDiscount: pricing.couponDiscount,
  });
};

exports.removeCouponController = async (req, res) => {
  try {
    const { cartId } = req.body;

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

    // Restore original total
    const user = await User.findById(cart.userId);

    const pricing = await calculateCartTotal(cart, user, false);

    cart.appliedCoupon = undefined;
    cart.discountAmount = 0;
    cart.total = pricing.finalTotal;

    await cart.save();

    // If wallet was applied, subtract wallet amount
    if (cart.walletApplied && cart.walletAmount > 0) {
      newTotal = Math.max(0, newTotal - cart.walletAmount);
    }

    // Remove coupon
    cart.appliedCoupon = undefined;
    cart.discountAmount = 0;
    cart.total = newTotal;
    cart.updatedTotal = newTotal;

    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Coupon removed successfully",
      newTotal: parseFloat(newTotal.toFixed(2)),
    });
  } catch (err) {
    console.error("Error removing coupon:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error occurred while removing coupon",
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
      return res.status(400).json({
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

    await User.findByIdAndUpdate(userId, {
      $push: { address: newAddress._id },
    });

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
