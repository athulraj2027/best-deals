const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const usersRoutes = require("./usersRoute");
const dashboardController = require("../../controllers/admin/dashboardController");
const guestMiddleware = require("../../middlewares/guestMiddleware");
const orderRoutes = require("./orderRoutes");
const couponRoutes = require("./couponRoutes");
const salesReportRoutes = require("./salesReportRoutes");
const offerRoutes = require("./offerRoutes");

router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/customers", usersRoutes);
router.use("/orders", orderRoutes);
router.use("/coupons", couponRoutes);
router.use("/offers", offerRoutes);
router.use(
  "/dashboard",
  guestMiddleware,
  dashboardController.getAdminDashboard,
);

router.use("/sales-report", salesReportRoutes);

router.post("/logout", (req, res) => {
  console.log("hi");
  delete req.session.adminEmail;
  res.clearCookie("auth_token");
  return res.redirect("/admin");
});

router.use("/", authRoutes);

module.exports = router;
