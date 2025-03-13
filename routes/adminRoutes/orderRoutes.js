const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/admin/orderController");
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.route("/").get(guestMiddleware,orderController.getOrdersPage);

module.exports = router
