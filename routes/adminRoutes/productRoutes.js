const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/admin/productsController");
const upload = require("../../middlewares/multerMiddleware");

const uploadFields = [
  { name: "primaryImage", maxCount: 1 },
  { name: "variants[0][image]", maxCount: 1 },
  { name: "variants[1][image]", maxCount: 1 },
  { name: "variants[2][image]", maxCount: 1 },
  { name: "variants[3][image]", maxCount: 1 },
  { name: "variants[4][image]", maxCount: 1 },
];

router.route("/").get(productsController.getProductsPage);
router
  .route("/add")
  .get(productsController.getAddProductPage)
  .post( productsController.addProductController);

router
  .route("/edit/:id")
  .get(productsController.getEditProductPage)
  .post(productsController.editProductController);

router.route("/delete/:id").post();

module.exports = router;
