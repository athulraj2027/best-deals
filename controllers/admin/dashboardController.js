const Order = require("../../models/Order");
const Coupon = require("../../models/Coupon");
const PDFDocument = require("pdfkit");
const User = require("../../models/User");
const Product = require("../../models/Product");

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const totalProducts = await Product.countDocuments();

    const totalSales = await Order.aggregate([
      { $match: { status: "delivered" } },

      { $unwind: "$items" },

      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $multiply: ["$items.price", "$items.quantity"],
            },
          },
        },
      },
    ]);

    console.log(
      totalUsers,
      totalOrders,
      pendingOrders,
      totalProducts,
      totalSales,
    );
    res.render("adminPages/adminDashboard", {
      totalUsers,
      totalOrders,
      pendingOrders,
      totalProducts,
      totalSales: totalSales[0]?.amount.toFixed(2) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
};
