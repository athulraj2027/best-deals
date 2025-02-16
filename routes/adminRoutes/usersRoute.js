const express = require("express");
const router = express.Router();
const usersController = require("../../controllers/admin/userController");

router.route("/").get(usersController.viewUsersPage);
router.route("/view/:id").get(usersController.viewUser);
router.route("/list/:id").post(usersController.listingUsersController);
router.route("/block/:id").post(usersController.blockCustomer);
router.route("/unblock/:id").post(usersController.unblockCustomer);
// router.route("/unlist/:id").post();

module.exports = router;
