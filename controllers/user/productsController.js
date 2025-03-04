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
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
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
    const existingItem = await cart.items.find(
      (item) => item.variantId.toString() === cartItem.variantId
    );

    if (existingItem) {
      existingItem.quantity += cartItem.quantity;
    } else {
      cart.items.push(cartItem);
    }

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
