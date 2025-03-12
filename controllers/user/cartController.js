const Cart = require("../../models/Cart");
const User = require("../../models/User");

exports.getCartPage = async (req, res) => {
  const userId = req.session.userId;
  try {
    if (!userId) {
      return res.status(400).redirect("/signin");
    }
    const cart = await Cart.findOne({ userId });
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
    if (!productId || !variantId || !quantity || !action) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Credentials missing in the request body",
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
    console.log(cartItem);
    if (!cartItem) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart item not found",
      });
    }

    if (action === "increase") {
      if (cartItem.quantity === 5) {
        return res.status(400).json({
          status: "error",
          title: "Error",
          message: "You have reached maximum limit",
        });
      }
      cartItem.quantity = Math.min(parseInt(cartItem.quantity) + 1, 5);
    } else if (action === "decrease") {
      if (cartItem.quantity === 1) {
        return res.status(400).json({
          status: "error",
          title: "Error",
          message: "You have reached minimum limit",
        });
      }
      cartItem.quantity = Math.max(parseInt(cartItem.quantity) - 1, 1);
    } else {
      // Direct quantity update (if needed)
      cartItem.quantity = Math.max(1, Math.min(parseInt(quantity), 5));
    }
    await cart.calculateSubtotal();
    await cart.save();

    return res.status(200).redirect("/cart");
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
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
    cart.items = cart.items.filter((item) => {
      return !(
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );
    });

    await cart.calculateSubtotal();
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
    const { cartId } = req.params.id;
    // if (!cartId) {
    //   return res.status(400).json({
    //     status: "error",
    //     title: "Error",
    //     message: "Cart Id not found",
    //   });
    // }

    const cart = await Cart.findOne({
      cartId: req.session.cartId,
    });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }

    cart.items = [];
    cart.subtotal = 0;

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
