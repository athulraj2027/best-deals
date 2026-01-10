const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const User = require("../../models/User");

exports.getCartPage = async (req, res) => {
  const userId = req.session.userId;
  try {
    if (!userId) {
      return res.status(400).redirect("/signin");
    }
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = { userId, items: [] };
    }

    await cart.save();
    return res.status(200).render("userPages/cartPage", { cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.updateQuantityController = async (req, res) => {
  try {
    const itemId = req.params.id;
    if (!itemId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No item ID found",
      });
    }

    const { productId, variantId, quantity, action } = req.body;
    if (!productId || !variantId || !action) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Credentials missing in the request body",
      });
    }

    // Find Product & Variant
    const product = await Product.findById(productId);
    if (!product || !product.status || !product.inStock) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Product is unavailable",
      });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Variant not found",
      });
    }

    const cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }

    const cartItem = cart.items.find((item) => {
      return (
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );
    });

    if (!cartItem) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart item not found",
      });
    }

    // Determine new quantity
    let newQuantity;
    if (action === "increase") {
      newQuantity = Math.min(cartItem.quantity + 1, 5);
    } else if (action === "decrease") {
      newQuantity = Math.max(cartItem.quantity - 1, 1);
    } else {
      newQuantity = Math.max(1, Math.min(parseInt(quantity), 5));
    }

    // Check available stock
    if (newQuantity > variant.quantity) {
      return res.status(400).json({
        status: "error",
        title: "Stock Error",
        message: `Only ${variant.quantity} left in stock`,
      });
    }

    // Update quantity and totals
    const difference = newQuantity - cartItem.quantity;
    cartItem.quantity = newQuantity;
    cart.subtotal += difference * cartItem.price;

    cart.tax = Number((0.1 * cart.subtotal).toFixed(2));
    cart.total = (cart.tax + cart.subtotal).toFixed(2);

    await cart.save();

    // For AJAX requests
    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.status(200).json({
        status: "success",
        title: "Success",
        message: "Quantity updated successfully",
        subtotal: cart.subtotal,
        itemPrice: cartItem.price * cartItem.quantity,
        quantity: cartItem.quantity,
      });
    }

    return res.status(200).redirect("/cart");
  } catch (err) {
    console.error(err);
    const message = "Server error";

    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.status(500).json({ status: "error", title: "Error", message });
    }

    return res.status(500).json({ status: "error", title: "Error", message });
  }
};

exports.deleteItemController = async (req, res) => {
  try {
    const itemId = req.params.id;
    const { productId, variantId } = req.body;
    if (!itemId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No item ID found",
      });
    }

    if (!productId || !variantId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Credentials not found",
      });
    }
    const cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }
    const cartItem = cart.items.find((item) => {
      return (
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );
    });
    if (!cartItem) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart item not found",
      });
    }
    const itemQuantity = cartItem.quantity;
    cart.items = cart.items.filter((item) => {
      return !(
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );
    });

    // await cart.calculateSubtotal();
    cart.subtotal -= cartItem.price * itemQuantity;
    await cart.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Item removed from cart",
    });
  } catch (err) {
    console.error("Error in deleting item", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
};

exports.clearCartController = async (req, res) => {
  console.log(req.params.id);
  try {
    const cartId = req.params.id;
    console.log("Cart Id : ", cartId);

    if (!cartId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart Id found",
      });
    }

    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }

    cart.items = [];
    cart.subtotal = 0;
    cart.tax = 0;
    cart.walletApplied = false;

    await cart.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Cart cleared successfully",
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
