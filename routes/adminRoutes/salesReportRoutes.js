const express = require("express");
const salesReportController = require("../../controllers/admin/salesReportController");
const router = express.Router();

router.route("/").get(salesReportController.getSalesReportPage);

module.exports = router;
