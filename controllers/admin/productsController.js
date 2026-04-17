const Product = require("../../models/Product");
const Category = require("../../models/Category");
const DatauriParser = require("datauri/parser");
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const statusCodes = require("../../services/statusCodes");
const fs = require("fs").promises;

exports.getProductsPage = async (req, res) => {
  try {
    const { category, sort, query } = req.query;

    let filter = {};
    let sortOption = {};

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const categories = await Category.find({ status: "listed" });

    if (category && category !== "all") {
      filter.category = category;
    }

    if (query && query.trim() !== "") {
      filter.$text = { $search: query };
    }

    // ✅ Sorting
    switch (sort) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "popular":
        sortOption = { popularity: -1 };
        break;
      case "rating":
        sortOption = { avgRating: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // ✅ Fetch products
    let products = await Product.find(filter)
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    // ❗ FIX: Apply filter here also
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/ProductPages/adminProducts", {
        products,
        categories,
        selectedCategory: category,
        selectedSort: sort,
        query,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
      });
  } catch (error) {
    console.log(error);
    return res.status(statusCodes.SERVER_ERROR).redirect("/admin/dashboard");
  }
};

// --- Get add product page ---

exports.getAddProductPage = async (req, res) => {
  try {
    const categories = await Category.find();
    res
      .status(statusCodes.SUCCESS)
      .render("adminPages/ProductPages/adminAddProduct", { categories });
  } catch (error) {
    console.log(error);
    return res.status(statusCodes.SERVER_ERROR).redirect("/admin/dashboard");
  }
};

// --- Get edit product page ---

exports.getEditProductPage = async (req, res) => {
  try {
    const productId = req.params.id;
    const categories = await Category.find();
    const product = await Product.findOne({ _id: productId });
    res
      .status(statusCodes.SUCCESS)
      .render("adminPages/ProductPages/adminEditProduct", {
        product,
        categories,
      });
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR).redirect("/admin/products");
  }
};

// --- functions for saving images

async function processImage(file) {
  if (!file.path && (!file.buffer || file.buffer.length === 0)) {
    console.log("No valid image source found");
    return null;
  }
  try {
    return await sharp(file.path || file.buffer)
      .resize(800, 800, {
        // Resize to standard size
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer();
  } catch (err) {
    console.error("Error processing image: ", err);
    return null;
  }
}

// Helper function to save image
async function saveImage(buffer, variantIndex, imageIndex) {
  if (!buffer) {
    console.log(
      `Skipping invalid image for variant ${variantIndex}, image ${imageIndex}`,
    );
    return null;
  }

  const fileName = `variant-${variantIndex}-${imageIndex}-${Date.now()}.jpg`;
  const filePath = path.join(
    __dirname,
    "../../public/images/products/",
    fileName,
  );
  console.log("filepath : ", filePath);
  await fs.writeFile(filePath, buffer);
  return `/images/products/${fileName}`;
}

//--- Post add product controller ---

exports.addProductController = async (req, res) => {
  try {
    // console.log("Hi the addproductController is working");
    const { name, description, brand, category, status, variants } = req.body;
    let categoryId;

    console.log(
      "Fieldnames received:",
      req.files.map((f) => f.fieldname),
    );
    if (!name || name.trim().length === 0)
      return res.status(400).json({ message: "Please give a proper name" });
    if (!description || description.trim().length === 0)
      return res
        .status(400)
        .json({ message: "Please give a proper description" });
    if (!brand || brand.trim().length === 0)
      return res
        .status(400)
        .json({ message: "Please give a proper brand name" });
    if (!category)
      return res.status(400).json({ message: "Please give a proper category" });

    if (!variants)
      return res.status(400).json({ message: "Please give variants" });
    if (!status) return res.status(400).json({ message: "Please give status" });

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      console.log(existingProduct);
      return res.status(statusCodes.BAD_REQUEST).json({
        title: "error",
        message: "Produt already exists",
      });
    }
    if (mongoose.isValidObjectId(category)) {
      categoryId = category;
    } else {
      let categoryDoc = await Category.findOne({ name: category });
      if (!categoryDoc) {
        console.log(`Creating new category: ${category}`);
        categoryDoc = new Category({ name: category });
        await categoryDoc.save();
      }
      categoryId = categoryDoc._id;
    }

    const parsedVariants =
      typeof variants === "string" ? JSON.parse(variants) : variants;
    const processedVariants = [];

    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      const variantImages = req.files.filter(
        (file) => file.fieldname === `variants[${i}][images][]`,
      );

      const processedImages = [];

      for (let j = 0; j < variantImages.length; j++) {
        const processedBuffer = await processImage(variantImages[j]);
        if (processedBuffer) {
          const imageUrl = await saveImage(processedBuffer, i, j);
          if (imageUrl) {
            processedImages.push({
              url: imageUrl,
              order: j,
            });
          }
        }
      }

      if (processedImages.length > 0) {
        processedVariants.push({
          color: variant.color,
          size: variant.size,
          price: parseFloat(variant.price),
          quantity: parseInt(variant.quantity),
          images: processedImages,
        });
      } else {
        console.log(`Warning: No valid images for variant ${i}`);
      }
    }

    const product = new Product({
      name,
      description,
      brand,
      category: categoryId,
      status: status === "true",
      variants: processedVariants,
    });

    await product.save();

    res.json({
      success: true,
      message: "Product added successfully",
      productId: product._id,
    });
  } catch (err) {
    console.error("Error in adding product : ", err);
    res.status(500).json({
      success: false,
      // message: error.message || "Error adding product",
    });
  }
};

