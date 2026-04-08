const express = require("express");
const router = express.Router();
const checkOutController = require("../../controllers/user/checkOutController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");

router.route("/apply-coupon").post(checkOutController.applyCouponController);
router.route("/remove-coupon").post(checkOutController.removeCouponController);
router
  .route("/add-delivery-address")
  .post(checkOutController.addDeliveryAddressController);
  
router
  .route("/:id")
  .get(userGuestMiddleware, checkOutController.getCheckoutPage)
  .post(checkOutController.checkoutController);

module.exports = router;
