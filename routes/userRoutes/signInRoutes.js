const express = require("express");
const signInController = require("../../controllers/user/signInController");
const router = express.Router();

router
  .route("/")
  .get(signInController.getSignInPage)
  .post(signInController.signInController);

module.exports = router;
