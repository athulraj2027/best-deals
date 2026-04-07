const Wishlist = require("../../models/Wishlist");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const {
  determineBestOffer,
} = require("../../services/offers/determineBestOffer");

exports.getWishlistPage = async (req, res) => {
  const userId = req.session.userId;

  try {
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please login to go to wishlist",
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId }).populate(
      "items.productId",
    );

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    let updatedItems = [];
    let removedItems = [];

    for (let item of wishlist.items) {
      console.log("hi : ", item.productId);

      const product = await Product.findById(item.productId._id.toString());

      if (!product || !product.status || !product.inStock) {
        console.log("hi2");
        removedItems.push(item.name);
        continue;
      }

      console.log("category ; ", product.category);
      const category = await Category.findById(product.category.toString());
      if (!category ||category.status !== "listed") {
        console.log("hi3");
        removedItems.push(item.name + " (category unavailable)");
        continue;
      }

      const variant = product.variants.id(item.variantId);

      if (!variant || variant.quantity <= 0) {
        console.log("hi4");
        removedItems.push(item.name);
        continue;
      }

      // 🔥 Apply offer logic
      const bestOffer = await determineBestOffer(product, variant.price);

      let finalPrice = variant.price;
      let offerName = null;

      console.log("best offer applied");
      if (bestOffer) {
        finalPrice = bestOffer.discounted_price;
        offerName = bestOffer.name;
      }

      updatedItems.push({
        ...item.toObject(),
        originalPrice: variant.price,
        finalPrice,
        offer: offerName,
      });
    }

    const w = { ...wishlist.toObject(), items: updatedItems };
    console.log("w : ", w);
    return res.status(200).render("userPages/wishlistPage", {
      wishlist: {
        ...wishlist.toObject(),
        items: updatedItems,
      },
      removedItems,
    });
  } catch (err) {
    console.error("Error in loading wishlist page : ", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.clearWishlistController = async (req, res) => {
  try {
    const wishlistId = req.params.id;
    if (!wishlistId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart Id found",
      });
    }

    const wishlist = await Wishlist.findOne({
      _id: wishlistId,
      user: req.session.userId,
    });
    if (!wishlist) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Wishlist not found",
      });
    }

    wishlist.items = [];
    await wishlist.save();

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

exports.deleteItemController = async (req, res) => {
  console.log("request body : ", req.body);
  console.log("params : ", req.params);
  try {
    const itemId = req.params.id;
    const { productId, variantId } = req.body;
    if (!itemId) {
      console.log("no item id ");
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No item ID found",
      });
    }
    if (!productId || !variantId) {
      console.log("no credentials");
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Credentials not found",
      });
    }
    const wishlist = await Wishlist.findOne({ user: req.session.userId });
    if (!wishlist) {
      console.log("no wishlist found");

      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Wishlist not found",
      });
    }
    const wishlistItem = wishlist.items.find((item) => {
      return (
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );
    });
    if (!wishlistItem) {
      console.log("no item found");
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Wishlist item not found",
      });
    }
    wishlist.items = wishlist.items.filter((item) => {
      return !(
        item._id.toString() === itemId &&
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );
    });
    await wishlist.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Item removed from wishlist",
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

exports.addAllToCartController = async (req, res) => {
  console.log("request body: ", req.body);
  console.log("params : ", req.params);
  const wishlistId = req.params.id;
  try {
    if (!wishlistId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Wishlist Id not found",
      });
    }
    const wishlist = await Wishlist.findOne({ user: req.session.userId });
    console.log("Wishlist : ", wishlist);
    if (!wishlist) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Wishlist not found",
      });
    }
    const cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Cart  not found",
      });
    }
    console.log(wishlist.items);
    wishlist.items.forEach((item) => {
      cart.items.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        color: item.color,
        size: item.size,
        price: item.price,
        quantity: 1, // REQUIRED
        image: item.image,
      });
    });
    wishlist.items = [];

    await cart.save();
    await wishlist.save();
    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Items added to cart ",
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
