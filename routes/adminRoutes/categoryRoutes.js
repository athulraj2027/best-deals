const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/admin/categoryController");
const { uploadCategoryImages } = require("../../middlewares/multerMiddleware");
const guestMiddleware = require("../../middlewares/guestMiddleware");

router.route("/unlist/:id").post(categoryController.unlistCategory);
router.route("/").get(guestMiddleware, categoryController.getCategoriesPage);
router.route("/list/:id").post(categoryController.listCategory);

router
  .route("/add")
  .get(guestMiddleware, categoryController.getAddCategoriesPage)
  .post(uploadCategoryImages, categoryController.addCategoryController);

router
  .route("/edit/:id")
  .get(guestMiddleware, categoryController.getEditCategoryPage)
  .post(uploadCategoryImages, categoryController.editCategory);

module.exports = router;
