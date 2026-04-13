const mongoose = require("mongoose");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Category = require("../../models/Category");
const Cart = require("../../models/Cart");
const Wishlist = require("../../models/Wishlist");
const statusCodes = require("../../services/statusCodes");
const Offer = require("../../models/Offer");

exports.getProductViewPage = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }

    if (
      !product.status ||
      !product.category ||
      product.category.status !== "listed"
    ) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }

    // STEP 1: Get all active offers
    const now = new Date();
    const offers = await Offer.find({
      active: true,
      status: "active",
      expiryDate: { $gte: now },
      $or: [
        { appliedProducts: product._id },
        { appliedCategories: product.category._id },
      ],
    });
    const applicableOffers = offers;

    let bestOffer = null;
    let maxSavings = 0;

    if (applicableOffers.length > 0) {
      applicableOffers.forEach((offer) => {
        product.variants.forEach((variant) => {
          let savings = 0;

          if (offer.offerType === "percentage") {
            savings = (variant.price * offer.offerValue) / 100;
          } else if (offer.offerType === "fixed") {
            savings = offer.offerValue;
          }

          if (savings > maxSavings) {
            maxSavings = savings;
            bestOffer = {
              offer_id: offer._id,
              name: offer.name,
              discount_type: offer.offerType,
              discount_value: offer.offerValue,
              discounted_price: Math.max(variant.price - savings, 0),
              savings: savings,
              valid_until: offer.expiryDate,
            };
          }
        });
      });
    }

    // STEP 4: Attach discounted price to each variant for frontend
    const productObj = product.toObject();
    productObj.variants = productObj.variants.map((v) => {
      let best = null;
      let maxSavings = 0;

      applicableOffers.forEach((offer) => {
        let savings =
          offer.offerType === "percentage"
            ? (v.price * offer.offerValue) / 100
            : Math.min(offer.offerValue, v.price);

        if (savings > maxSavings) {
          maxSavings = savings;
          best = offer;
        }
      });

      const discountedPrice = Math.max(v.price - maxSavings, 0);

      return { ...v, discountedPrice };
    });
    // STEP 5: Related products
    const relatedProducts = await Product.find({
      category: product.category._id,
      status: true,
      _id: { $ne: product._id },
    }).limit(4);
    return res.status(statusCodes.SUCCESS).render("userPages/productPage", {
      title: product.name,
      product: productObj,
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

    if (!mongoose.Types.ObjectId.isValid(wishlistItem.variantId)) {
      return res.status(400).json({ message: "Invalid variant" });
    }
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, items: [] });
    }

    const product = await Product.findById(wishlistItem.productId);
    if (!product) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Product not found",
      });
    }
    if (!product.status) {
      return res.json({ message: "Product unavailable" });
    }

    const category = await Category.findById(product.category);
    if (!category || category.status === "unlisted") {
      return res.status(400).json({ message: "Product unavailable" });
    }
    const variant = product.variants.id(wishlistItem.variantId);

    if (!variant || variant.quantity <= 0) {
      return res.json({ message: "Out of stock" });
    }
    const existingItem = wishlist.items.find(
      (item) => item.variantId.toString() === wishlistItem.variantId,
    );
    if (existingItem) {
      return res.json({ message: "Already in wishlist" });
    } else {
      wishlist.items.push({
        productId: product._id,
        variantId: variant._id,
        name: product.name,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        image: variant.images?.[0]?.url || "",
      });
    }

    await wishlist.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Added to wishlist",
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
  const { id } = req.params;
  try {
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Not Logged in",
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

    console.log("id : ", id);
    const product = await Product.findOne({ "variants._id": id });
    console.log("product  :", product);
    if (!product) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Product not found",
      });
    }
    const variant = product.variants.id(cartItem.variantId);

    if (!variant || variant.quantity < cartItem.quantity) {
      return res.json({ message: "Insufficient stock" });
    }

    if (!product.status)
      return res.status(400).json({ message: "Product unavailable" });

    const category = await Category.findById(product.category);
    if (!category || category.status === "unlisted") {
      return res.status(400).json({ message: "Product unavailable" });
    }
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const existingItem = cart.items.find(
      (item) => item.variantId.toString() === cartItem.variantId,
    );

    if (existingItem) {
      let newQuantity;
      if (existingItem.quantity + cartItem.quantity > variant.quantity) {
        return res.json({ message: "Stock exceeded" });
      }

      if (existingItem.quantity >= 5)
        return res
          .status(400)
          .json({ message: "Max limit already added to cart" });

      existingItem.quantity += cartItem.quantity;
    } else {
      const price = variant.price;

      cart.items.push({
        ...cartItem,
        price,
      });
    }
    cart.subtotal += cartItem.price * cartItem.quantity;
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
