const Wishlist = require("../../models/Wishlist");
const Cart = require("../../models/Cart");

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
    const wishlist = await Wishlist.findOne({ user: userId });
    return res.status(200).render("userPages/wishlistPage", { wishlist });
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

    const wishlist = await Wishlist.findOne({ _id: wishlistId });
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
    console.log("Wishlist : ",wishlist)
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
    console.log(wishlist.items)
    wishlist.items.forEach((item) => {
      cart.items.push(item);
      
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
