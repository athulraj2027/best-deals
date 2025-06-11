const express = require("express");
const router = express.Router();
const checkOutController = require("../../controllers/user/checkOutController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");

router.route("/apply-coupon").post(checkOutController.applyCouponController);
router
  .route("/add-delivery-address")
  .post(checkOutController.addDeliveryAddressController);
router
  .route("/:id")
  .get(userGuestMiddleware, checkOutController.getCheckoutPage)
  .post(checkOutController.checkoutController);


// router
//   .route("/create-razorpay-order/:id")
//   .post(checkOutController.placeOrderController);
module.exports = router;
