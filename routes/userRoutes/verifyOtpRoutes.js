const express = require("express");
const router = express.Router();
const verifyOtpController = require("../../controllers/user/verifyOtpController");
const userAuthMiddleware = require("../../middlewares/userAuthMiddleware");

router
  .route("/")
  .get(userAuthMiddleware, verifyOtpController.getVerifyOtpPage)
  .post(verifyOtpController.verifyOtpController);

module.exports = router;
