const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Address = require("../../models/Address");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Coupon = require("../../models/Coupon");

exports.getCheckoutPage = async (req, res) => {
  try {
    console.log(req.params.id);
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

    console.log("These are the items in the cart: ", items);
    console.log("Coupons available: ", validCoupons);

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
    console.log("Request body : ", req.body);
    const userId = req.session.userId;
    const cartId = req.params.id;

    const { amount, paymentMethod, items, addressId } = req.body;
    console.log(items);

    if (!amount || !paymentMethod || !items || !addressId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Credentials not complete",
      });
    }
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
    if (!amount) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Amount not added",
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
      amount,
      grantTotal: cart.total,
      paymentMethod,
      items: orderItems,
      addressId,
      status: "pending",
    });

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

    if (!order) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Order failed",
      });
    }

    await order.save();

    cart.items = [];

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
    console.log('apply coupon working')
    if (!code || !cartId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Coupon code and cart ID are required",
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Invalid coupon code",
      });
    }

    coupon.usedCount += 1;
    await coupon.save();

    const updatedCart = await Cart.findByIdAndUpdate(
      cartId,
      {
        appliedCoupon: coupon._id,
      },
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Coupon applied to order",
      cart: updatedCart,
      coupon
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
