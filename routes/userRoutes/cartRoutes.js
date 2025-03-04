const express = require("express");
const router = express.Router();

const cartController = require("../../controllers/user/cartController");

router.route("/").get(cartController.getCartPage);
module.exports = router;
