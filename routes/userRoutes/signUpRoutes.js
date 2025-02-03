const express = require("express");
const router = express.Router()
const signUpController = require("../../controllers/user/signUpController");

router
  .route("/")
  .get(signUpController.getSignUpPage)
  .post(signUpController.signUpController);

module.exports = router;
