const express = require("express");
const profileController = require("../../controllers/user/profileController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const router = express.Router();

router
  .route("/")
  .get(userGuestMiddleware, profileController.getUserProfilePage)
  .patch(profileController.editProfileController);
router
  .route("/address")
  .get(userGuestMiddleware, profileController.getUserAddressPage)
  

module.exports = router;
