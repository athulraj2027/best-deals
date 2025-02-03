const Category = require("../../models/Category");

// --- Get categories page ---

exports.getCategoriesPage = async (req, res) => {
  const categories = await Category.find();

  res.render("adminPages/CategoryPages/adminCategories", {
    categories,
  });
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
  const { name, description, status } = req.body;
  const image = req.file;
  try {
    if (!name || !description || !status) {
      return res.json({
        status: "error",
        title: "Empty columns found",
        message: "Please fill all the columns",
      });
    }
    if (!image) {
      return res.json({
        status: "error",
        title: "Image not added",
        message: "Please add image for the category",
      });
    }
    imageUrl = `images/categories/${image.filename}`;
    // const imgUrl = imageUrl.replace(/\\/g,'/')
    console.log(imageUrl);
    const newCategory = new Category({
      name,
      description,
      status,
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
      { status: false },
      { new: true }
    );

    // await Product.deleteMany({stock:{$lte:5}})

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.redirect("/admin/categories"); // Redirect to the categories page
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
      { status: true },
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

// add edit category controller
