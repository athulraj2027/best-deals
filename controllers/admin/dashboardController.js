const Order = require("../../models/Order");
const Coupon = require("../../models/Coupon");
const User = require("../../models/User");
const Product = require("../../models/Product");

exports.getAdminDashboard = async (req, res) => {
  try {
    // ================= DATE SETUP =================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    // ================= BASIC COUNTS =================
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnRequests,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Order.countDocuments({ status: "return_requested" }),
    ]);

    // ================= REVENUE =================
    const [totalRevenueData, todaySalesData] = await Promise.all([
      Order.aggregate([
        { $match: { status: "delivered", payment_status: "paid" } },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$grandTotal" },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: today },
            status: "delivered",
          },
        },
        {
          $group: {
            _id: null,
            sales: { $sum: "$grandTotal" },
          },
        },
      ]),
    ]);

    const totalRevenue = totalRevenueData[0]?.revenue || 0;
    const todaySales = todaySalesData[0]?.sales || 0;

    // ================= WEEKLY SALES (CHART READY) =================
    const weeklySalesRaw = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
          status: "delivered",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          sales: { $sum: "$grandTotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesChart = {
      labels: weeklySalesRaw.map((d) => d._id),
      data: weeklySalesRaw.map((d) => d.sales),
    };

    // ================= TOP PRODUCTS =================
    const topProducts = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          revenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          totalSold: 1,
          revenue: 1,
        },
      },
    ]);

    const topProductsChart = {
      labels: topProducts.map((p) => p.name),
      data: topProducts.map((p) => p.totalSold),
    };

    // ================= TOP CATEGORIES =================
    const topCategories = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      {
        $group: {
          _id: "$product.category",
          totalSold: { $sum: "$items.quantity" },
        },
      },

      { $sort: { totalSold: -1 } },
      { $limit: 10 },

      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      {
        $project: {
          name: "$category.name",
          totalSold: 1,
        },
      },
    ]);

    const categoryChart = {
      labels: topCategories.map((c) => c.name),
      data: topCategories.map((c) => c.totalSold),
    };

    // ================= TOP BRANDS =================
    const topBrands = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      {
        $group: {
          _id: "$product.brand",
          totalSold: { $sum: "$items.quantity" },
        },
      },

      { $sort: { totalSold: -1 } },
      { $limit: 10 },

      {
        $project: {
          brand: "$_id",
          totalSold: 1,
        },
      },
    ]);

    const brandChart = {
      labels: topBrands.map((b) => b.brand),
      data: topBrands.map((b) => b.totalSold),
    };

    // ================= LOW STOCK =================
    const lowStockProducts = await Product.find({
      "variants.quantity": { $lte: 5 },
    }).limit(5);

    // ================= COUPON =================
    const couponStats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalUsed: { $sum: "$usageCount" },
        },
      },
    ]);

    const totalCouponUsed = couponStats[0]?.totalUsed || 0;

    // ================= RESPONSE =================
    res.render("adminPages/adminDashboard", {
      // counts
      totalUsers,
      totalOrders,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnRequests,

      // money
      totalRevenue: totalRevenue.toFixed(2),
      todaySales: todaySales.toFixed(2),

      // charts
      salesChart,
      topProductsChart,
      categoryChart,
      brandChart,

      // raw data
      topProducts,
      topCategories,
      topBrands,

      lowStockProducts,
      totalCouponUsed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
};
