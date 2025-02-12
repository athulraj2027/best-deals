const Product = require("../../models/Product");
const Category = require("../../models/Category");
const cloudinary = require("../../config/cloudinary");
const DatauriParser = require("datauri/parser")
const mongoose = require('mongoose')
const parser = new DatauriParser();

const bufferToDataURI = (fileFormat, buffer) => {
  parser.format(fileFormat, buffer);
};

const uploadToCloudinary = async (file) => {
  try {
    const fileFormat = file.mimetype.split("/")[1];
    const { base64 } = bufferToDataURI(fileFormat, file.buffer);

    const uploadResponse = await cloudinary.uploader.upload(
      `data:image/${fileFormat};base64,${base64}`,
      {
        folder: "products",
        resource_type: "auto",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      }
    );
    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    };
  } catch (err) {
    throw new Error(`Failed to upload image : ${error.message}`);
  }
};

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productName, brand, actualPrice, category } = req.body;

    if (!productName || !brand || !actualPrice || !category) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    let primaryImageData = null;

    if (req.files.primaryImage) {
      primaryImageData = await uploadToCloudinary(req.files.primaryImage[0]);
    }

    const product = new Product({
      name: req.body.productName,
      brand: req.body.brand,
      category: req.body.category,
      primaryImage: primaryImageData
        ? {
            url: primaryImageData.url,
            publicId: primaryImageData.publicId,
          }
        : null,
      status: req.body.status === "true",
    });

    await product.save();

    const variantPromises = [];
    if (req.body.variants && Array.isArray(req.body.variants)) {
      for (let i = 0; i < req.body.variants.length; i++) {
        const variant = req.body.variants[i];
        let variantImageData = null;

        if (req.files[`variants[${i}][image]`]) {
          variantImageData = await uploadToCloudinary(
            req.files[`variants[${i}][image]`][0]
          );
        }
        const newVariant = new Variant({
          productId: product._id,
          color: variant.color,
          size: variant.size,
          price: parseFloat(variant.price),
          quantity: parseInt(variant.quantity),
          image: variantImageData
            ? {
                url: variantImageData.url,
                publicId: variantImageData.publicId,
              }
            : null,
        });

        variantPromises.push(newVariant.save({ session }));
      }
    }

    await Promise.all(variantPromises);
    await session.commitTransaction();

    const completeProduct = await Product.findById(product._id).populate(
      "variants"
    );

    res.status(201).json({
      status: "success",
      message: "Product Added successfully",
      data: completeProduct,
    });
  } catch (err) {
    await session.abortTransaction();

    // Clean up uploaded images if product creation fails
    if (error.uploadedImages) {
      for (const publicId of error.uploadedImages) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error(`Failed to delete image: ${deleteError.message}`);
        }
      }
    }

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  } finally {
    session.endSession();
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
