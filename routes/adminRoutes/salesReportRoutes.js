const express = require("express");
const salesReportController = require("../../controllers/admin/salesReportController");
const guestMiddleware = require("../../middlewares/guestMiddleware");
const router = express.Router();

router
  .route("/")
  .get(guestMiddleware, salesReportController.getSalesReportPage);
router
  .route("/download")
  .get(guestMiddleware, salesReportController.getSalesReport);

module.exports = router;
