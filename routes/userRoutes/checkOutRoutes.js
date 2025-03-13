const express = require("express");
const router = express.Router();
const checkOutController = require("../../controllers/user/checkOutController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");

router
  .route("/:id")
  .get(userGuestMiddleware, checkOutController.getCheckoutPage)
  .post(checkOutController.placeOrderController);

module.exports = router;
