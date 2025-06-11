const Category = require("../../models/Category");
const statusCodes = require("../../services/statusCodes");

// --- Get categories page ---
exports.getCategoriesPage = async (req, res) => {
  try {
    const { status, sort } = req.query;

    let filter = {};
    let sortOption = {};

    if (status && status !== "") {
      filter.status = status;
    }
    switch (sort) {
      case "desc":
        sortOption = { createdAt: -1 };
        break;
      case "asc":
        sortOption = { createdAt: 1 };
        break;
    }
    const limit = parseInt(req.query.limit) || 10; // Default limit 10
    const currentPage = parseInt(req.query.page) || 1;
    const skip = (currentPage - 1) * limit;

    const totalCategories = await Category.countDocuments();
    const categories = await Category.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCategories / limit);
    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;
    const prevPage = currentPage - 1;
    const nextPage = currentPage + 1;

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CategoryPages/adminCategories", {
        categories,
        currentPage,
        totalPages,
        selectedStatus: status,
        selectedSort: sort,
        limit,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
      });
  } catch (err) {
    console.error("Category page get method error : ", err);
    return res.status(statusCodes.SERVER_ERROR);
  }
};

//--- Get add category page ---

exports.getAddCategoriesPage = (req, res) => {
  try {
    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CategoryPages/adminAddCategory");
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR);
  }
};

// --- Get edit category page ---

exports.getEditCategoryPage = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findOne({ _id: categoryId });
    return res.render("adminPages/CategoryPages/adminEditCategory", {
      category,
    });
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR);
  }
};

// --- Add category controller ---

exports.addCategoryController = async (req, res) => {
  console.log("Category controller working");
  const { categoryName, status } = req.body;

  const categoryImage = req.file;
  try {
    const imageUrl = `images/categories/${categoryImage.filename}`;
    // console.log(imageUrl);

    const mappedStatus = status === "on" ? "listed" : "unlisted";
    console.log(mappedStatus);

    const existingCategory = await Category.findOne({ name: categoryName });
    if (existingCategory) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "error",
        message: "Category already exists",
      });
    }
    const newCategory = new Category({
      name: categoryName,
      status: mappedStatus,
      categoryTags: typeof tags === "string" ? JSON.parse(tags) : [],
      imageUrl,
    });

    await newCategory.save();
    return res.status(statusCodes.SUCCESS).json({
      status: "success",
      title: "Category added Successfully",
      message: `${newCategory.name} has been added as a new category`,
    });
  } catch (err) {
    console.log(err);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Error in adding product",
      message: "Some error occured",
    });
  }
};

// --- Unlist Category ---

exports.unlistCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(
      id,
      { status: "unlisted" },
      { new: true }
    );

    if (!category) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "Category not found." });
    }

    return res.status(statusCodes.SUCCESS).redirect("/admin/categories");
  } catch (error) {
    console.error(error);
    res
      .status(statusCodes.SERVER_ERROR)
      .json({ message: "An error occurred while unlisting the category." });
  }
};

// --- List Category ---

exports.listCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(
      id,
      { status: "listed" },
      { new: true }
    );

    if (!category) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Category not found." });
    }

    return res.status(statusCodes.SUCCESS).redirect("/admin/categories"); // Redirect to the categories page
  } catch (error) {
    console.error(error);
    return res
      .status(statusCodes.SERVER_ERROR)
      .json({ message: "An error occurred while listing the category." });
  }
};

//  edit category controller

exports.editCategory = async (req, res) => {
  const categoryId = req.params.id;
  const { name, status } = req.body;
  // console.log("edit category controller working");
  if (!name || !status) {
    return res.status(statusCodes.BAD_REQUEST).json({
      title: "Error",
      message: "Please fill all the fields",
    });
  }
  try {
    const category = await Category.findOne({ _id: categoryId });
    if (!category) {
      console.log("no category found");
      return res.status(statusCodes.NOT_FOUND).json({
        title: "error",
        message: "No category found",
      });
    }
    category.name = name;
    category.status = status;
    // category.tags = tags.split(','.map())

    if (req.file) {
      category.imageUrl = `images/categories/${req.file.filename}`;
    }

    await category.save();

    return res.status(statusCodes.SUCCESS).json({
      title: "Success",
      message: "Category edited successfully",
    });
  } catch (err) {
    console.error("Category editing error : ", err);
    return res.status(statusCodes.SERVER_ERROR);
  }
};
