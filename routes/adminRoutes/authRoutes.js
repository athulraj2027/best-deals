const express = require("express");
const router = express.Router();
const authController = require("../../controllers/admin/authController");
const adminAuthMiddleware = require("../../middlewares/adminAuthMiddleware");

router
  .route("/")
  .get(adminAuthMiddleware,authController.getAdminLoginPage)
  .post(authController.adminLoginController);

module.exports = router;
