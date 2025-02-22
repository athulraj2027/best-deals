const express = require("express");
const router = express.Router();
const forgotPasswordController = require("../../controllers/user/forgotPasswordController");
const userAuthMiddleware = require("../../middlewares/userAuthMiddleware");

router
  .route("/verify-email")
  .get(userAuthMiddleware, forgotPasswordController.getVerifyEmailPage)
  .post(forgotPasswordController.verifyEmailPageController);

router
  .route("/verify-otp")
  .get(userAuthMiddleware, forgotPasswordController.getVerifyOtpPage)
  .post(forgotPasswordController.verifyOtpController);

router
  .route("/new-password")
  .get(forgotPasswordController.getNewPasswordPage)
  .post(forgotPasswordController.setNewPasswordController);

module.exports = router;
