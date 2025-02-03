const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/admin/productsController");

router.route("/").get(productsController.getProductsPage);
router
  .route("/add")
  .get(productsController.getAddProductPage)
  .post(productsController.addProductController);

router
  .route("/edit/:id")
  .get(productsController.getEditProductPage)
  .post(productsController.editProductController);

router.route("/delete/:id").post();

module.exports = router;
