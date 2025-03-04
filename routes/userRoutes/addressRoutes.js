const express = require("express");
const router = express.Router();
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const profileController = require("../../controllers/user/profileController");

router
  .route("/")
  .get(userGuestMiddleware, profileController.getUserAddressPage);

router.route("/add").post(profileController.addAddressController);
router.route("/delete/:id").post(profileController.deleteAddressController);
module.exports = router;
