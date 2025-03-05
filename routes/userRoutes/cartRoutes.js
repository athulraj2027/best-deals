const express = require("express");
const router = express.Router();
const userGuestMiddleware = require("../../middlewares/userGuestMiddleware");
const cartController = require("../../controllers/user/cartController");

router.route("/").get(userGuestMiddleware, cartController.getCartPage);
module.exports = router;
