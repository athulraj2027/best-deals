const Category = require("../../models/Category");

// --- Get categories page ---

exports.getCategoriesPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const categories = await Category.find().skip(skip).limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("adminPages/CategoryPages/adminCategories", {
      categories,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error("Category page get method error : ", err);
  }
};

//--- Get add category page ---

exports.getAddCategoriesPage = (req, res) => {
  res.render("adminPages/CategoryPages/adminAddCategory");
};

// --- Get edit category page ---

exports.getEditCategoryPage = async (req, res) => {
  const categoryId = req.params.id;
  const category = await Category.findOne({ _id: categoryId });
  res.render("adminPages/CategoryPages/adminEditCategory", { category });
};

// --- Add category controller ---

exports.addCategoryController = async (req, res) => {
  console.log("Category controller working");
  const { categoryName, status, categoryTags } = req.body;
  console.log(req.body);

  const categoryImage = req.file;
  try {
    const imageUrl = `images/categories/${categoryImage.filename}`;
    console.log(imageUrl);

    const mappedStatus = status === "on" ? "listed" : "unlisted";
    console.log(mappedStatus);
    const newCategory = new Category({
      name: categoryName,
      status: mappedStatus,
      categoryTags: typeof tags === "string" ? JSON.parse(tags) : [],
      imageUrl,
    });

    await newCategory.save();
    return res.json({
      status: "success",
      title: "Category added Successfully",
      message: `${newCategory.name} has been added as a new category`,
    });
  } catch (err) {
    console.log(err);
    return res.json({
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

    // await Product.deleteMany({stock:{$lte:5}})

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    return res.status(200).redirect("/admin/categories"); // Redirect to the categories page
  } catch (error) {
    console.error(error);
    res
      .status(500)
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
      return res.status(404).json({ message: "Category not found." });
    }

    res.redirect("/admin/categories"); // Redirect to the categories page
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while listing the category." });
  }
};

//  edit category controller

exports.editCategory = async (req, res) => {
  const categoryId = req.params.id;

  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({});
    }

    

    return res.status(201).json({
      title: "Success",
      message: "Category edited successfully",
    });
  } catch (err) {
    console.error("Category editing error : ", err);
  }
};
