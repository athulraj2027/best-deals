const express = require("express");
const router = express.Router();
const authController = require("../../controllers/admin/authController");

router
  .route("/")
  .get(authController.getAdminLoginPage)
  .post(authController.adminLoginController);

module.exports = router;
