const Category = require("../../models/Category");
const statusCodes = require("../../services/statusCodes");

exports.getCategoriesPage = async (req, res) => {
  try {
    const { status, sort, query } = req.query;

    let filter = {};
    let sortOption = {};

    // ✅ Status filter
    if (status && status !== "") {
      filter.status = status;
    }

    // ✅ Search query filter
    if (query && query.trim() !== "") {
      filter.$or = [
        { name: { $regex: query, $options: "i" } }, // search in name
        { tags: { $regex: query, $options: "i" } }, // search in tags array
      ];
    }

    // ✅ Sorting
    switch (sort) {
      case "desc":
        sortOption = { createdAt: -1 };
        break;
      case "asc":
        sortOption = { createdAt: 1 };
        break;
    }

    const limit = parseInt(req.query.limit) || 10;
    const currentPage = parseInt(req.query.page) || 1;
    const skip = (currentPage - 1) * limit;

    // ❗ IMPORTANT: apply filter here also
    const totalCategories = await Category.countDocuments(filter);

    const categories = await Category.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCategories / limit);

    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CategoryPages/adminCategories", {
        categories,
        currentPage,
        totalPages,
        selectedStatus: status,
        selectedSort: sort,
        query, // ✅ send back to UI
        limit,
        hasPrevPage,
        hasNextPage,
        prevPage: currentPage - 1,
        nextPage: currentPage + 1,
      });
  } catch (err) {
    console.error("Category page get method error : ", err);
    return res.status(statusCodes.SERVER_ERROR);
  }
};

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

exports.addCategoryController = async (req, res) => {
  console.log("Category controller working");
  const { categoryName, status } = req.body;

  const categoryImage = req.file;
  try {
    const trimmedName = categoryName.trim();
    const isValidCategoryName = /^[a-zA-Z0-9 ]{3,}$/.test(trimmedName);
    if (!isValidCategoryName)
      return res.status(400).json({
        status: "error",
        title: "error",
        message: "Improper syntax for category name",
      });
    const lowercaseName = trimmedName.toLowerCase();

    const imageUrl = `images/categories/${categoryImage.filename}`;
    // console.log(imageUrl);

    const mappedStatus = status === "on" ? "listed" : "unlisted";
    console.log(mappedStatus);

    const existingCategory = await Category.findOne({ name: lowercaseName });
    if (existingCategory) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "error",
        message: "Category already exists",
      });
    }
    const newCategory = new Category({
      name: lowercaseName,
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
      { new: true },
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
      { new: true },
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
    const trimmedName = name.trim();
    const isValidCategoryName = /^[a-zA-Z0-9 ]{3,}$/.test(trimmedName);
    if (!isValidCategoryName)
      return res.status(400).json({
        status: "error",
        title: "error",
        message: "Improper syntax for category name",
      });

    const lowercaseName = trimmedName.toLowerCase();

    category.name = lowercaseName;
    category.status = status;
    // category.tags = tags.split(','.map())

    if (req.file) {
      category.imageUrl = `images/categories/${req.file.filename}`;
    }

    await category.save();

    return res.status(statusCodes.SUCCESS).json({
      title: "Success",
      status: "success",
      message: "Category edited successfully",
    });
  } catch (err) {
    console.error("Category editing error : ", err);
    return res.status(statusCodes.SERVER_ERROR);
  }
};
