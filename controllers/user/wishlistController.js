const Wishlist = require("../../models/Wishlist");
const User = require("../../models/User");

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
    const wishlist = await Wishlist.findOne({ userId });
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