// --- List product controller ---

exports.listProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(
      id,
      { status: true },
      { new: true },
    );

    if (!product) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ success: false, message: "Product not found." });
    }

    // Redirect back to the product list page
    return res.status(statusCodes.SUCCESS).redirect("/admin/products");
  } catch (err) {
    console.error(err);
    return res.status(statusCodes.SERVER_ERROR).json({
      success: false,
      message: "An error occurred while listing the product.",
    });
  }
};

// --- Unlist product controller ---

exports.unlistProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(
      id,
      { status: false },
      { new: true },
    );

    if (!product) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ success: false, message: "Product not found." });
    }
    return res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    return res.status(statusCodes.SERVER_ERROR).json({
      success: false,
      message: "An error occurred while unlisting the product.",
    });
  }
};

// --- Helper function for edit product ---
async function deleteImageFile(imageUrl) {
  try {
    console.log(imageUrl);
    if (!imageUrl) return;
    const cleanedImageUrl = imageUrl.startsWith("/")
      ? imageUrl.substring(1)
      : imageUrl;
    const imagePath = path.join(__dirname, "../../public", cleanedImageUrl);
    await fs.unlink(imagePath);
  } catch (err) {
    console.error("Error deleting image file:", err);
  }
}

exports.editProductController = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, brand, category, status, variants } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found" });
    }

    // 1. Basic Validation
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return res
        .status(400)
        .json({ status: "error", message: "Name too short" });
    }

    // 2. Process Variants & Images
    const processedVariants = await Promise.all(
      variants.map(async (variant, variantIndex) => {
        const newVariantData = {
          color: variant.color,
          size: variant.size,
          price: parseFloat(variant.price),
          quantity: parseInt(variant.quantity),
          images: [],
        };

        for (let i = 0; i < 3; i++) {
          const fileFieldName = `variants[${variantIndex}][replaceImage][${i}]`;

          // 1. Convert req.files to a flat array if it's an object (from upload.fields)
          const filesArray = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();

          // 2. Look for the specific file field
          const file = filesArray.find((f) => f.fieldname === fileFieldName);

          if (file) {
            const newImageUrl = `/images/products/${file.filename}`;

            // Delete the OLD physical image file if it exists
            const existingImg =
              variant.existingImages && variant.existingImages[i];
            if (existingImg && existingImg.url) {
              await deleteImageFile(existingImg.url);
            }

            newVariantData.images.push({ url: newImageUrl, position: i });
          } else if (
            variant.existingImages &&
            variant.existingImages[i] &&
            variant.existingImages[i].url
          ) {
            // Keep the existing image if no new file is uploaded for this slot
            newVariantData.images.push({
              url: variant.existingImages[i].url,
              position: i,
            });
          }
        }

        return newVariantData;
      }),
    );

    // 3. Update Database
    await Product.findByIdAndUpdate(
      productId,
      {
        name: trimmedName.toLowerCase(),
        brand,
        category, // Ensure this is an ID
        status: status === "true",
        variants: processedVariants,
      },
      { new: true },
    );

    return res.status(200).json({
      status: "success",
      message: "Product updated successfully",
    });
  } catch (err) {
    console.error("Error updating product:", err);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the product",
    });
  }
};

exports.getEditVariantController = async (req, res) => {
  const productId = req.params.id;
  try {
    console.log(productId);
    if (!productId) {
      return res.status(statusCodes.NOT_FOUND).json({
        title: "Invalid Request",
        message: "Variant not found",
      });
    }
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    if (!product.variants || !Array.isArray(product.variants)) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "No variants found for this product" });
    }

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/variantPage/adminEditVariantPage", {
        product,
      });
  } catch (err) {
    console.log(err);
    return res.status(statusCodes.SERVER_ERROR).json({
      title: "Server error",
      message: "Something went wrong",
    });
  }
};

exports.getAddVariantPage = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    return res
      .status(200)
      .render("adminPages/ProductPages/adminAddVariantPage", { product });
  } catch (err) {
    console.error("Error in getting add variant page : ", err);
    return res.status(500).redirect("/admin/products");
  }
};

exports.addVariantController = async (req, res) => {
  try {
    const productId = req.params.id;
    const { color, size, price, quantity } = req.body;

    // Validate inputs
    if (!color || !size || !price || !quantity) {
      return res.status(400).redirect("/admin/products");
    }

    // Find the product
    const product = await Product.findById(productId);
    console.log(productId);
    if (!product) {
      return res.redirect("/products?error=Product not found");
    }

    const existingVariant = product.variants.find(
      (variant) =>
        variant.color.toLowerCase() === color.toLowerCase() &&
        variant.size.toLowerCase() === size.toLowerCase(),
    );

    if (existingVariant) {
      return res.status(400).json({ message: "Variant already exists" });
    }

    // Process uploaded images
    const images = req.files.map((file, index) => ({
      url: `/images/products/${file.filename}`,
      order: index,
    }));

    // Create new variant
    const newVariant = {
      color,
      size,
      price: Number(price),
      quantity: Number(quantity),
      images,
    };

    // Add variant to product
    product.variants.push(newVariant);
    await product.save();
    return res.status(200).redirect(`/admin/products`);
  } catch (error) {
    console.error("Error adding variant:", error);
    return res.redirect(`/admin/products`);
  }
};
