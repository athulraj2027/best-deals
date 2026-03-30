const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const User = require("../../models/User");
const {
  determineBestOffer,
} = require("../../services/offers/determineBestOffer");

async function validateCart(cart) {
  let validItems = [];
  let removedItems = [];
  let subtotal = 0;

  for (let item of cart.items) {
    const product = await Product.findById(item.productId).populate("category");

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
      item.quantity = variant.quantity;
    }

    const bestOffer = await determineBestOffer(product, variant.price);

    item.price = bestOffer ? bestOffer.discounted_price : variant.price;

    subtotal += item.price * item.quantity;

    validItems.push(item);
  }

  cart.items = validItems;
  cart.subtotal = subtotal;
  cart.tax = Number((subtotal * 0.1).toFixed(2));
  cart.total = Number((cart.subtotal + cart.tax).toFixed(2));

  return { cart, removedItems };
}

exports.getCartPage = async (req, res) => {
  const userId = req.session.userId;

  try {
    if (!userId) {
      return res.redirect("/signin");
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = { userId, items: [] };
      return res.render("userPages/cartPage", { cart, removedItems: [] });
    }

    let subtotal = 0;
    let validItems = [];
    let removedItems = [];

    for (let item of cart.items) {
      const product = await Product.findById(item.productId).populate(
        "category",
      );

      if (!product || !product.status || !product.inStock) {
        removedItems.push(item.name);
        continue;
      }

      // ❌ category unlisted
      if (!product.category || product.category.status !== "listed") {
        removedItems.push(item.name + " (category unavailable)");
        continue;
      }
      const variant = product.variants.id(item.variantId);

      if (!variant || variant.quantity <= 0) {
        removedItems.push(item.name);
        continue;
      }

      const bestOffer = await determineBestOffer(product, variant.price);

      let finalPrice = variant.price;
      if (bestOffer) {
        finalPrice = bestOffer.discounted_price;
      }

      item.price = finalPrice;
      item.offer = bestOffer ? bestOffer.name : null;

      if (item.quantity > variant.quantity) {
        item.quantity = variant.quantity;
      }
      subtotal += finalPrice * item.quantity;

      validItems.push(item);
    }

    cart.items = validItems;
    cart.markModified("items");

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.tax = Number((cart.subtotal * 0.1).toFixed(2));
    cart.total = Number((cart.subtotal + cart.tax).toFixed(2));
    cart.updatedTotal = cart.total - cart.discountAmount - cart.walletAmount;

    await cart.save();

    return res.render("userPages/cartPage", {
      cart,
      removedItems,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
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
        message: "Credentials missing",
      });
    }

    /* ---------------- PRODUCT & VARIANT ---------------- */

    const product = await Product.findById(productId).populate("category");

    if (!product || !product.status || !product.inStock) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Product unavailable",
      });
    }

    if (!product.category || product.category.status !== "listed") {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Category unavailable",
      });
    }

    const variant = product.variants.id(variantId);
    if (!variant || variant.quantity <= 0) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Out of stock",
      });
    }

    /* ---------------- CART ---------------- */

    const cart = await Cart.findOne({
      userId: req.session.userId,
    });

    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }

    const cartItem = cart.items.find(
      (item) =>
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId,
    );

    if (!cartItem) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart item not found",
      });
    }

    /* ---------------- NEW QUANTITY ---------------- */

    let newQuantity;

    if (action === "increase") {
      newQuantity = Math.max(1, Math.min(parseInt(quantity), variant.quantity));
    } else if (action === "decrease") {
      newQuantity = Math.max(cartItem.quantity - 1, 1);
    } else {
      newQuantity = Math.max(1, Math.min(parseInt(quantity), variant.quantity));
    }

    if (newQuantity > variant.quantity) {
      return res.status(400).json({
        status: "error",
        title: "Stock Error",
        message: `Only ${variant.quantity} left`,
      });
    }

    /* ---------------- APPLY OFFER ---------------- */

    const bestOffer = await determineBestOffer(product, variant.price);

    let finalPrice = variant.price;

    if (bestOffer) {
      finalPrice = bestOffer.discounted_price;
    }

    cartItem.price = finalPrice;
    cartItem.offer = bestOffer ? bestOffer.name : null;

    /* ---------------- UPDATE CART ---------------- */

    cartItem.quantity = newQuantity;

    // Recalculate subtotal safely
    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    cart.tax = Number((cart.subtotal * 0.1).toFixed(2));

    cart.total = Number((cart.subtotal + cart.tax).toFixed(2));
    cart.updatedTotal = Math.max(
      0,
      cart.total - (cart.discountAmount || 0) - (cart.walletAmount || 0),
    );

    await cart.save();

    /* ---------------- AJAX RESPONSE ---------------- */

    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.status(200).json({
        status: "success",
        title: "Success",
        message: "Quantity updated",
        subtotal: cart.subtotal,
        itemPrice: cartItem.price * cartItem.quantity,
        quantity: cartItem.quantity,
      });
    }

    return res.redirect("/cart");
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
    console.log("item deleting : ", req.body);

    if (!itemId || !productId || !variantId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid request",
      });
    }

    const cart = await Cart.findOne({
      userId: req.session.userId,
    });

    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }

    const cartItem = cart.items.find(
      (item) =>
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId,
    );

    if (!cartItem) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart item not found",
      });
    }

    /* -------- REMOVE ITEM -------- */

    cart.items = cart.items.filter(
      (item) =>
        !(
          item._id.toString() === itemId &&
          item.productId.toString() === productId &&
          item.variantId.toString() === variantId
        ),
    );

    /* -------- RECALCULATE TOTALS -------- */

    cart.subtotal = cart.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    cart.tax = Number((cart.subtotal * 0.1).toFixed(2));

    cart.total = Number((cart.subtotal + cart.tax).toFixed(2));
    cart.updatedTotal = Math.max(
      0,
      cart.total - (cart.discountAmount || 0) - (cart.walletAmount || 0),
    );

    await cart.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Item removed",
    });
  } catch (err) {
    console.error("Delete error:", err);
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

    const cart = await Cart.findOne({
      _id: cartId,
      userId: req.session.userId,
    });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart not found",
      });
    }
    cart.items = [];
    if (cart.items.length === 0) {
      cart.subtotal = 0;
      cart.tax = 0;
      cart.total = 0;
      cart.updatedTotal = 0;
    }

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
