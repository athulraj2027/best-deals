const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/admin/productsController");
const {
  uploadProductImages,
  productEditImageUpload,
} = require("../../middlewares/multerMiddleware");
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

router.route("/unlist/:id").post(productsController.unlistProduct);
router.route("/list/:id").post(productsController.listProduct);
router.route("/delete/:id").post();
router
  .route("/:id/add-variant")
  .get(guestMiddleware, productsController.getAddVariantPage)
  .post(uploadProductImages.any(), productsController.addVariantController);
  
module.exports = router;
