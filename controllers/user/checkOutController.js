const User = require("../../models/User");
const Cart = require('../../models/Cart')

exports.getCheckoutPage = async (req, res) => {
  try {
    console.log(req.params.id)
    const  cartId  = req.params.id;
    // if (!cartId) {
    //   return res.status(400).json({
    //     status: "error",
    //     title: "Error",
    //     message: "Cart Id not found",
    //   });
    // } 
    console.log(cartId)

    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No cart found",
      });
    }

    return res.status(200).render("userPages/checkoutPage", { cart });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }

};
