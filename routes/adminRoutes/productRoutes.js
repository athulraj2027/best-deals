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
  .post(
    uploadProductImages.fields([
      { name: "variants[0][newImages]", maxCount: 3 },
      { name: "variants[1][newImages]", maxCount: 3 },
      { name: "variants[2][newImages]", maxCount: 3 },
    ]),
    productsController.editProductController
  );

router
  .route("/:id/variants")
  .get(productsController.getEditVariantController)
  .post();

router.route("/unlist/:id").post(productsController.unlistProduct);
router.route("/list/:id").post(productsController.listProduct);
router.route("/delete/:id").post();
module.exports = router;

// /admin/products/<%= product._id %>/variants/edit/<%= variant._id %>
