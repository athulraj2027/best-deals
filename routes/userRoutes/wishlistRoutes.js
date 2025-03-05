const express = require("express");
const router = express.Router();
const wishlistController = require("../../controllers/user/wishlistController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");

router
  .route("/")
  .get(userGuestMiddleware, wishlistController.getWishlistPage)
  .post();

module.exports = router;
