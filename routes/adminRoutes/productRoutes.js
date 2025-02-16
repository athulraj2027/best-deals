const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/admin/productsController");
const { uploadProductImages } = require("../../middlewares/multerMiddleware");

router.route("/").get(productsController.getProductsPage);
router
  .route("/add")
  .get(productsController.getAddProductPage)
  .post(uploadProductImages.any(), productsController.addProductController);

router
  .route("/edit/:id")
  .get(productsController.getEditProductPage)
  .post(productsController.editProductController);

router.route("/:id/variants").get(productsController.getEditVariantController).post();

router.route("/unlist/:id").post(productsController.unlistProduct);
router.route("/list/:id").post(productsController.listProduct);
router.route("/delete/:id").post();
module.exports = router;

// /admin/products/<%= product._id %>/variants/edit/<%= variant._id %>
