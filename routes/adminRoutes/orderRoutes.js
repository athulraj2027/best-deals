const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/admin/orderController");
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.route("/").get(guestMiddleware, orderController.getOrdersPage);
router.route("/update-status/:id").post(orderController.changeStatusController);

module.exports = router;
