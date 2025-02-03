const express = require("express");
const router = express.Router();
const shopController = require("../../controllers/user/shopController");

router.route("/").get(shopController.getShopPage);

module.exports = router;
