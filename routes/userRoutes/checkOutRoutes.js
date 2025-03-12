const express = require("express");
const router = express.Router();
const checkOutController = require("../../controllers/user/checkOutController");

router.route("/:id").get(checkOutController.getCheckoutPage);

module.exports = router;
