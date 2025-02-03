const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/user/productsController");

router.route("/:id").get(productsController.getProductViewPage);

module.exports = router;
