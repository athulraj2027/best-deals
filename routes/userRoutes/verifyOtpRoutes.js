const express = require("express");
const router = express.Router();
const verifyOtpController = require("../../controllers/user/verifyOtpController");

router
  .route("/")
  .get(verifyOtpController.getVerifyOtpPage)
  .post(verifyOtpController.verifyOtpController);

// router.route("/verify-otp").post(verifyOtpController.);

module.exports = router;
