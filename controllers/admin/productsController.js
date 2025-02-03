const Product = require("../../models/Product");
const Category = require("../../models/Category");

// --- Get products page

exports.getProductsPage = async (req, res) => {
  const products = await Product.find();
  res.render("adminPages/ProductPages/adminProducts", { products });
};

// --- Get add product page ---

exports.getAddProductPage = async (req, res) => {
  const categories = await Category.find();
  res.render("adminPages/ProductPages/adminAddProduct", { categories });
};

// --- Get edit product page ---

exports.getEditProductPage = async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findOne({ _id: productId });
  res.render("adminPages/ProductPages/adminEditProduct", { product });
};

//--- Post add product controller ---

exports.addProductController = async (req, res) => {
  try {
    const { name, description, price, stock, category, status } = req.body;

    if (!name || !description || !price || !stock || !category) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      category,
      status,
      images: [],
    });

    const uploadDir = path.join(__dirname, "public/images/products");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (req.files) {
      const imageKeys = Object.keys(req.files);
      imageKeys.forEach((key) => {
        const file = req.files[key];

        if (file && file.filename) {
          const imagePath = path.join(uploadDir, file.filename);
          newProduct.images.push(imagePath);
        } else {
          console.warn(`No valid file found for key: ${key}`);
        }
      });
    } else {
      console.warn("No files uploaded.");
    }

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully.",
      product: newProduct,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding the product.",
    });
  }
};

// --- List product controller ---

exports.listProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product by ID and update its status to active
    const product = await Product.findByIdAndUpdate(
      id,
      { status: true },
      { new: true }
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // Redirect back to the product list page
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "An error occurred while listing the product.",
    });
  }
};

// --- Unlist product controller ---

exports.unlistProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product by ID and update its status to inactive
    const product = await Product.findByIdAndUpdate(
      id,
      { status: false },
      { new: true }
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "An error occurred while unlisting the product.",
    });
  }
};

// --- Edit product controller ---

exports.editProductController = async (req, res) => {
  const productId = req.params.id;
  const { name, description, price, stock } = req.body;
  console.log(req.body);
  try {
    if (!name || !description || !price || !stock) {
      return res.status(400).json({
        title: "error",
        text: "Please fill all columns",
      });
    }
    const product = await Product.findByIdAndUpdate(
      productId,
      { name, description, price, stock },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }
    console.log("there is a product");
    return res.status(200).json({
      title: "success",
      message: "Product updated successfully",
    });
  } catch (err) {
    console.log(err);
    return res.json({
      title: "Some error occured",
      message: "Some error occured in updating product.",
    });
  }
};
