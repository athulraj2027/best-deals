const express = require("express");
const couponController = require("../../controllers/admin/couponController");
const guestMiddleware = require("../../middlewares/guestMiddleware");
const router = express.Router();

router.route("/").get(guestMiddleware, couponController.getCouponsPage);
router
  .route("/add")
  .get(guestMiddleware, couponController.getAddCouponPage)
  .post(couponController.addCouponController);
module.exports = router;
