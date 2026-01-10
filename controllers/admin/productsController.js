const Product = require("../../models/Product");
const Category = require("../../models/Category");
const cloudinary = require("../../config/cloudinary");
const DatauriParser = require("datauri/parser");
const mongoose = require("mongoose");
const parser = new DatauriParser();
const sharp = require("sharp");
const path = require("path");
const statusCodes = require("../../services/statusCodes");
const fs = require("fs").promises;

const bufferToDataURI = (fileFormat, buffer) => {
  parser.format(fileFormat, buffer);
};

// const uploadToCloudinary = async (file) => {
//   try {
//     const fileFormat = file.mimetype.split("/")[1];
//     const { base64 } = bufferToDataURI(fileFormat, file.buffer);

//     const uploadResponse = await cloudinary.uploader.upload(
//       `data:image/${fileFormat};base64,${base64}`,
//       {
//         folder: "products",
//         resource_type: "auto",
//         transformation: [
//           { width: 800, height: 800, crop: "limit" },
//           { quality: "auto" },
//           { fetch_format: "auto" },
//         ],
//       }
//     );
//     return {
//       url: uploadResponse.secure_url,
//       publicId: uploadResponse.public_id,
//     };
//   } catch (err) {
//     throw new Error(`Failed to upload image : ${error.message}`);
//   }
// };

// --- Get products page

exports.getProductsPage = async (req, res) => {
  try {
    const { category, sort } = req.query;
    let filter = {};
    let sortOption = {};

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const categories = await Category.find({ status: "listed" });

    if (category && category !== "all") {
      filter.category = category;
    }

    switch (sort) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "price_high":
        sortOption = { actualPrice: -1 };
        break;
      case "price_low":
        sortOption = { actualPrice: 1 };
        break;
    }

    let products = await Product.find(filter)
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/ProductPages/adminProducts", {
        products,
        categories,
        selectedCategory: category,
        selectedSort: sort,
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
      `Skipping invalid image for variant ${variantIndex}, image ${imageIndex}`
    );
    return null;
  }

  const fileName = `variant-${variantIndex}-${imageIndex}-${Date.now()}.jpg`;
  const filePath = path.join(
    __dirname,
    "../../public/images/products/",
    fileName
  );
  console.log("filepath : ", filePath);
  await fs.writeFile(filePath, buffer);
  return `/images/products/${fileName}`;
}

//--- Post add product controller ---

exports.addProductController = async (req, res) => {
  try {
    // console.log("Hi the addproductController is working");
    const {
      name,
      description,
      brand,
      actualPrice,
      category,
      status,
      variants,
    } = req.body;
    let categoryId;
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
    console.log(req.files);
    const parsedVariants =
      typeof variants === "string" ? JSON.parse(variants) : variants;
    const processedVariants = [];
    console.log(req.files);

    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      const variantImages = req.files.filter(
        (file) => file.fieldname === `variants[${i}][images][]`
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
      console.log("processedImages : ", processedImages);

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
      actualPrice: parseFloat(actualPrice),
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
      { new: true }
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
      { new: true }
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
    const { name, brand, actualPrice, category, status, variants } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(statusCodes.NOT_FOUND).json({
        title: "Error",
        message: "Product not found",
      });
    }

    const nameRegex = /^[a-zA-Z0-9][a-zA-Z0-9\s&.,'-]{2,99}$/;
    const trimmedName = name.trim();
    const lowercaseName = trimmedName.toLowerCase();
    const isNameValid = nameRegex.test(lowercaseName);
    if (!isNameValid)
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Name syntax invalid",
      });

    const processedVariants = await Promise.all(
      variants.map(async (variant, variantIndex) => {
        // Basic variant properties
        const processedVariant = {
          color: variant.color,
          size: variant.size,
          price: variant.price,
          quantity: variant.quantity,
          images: [],
        };

        // Get current images for this variant
        const currentVariantImages =
          product.variants[variantIndex]?.images || [];

        // 1. Process existing images (tracked in hidden inputs)
        if (variant.existingImages) {
          // Convert existingImages to array if it's not already
          const existingImages = Array.isArray(variant.existingImages)
            ? Object.values(variant.existingImages)
            : [variant.existingImages];

          // Add each existing image that's being kept
          existingImages.forEach((img) => {
            if (img && img.url) {
              processedVariant.images.push({
                url: img.url,
                position: parseInt(img.position || 0),
              });
            }
          });
        }

        // 2. Process deleted images
        if (variant.deletedImages) {
          const deletedImages = Array.isArray(variant.deletedImages)
            ? variant.deletedImages
            : [variant.deletedImages];

          // Delete image files for removed images
          for (const imageUrl of deletedImages) {
            await deleteImageFile(imageUrl);
          }

          // Filter out deleted images from current ones
          const deletedImageSet = new Set(deletedImages);
          currentVariantImages.forEach((img) => {
            if (
              !deletedImageSet.has(img.url) &&
              !processedVariant.images.some(
                (existing) => existing.url === img.url
              )
            ) {
              processedVariant.images.push(img);
            }
          });
        }

        // 3. Process replacement images
        for (let position = 0; position < 3; position++) {
          const fileFieldName = `variants[${variantIndex}][replaceImage][${position}]`;

          if (req.files && req.files[fileFieldName]) {
            const file = req.files[fileFieldName][0]; // Get the uploaded file

            // Generate the new image URL
            const newImageUrl = `/images/products/${file.filename}`;

            // Check if we're replacing an existing image
            const replacePosition =
              variant.replaceImagePosition &&
              variant.replaceImagePosition[position]
                ? parseInt(variant.replaceImagePosition[position])
                : position;

            // Find and remove the image being replaced at this position
            const replacedImageIndex = processedVariant.images.findIndex(
              (img) => img.position === replacePosition
            );

            if (replacedImageIndex !== -1) {
              // Delete the old image file
              await deleteImageFile(
                processedVariant.images[replacedImageIndex].url
              );
              // Replace with new image
              processedVariant.images[replacedImageIndex] = {
                url: newImageUrl,
                position: replacePosition,
              };
            } else {
              // Add as new image
              processedVariant.images.push({
                url: newImageUrl,
                position: replacePosition,
              });
            }
          }
        }

        // Ensure we have at most 3 images, sorted by position
        processedVariant.images = processedVariant.images
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .slice(0, 3);

        return processedVariant;
      })
    );
    // const productCategory = await Category.findOne({ category });
    // if (!productCategory) {
    //   return res.status(400).json({
    //     status: "error",
    //     title: "Error",
    //     message: "Invalid category",
    //   });
    // }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name:lowercaseName,
        brand,
        actualPrice,
        category:category._id,
        status: status === "true",
        variants: processedVariants,
      },
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Product updated successfully",
    });
  } catch (err) {
    console.error("Error updating product:", err);
    return res.status(statusCodes.SERVER_ERROR).json({
      title: "Error",
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
    console.log("New variant added");
    return res.status(200).redirect(`/admin/products`);
  } catch (error) {
    console.error("Error adding variant:", error);
    return res.redirect(`/admin/products`);
  }
};
