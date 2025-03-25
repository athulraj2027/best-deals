const express = require("express");
const router = express.Router();
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const cartController = require("../../controllers/user/cartController");

router.route("/").get(userGuestMiddleware, cartController.getCartPage);
router
  .route("/quantity-update/:id")
  .post(cartController.updateQuantityController);

router.route("/delete-item/:id").post(cartController.deleteItemController);
router.route("/clear/:id").post(cartController.clearCartController);
// router.route('/add').post(cartController)
module.exports = router;
