const express = require("express");
const couponController = require("../../controllers/admin/couponController");
const guestMiddleware = require("../../middlewares/guestMiddleware");
const router = express.Router();

router.route("/").get(guestMiddleware, couponController.getCouponsPage);
router.route("/activate/:id").post(couponController.activateCouponController);
router
  .route("/deactivate/:id")
  .post(couponController.deActivateCouponController);
router
  .route("/add")
  .get(guestMiddleware, couponController.getAddCouponPage)
  .post(couponController.addCouponController);
router
  .route("/edit/:id")
  .get(guestMiddleware, couponController.getEditCouponPage)
  .put(couponController.editCouponController);
  
module.exports = router;
