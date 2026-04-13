const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/admin/orderController");
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.route("/").get(guestMiddleware, orderController.getOrdersPage);
router
  .route("/:orderId/items/:itemId/accept-return")
  .post(orderController.acceptReturnItem);

router
  .route("/:orderId/items/:itemId/change-status")
  .post(orderController.changeItemStatus);

router.route("/:id").get(guestMiddleware, orderController.getOrderDetails);
router.route("/update-status/:id").post(orderController.changeStatusController);

module.exports = router;
