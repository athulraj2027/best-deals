const Product = require("../../models/Product");
const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Wishlist = require("../../models/Wishlist");
const statusCodes = require("../../services/statusCodes");

exports.getProductViewPage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }

    if (product.status != true) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }
    if (product.category.status != "listed")
      return res.status(500).redirect("/");

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id }, // exclude current product
    }).limit(4);

    res.status(statusCodes.SUCCESS).render("userPages/productPage", {
      title: product.name,
      product,
      relatedProducts,
    });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(statusCodes.SERVER_ERROR).redirect("/");
  }
};

exports.addtoWishlistController = async (req, res) => {
  const userId = req.session.userId;
  const wishlistItem = req.body;
  try {
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please log in to add to wishlist",
      });
    }
    if (!wishlistItem) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Error in request body of wishlist item",
      });
    }
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, items: [] });
    }
    const existingItem = await wishlist.items.find(
      (item) => item.variantId.toString() === wishlistItem.variantId
    );
    if (existingItem) {
      existingItem.quantity += wishlistItem.quantity;
    } else {
      wishlist.items.push(wishlistItem);
    }

    await wishlist.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Added to cart",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong ",
    });
  }
};

exports.addtoCartController = async (req, res) => {
  const userId = req.session.userId;
  const cartItem = req.body;
  try {
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please log in to add to wishlist",
      });
    }
    if (!cartItem) {
      return res.status(404).json({
        status: "error",
        title: "Error",
        message: "Error in request body",
      });
    }
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const existingItem = cart.items.find(
      (item) => item.variantId.toString() === cartItem.variantId
    );

    if (existingItem) {
      existingItem.quantity += cartItem.quantity;
    } else {
      cart.items.push(cartItem);
    }

    cart.subtotal += cartItem.price;
    cart.tax += cartItem.price * 0.1;
    cart.total = cart.subtotal + cart.tax;

    await cart.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Added to cart",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong ",
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    // Extract cart item details from request body
    const {
      productId,
      variantId,
      name,
      color,
      size,
      price,
      quantity = 1,
      image,
    } = req.body;

    // Check if user is authenticated (adjust based on your auth middleware)
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    // Find or create user's cart
    let cart = await Cart.findOne({ userId: req.user._id, status: "active" });

    if (!cart) {
      cart = new Cart({ userId: req.user._id });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.items.push({
        productId,
        variantId,
        name,
        color,
        size,
        price,
        quantity,
        image,
      });
    }

    // Save the cart
    await cart.save();

    // Recalculate totals (using pre-save middleware in the model)
    cart.calculateSubtotal();
    await cart.save();

    res.status(200).json({
      status: "success",
      message: "Item added to cart",
      cartCount: cart.getItemCount(),
      cart: cart,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to add item to cart",
      error: error.message,
    });
  }
};
