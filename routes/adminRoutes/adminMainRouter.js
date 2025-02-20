const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const usersRoutes = require("./usersRoute");
const dashboardController = require('../../controllers/admin/dashboardController');
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/customers", usersRoutes);
router.use('/dashboard',guestMiddleware, dashboardController.getAdminDashboard)
router.use("/", authRoutes);

module.exports = router;
