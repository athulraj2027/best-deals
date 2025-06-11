const express = require("express");
const profileController = require("../../controllers/user/profileController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const router = express.Router();
const addressRoutes = require("./addressRoutes");

router.use("/address", addressRoutes);

router
  .route("/orders")
  .get(userGuestMiddleware, profileController.getOrdersPage);

router
  .route("/orders/cancel/:id")
  .post(profileController.cancelOrderController);

router
  .route("/")
  .get(userGuestMiddleware, profileController.getUserProfilePage)
  .patch(profileController.editProfileController);

router
  .route("/password")
  .get(profileController.getResetPassword)
  .post(profileController.resetPasswordController);

router
  .route("/orders/return/:id")
  .post(profileController.returnOrderController);

module.exports = router;
