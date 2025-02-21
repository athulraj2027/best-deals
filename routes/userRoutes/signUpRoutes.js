const express = require("express");
const router = express.Router();
const signUpController = require("../../controllers/user/signUpController");
const userAuthMiddleware = require("../../middlewares/userAuthMiddleware");

router
  .route("/")
  .get(userAuthMiddleware, signUpController.getSignUpPage)
  .post(signUpController.signUpController);

module.exports = router;
