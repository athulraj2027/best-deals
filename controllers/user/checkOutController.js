const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Address = require("../../models/Address");
const Order = require("../../models/Order");
const Product = require("../../models/Product");

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
    // console.log(cartId);

    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart found",
      });
    }

    const items = cart.items;
    console.log("These are the items in the cart : ", items);

    const addresses = await Address.find({ userId: req.session.userId });
    if (!addresses) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Couldn't fetch addresses",
      });
    }

    return res
      .status(200)
      .render("userPages/checkoutPage", { cart, addresses, items });
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

    const order = new Order({
      userId,
      amount,
      cartId,
      amount,
      paymentMethod,
      items,
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

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart found ",
      });
    }
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
