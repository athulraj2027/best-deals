const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Address = require("../../models/Address");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Coupon = require("../../models/Coupon");
const Razorpay = require("razorpay");

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

    return res.status(200).render("userPages/checkoutPage", {
      cart,
      addresses,
      items,
      coupons: validCoupons,
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

exports.placeOrderController = async (req, res) => {
  try {
    // console.log("Request body : ", req.body);
    const userId = req.session.userId;
    const cartId = req.params.id;
    console.log(req.body);
    const { amount, paymentMethod, items, addressId } = req.body;
    console.log(paymentMethod);

    // if ( !amount ||!paymentMethod || !items || !addressId) {
    //   return res.status(400).json({
    //     status: "error",
    //     title: "Error",
    //     message: "Credentials not complete",
    //   });
    // }
    if (!cartId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "CartId not found",
      });
    }
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "UserId not found",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "paymentMethodInput not added",
      });
    }

    if (!items) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Items not added",
      });
    }

    if (!addressId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "AddressId not found",
      });
    }
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart found ",
      });
    }

    const orderTotalPrice =
      cart.updatedTotal === 0 ? cart.total : cart.updatedTotal;
    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      variantId: item.variantId,
      name: item.name,
      color: item.color,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    }));

    const order = new Order({
      userId,
      amount,
      grantTotal: orderTotalPrice,
      originalPrice: cart.total,
      paymentMethod,
      items: orderItems,
      addressId,
      status: "pending",
    });
    console.log("amount : ", amount);

    if (!order) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Order failed",
      });
    }
    if (order.paymentMethod === "razorpay") {
      console.log(order);
      const razorpayOrderId = await generateRazorpay(
        order._id.toString(),
        order.grantTotal
      );
      order.razorpayOrderId = razorpayOrderId;
      await order.save();
      console.log("saving order");

      return res.render("userPages/payment", {
        orderId: order._id,
        order,
        razorpayOrderId,
        key: "rzp_test_tTcfsqC1bRVLSi",
      });
    }
    for (const item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "variants._id": item.variantId,
        },
        {
          $inc: { "variants.$.quantity": -item.quantity },
        },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(400).json({
          status: "error",
          title: "Error",
          message: `Error updating stock for product ${item.name}`,
        });
      }
    }

    await order.save();

    cart.items = [];
    cart.updatedTotal = 0;

    await cart.save();
    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Order placed successfully",
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

exports.applyCouponController = async (req, res) => {
  try {
    const { cartId, code } = req.body;
    console.log(typeof code);
    console.log("apply coupon working");
    if (!code || !cartId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Coupon code and cart ID are required",
      });
    }

    const cart = await Cart.findById(cartId);
    const coupon = await Coupon.findOne({
      code: code,
      active: true,
    });
    console.log("coupon : ", coupon);
    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Invalid coupon code",
      });
    }

    if (coupon.discountType === "fixed") {
      cart.updatedTotal = cart.total - coupon.discountValue;
    } else {
      cart.updatedTotal = ((100 - coupon.discountValue) / 100) * cart.total;
    }

    coupon.usageCount--;
    cart.appliedCoupon = coupon._id;

    await coupon.save();
    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Coupon applied to order",
      cart,
      coupon,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error ",
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
