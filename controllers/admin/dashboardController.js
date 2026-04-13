const Order = require("../../models/Order");
const Coupon = require("../../models/Coupon");
const User = require("../../models/User");
const Product = require("../../models/Product");

exports.getAdminDashboard = async (req, res) => {
  try {
    const { range, status, startDate, endDate } = req.query;

    // ================= DATE FILTER LOGIC =================
    let dateFilter = {};
    if (range === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = { $gte: today };
    } else if (range === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dateFilter = { $gte: d };
    } else if (range === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dateFilter = { $gte: d };
    } else if (range === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    }

    // Use 'orderDate' to match your Schema's date field
    let matchStage = {};
    if (Object.keys(dateFilter).length > 0) {
      matchStage.orderDate = dateFilter;
    }
    if (status) {
      matchStage.status = status;
    }

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
      Order.countDocuments(matchStage),
      Product.countDocuments(),
      Order.countDocuments({ ...matchStage, status: "pending" }),
      Order.countDocuments({ ...matchStage, status: "delivered" }),
      Order.countDocuments({ ...matchStage, status: "cancelled" }),
      Order.countDocuments({ ...matchStage, status: "return_requested" }),
    ]);

    // ================= REVENUE ANALYTICS =================
    const [revenueData, todaySalesData] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            ...matchStage,
            status: "delivered",
            payment_status: "paid",
          },
        },
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
            orderDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
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

    const totalRevenue = revenueData[0]?.revenue || 0;
    const todaySales = todaySalesData[0]?.sales || 0;

    // ================= CHART DATA: SALES =================
    const salesRaw = await Order.aggregate([
      {
        $match: {
          ...matchStage,
          status: "delivered",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          sales: { $sum: "$grandTotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesChart = {
      labels: salesRaw.map((d) => d._id),
      data: salesRaw.map((d) => d.sales),
    };

    // ================= TOP PERFORMANCE: PRODUCTS =================
    const topProducts = await Order.aggregate([
      { $match: { ...matchStage, status: "delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
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
      { $project: { name: "$product.name", totalSold: 1, revenue: 1 } },
    ]);

    // ================= TOP PERFORMANCE: CATEGORIES =================
    const topCategories = await Order.aggregate([
      { $match: { ...matchStage, status: "delivered" } },
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
      { $project: { name: "$category.name", totalSold: 1 } },
    ]);

    // ================= TOP PERFORMANCE: BRANDS =================
    const topBrands = await Order.aggregate([
      { $match: { ...matchStage, status: "delivered" } },
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
      { $project: { brand: "$_id", totalSold: 1 } },
    ]);

    // ================= INVENTORY & COUPONS =================
    const lowStockProducts = await Product.find({
      "variants.quantity": { $lte: 5 },
    }).limit(5);

    const couponStats = await Coupon.aggregate([
      { $group: { _id: null, totalUsed: { $sum: "$usageCount" } } },
    ]);

    // ================= RENDER =================
    res.render("adminPages/adminDashboard", {
      filters: { range, status, startDate, endDate },
      totalUsers,
      totalOrders,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnRequests,
      totalRevenue: totalRevenue.toFixed(2),
      todaySales: todaySales.toFixed(2),
      salesChart,
      topProductsChart: {
        labels: topProducts.map((p) => p.name),
        data: topProducts.map((p) => p.totalSold),
      },
      categoryChart: {
        labels: topCategories.map((c) => c.name),
        data: topCategories.map((c) => c.totalSold),
      },
      brandChart: {
        labels: topBrands.map((b) => b.brand),
        data: topBrands.map((b) => b.totalSold),
      },
      topProducts,
      topCategories,
      topBrands,
      lowStockProducts,
      totalCouponUsed: couponStats[0]?.totalUsed || 0,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Dashboard error");
  }
};
