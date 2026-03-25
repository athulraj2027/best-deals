const express = require("express");
const router = express.Router();
const usersController = require("../../controllers/admin/userController");
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.route("/").get(guestMiddleware, usersController.viewUsersPage);
router.route("/view/:id").get(guestMiddleware, usersController.viewUser);
router.route("/list/:id").post(usersController.listingUsersController);
router.route("/block/:id").post(usersController.blockCustomer);
router.route("/unblock/:id").post(usersController.unblockCustomer);
router.route("/:id/wallet").post(guestMiddleware, usersController.updateWallet);
router.route("/:id/wallet/transactions").get(guestMiddleware, usersController.getWalletTransactions);
// router.route("/unlist/:id").post();

module.exports = router;
