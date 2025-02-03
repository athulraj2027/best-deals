const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/admin/categoryController");

router.route("/edit/:id").get(categoryController.getEditCategoryPage).post();
router.route("/unlist/:id").post(categoryController.unlistCategory);
router.route("/").get(categoryController.getCategoriesPage);
router.route("/list/:id").post();
router
  .route("/add")
  .get(categoryController.getAddCategoriesPage)
  .post(categoryController.addCategoryController);

module.exports = router;
