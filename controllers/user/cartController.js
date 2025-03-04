const Cart = require("../../models/Cart");
const User = require("../../models/User");

exports.getCartPage = async (req, res) => {
  const userId = req.session.userId;
  try {
    if (!userId) {
      return res.status(400).redirect("/signin");
    }
    const cart = await Cart.findOne({ userId });
    return res.status(200).render("userPages/cartPage",{cart});
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};
