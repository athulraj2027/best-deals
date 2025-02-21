const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/admin/productsController");
const { uploadProductImages, productEditImageUpload } = require("../../middlewares/multerMiddleware");
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.route("/").get(guestMiddleware, productsController.getProductsPage);
router
  .route("/add")
  .get(guestMiddleware, productsController.getAddProductPage)
  .post(uploadProductImages.any(), productsController.addProductController);

router
  .route("/edit/:id")
  .get(guestMiddleware, productsController.getEditProductPage)
  .post(productEditImageUpload, productsController.editProductController);

router
  .route("/:id/variants")
  .get(guestMiddleware, productsController.getEditVariantController)
  .post();

router.route("/unlist/:id").post(productsController.unlistProduct);
router.route("/list/:id").post(productsController.listProduct);
router.route("/delete/:id").post();
module.exports = router;

// /admin/products/<%= product._id %>/variants/edit/<%= variant._id %>
