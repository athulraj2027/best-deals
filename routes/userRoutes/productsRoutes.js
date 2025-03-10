const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/user/productsController");

router.route("/:id").get(productsController.getProductViewPage);
router.route("/cart/add/:id").post(productsController.addtoCartController);
router
  .route("/wishlist/add/:id")
  .post(productsController.addtoWishlistController);
module.exports = router;
