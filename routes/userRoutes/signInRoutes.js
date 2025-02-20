const express = require("express");
const signInController = require("../../controllers/user/signInController");
const userAuthMiddleware = require("../../middlewares/userAuthMiddleware");
const router = express.Router();

router
  .route("/")
  .get(userAuthMiddleware,signInController.getSignInPage)
  .post(signInController.signInController);

module.exports = router;
