const express = require("express");
const router = express.Router();
const offerController = require("../../controllers/admin/offerController");
const guestMiddleware = require("../../middlewares/guestMiddleware");
const offerStatusUpdater = require('../../middlewares/offerStatusUpdater')

router.use(offerStatusUpdater);
router.route("/").get(guestMiddleware, offerController.getOffersPage);
router
  .route("/add")
  .get(guestMiddleware, offerController.getAddOfferPage)
  .post(offerController.addOfferController);

router
  .route("/edit/:id")
  .get(guestMiddleware, offerController.getEditOfferPage)
  .put(offerController.editOfferController);

router.route("/activate/:id").post(offerController.activateOfferController);
router.route("/deactivate/:id").post(offerController.deActivateOfferController);
module.exports = router;
