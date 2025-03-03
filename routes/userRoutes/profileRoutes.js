const express = require("express");
const profileController = require("../../controllers/user/profileController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const router = express.Router();
const addressRoutes = require("./addressRoutes");

router.use("/address", addressRoutes);

router
  .route("/")
  .get(userGuestMiddleware, profileController.getUserProfilePage)
  .patch(profileController.editProfileController);

module.exports = router;
