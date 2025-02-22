const express = require("express");
const router = express.Router();
const forgotPasswordController = require("../../controllers/user/forgotPasswordController");
const userAuthMiddleware = require("../../middlewares/userAuthMiddleware");

router
  .route("/")
  .get(userAuthMiddleware, forgotPasswordController.getVerifyEmailPage)
  .post(forgotPasswordController.verifyEmailPageController);

module.exports = router;
