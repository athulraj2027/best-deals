const express = require("express");
const router = express.Router();
const wishlistController = require("../../controllers/user/wishlistController");
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");

router.route("/").get(userGuestMiddleware, wishlistController.getWishlistPage);

router.route("/clear/:id").post(wishlistController.clearWishlistController);
router.route("/delete-item/:id").post(wishlistController.deleteItemController);
router
  .route("/add-all-to-cart/:id")
  .post(wishlistController.addAllToCartController);

module.exports = router;
