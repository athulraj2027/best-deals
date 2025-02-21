const express = require("express");
const router = express.Router();
const homePageController = require("../../controllers/user/homePageController");

router.route("/").get(homePageController.getHomePage);

module.exports = router;
