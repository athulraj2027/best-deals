const express = require("express");
const router = express.Router();
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const profileController = require("../../controllers/user/profileController");

router
  .route("/")
  .get(userGuestMiddleware, profileController.getUserAddressPage);

router.route("/add").post(profileController.addAddressController);

module.exports = router;
