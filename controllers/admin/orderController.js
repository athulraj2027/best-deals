const Order = require("../../models/Order");

exports.getOrdersPage = async (req, res) => {
  try {
    // const orders = await Order.find()
    return res.status(200).render('adminPages/OrderPages/adminOrders')
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
};
