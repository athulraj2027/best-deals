const Product = require("../../models/Product");
const Category = require("../../models/Category");
const cloudinary = require("../../config/cloudinary");
const DatauriParser = require("datauri/parser");
const mongoose = require("mongoose");
const parser = new DatauriParser();
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
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
    const { productName, brand, actualPrice, category, status, variants } =
      req.body;
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
      name: productName,
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

// --- Helper function for edit product ---

async function deleteImageFile(imageUrl) {
  try {
    if (!imageUrl) return;
    const imagePath = path.join(
      __dirname,
      "../../public/images/products",
      new URL(imageUrl).pathname
    );
    await fs.unlink(imagePath);
  } catch (err) {
    console.error(err);
  }
}
// --- Edit product controller ---

exports.editProductController = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, brand, actualPrice, category, status, variants } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({
        title: "Error",
        message: " Product not found",
      });
    }
    const processedVariants = await Promise.all(
      variants.map(async (variant, index) => {
        const processedVariant = {
          color: variant.color,
          price: variant.price,
          quantity: variant.quantity,
          images: [],
        };

        const currentVariantImages = product.variants[index]?.images || [];
        const keepImages = new Set();

        if (variant.existingImages) {
          const existingImages = Array.isArray(variant.existingImages)
            ? variant.existingImages
            : [variant.existingImages];

          existingImages.forEach((url) => {
            keepImages.add(url);
            processedVariant.images.push({ url });
          });
        }
        for (const images of currentVariantImages) {
          if (!keepImages.has(image.url)) {
            await deleteImageFile(image.url);
          }
        }

        if (req.files && req.files[`variants[${index}][newImages]`]) {
          const newImages = req.files[`variants[${index}][newImages]`];

          const totalImages = processedVariant.images.length + newImages.length;
          if (totalImages > 3) {
            const excessImages = newImages.slice(
              3 - processedVariant.images.length
            );
            for (const file of excessImages) {
              await deleteImageFile(`/public/images/products/${file.filename}`);
            }
            newImages.splice(3 - processedVariant.images.length);
          }
          const uploadedImages = newImages.map((file) => ({
            url: `/public/images/products/${file.filename}`,
          }));
          processedVariant.images.push(...uploadedImages);
        }
        return processedVariant;
      })
    );

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        brand,
        actualPrice,
        category,
        status: status === "true",
        variants: processedVariants,
      },
      { new: true }
    );

    return res.status(201).json({
      title: "success",
      message: "Product added successfully",
    });
  } catch (err) {
    console.error(err);
  }
};
exports.getEditVariantController = async (req, res) => {
  const productId = req.params.id;
  // const variantId = req.params.variantId;
  try {
    console.log(productId);
    if (!productId) {
      return res.status(400).json({
        title: "Invalid Request",
        message: "Variant not found",
      });
    }
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.variants || !Array.isArray(product.variants)) {
      return res
        .status(404)
        .json({ message: "No variants found for this product" });
    }

    return res
      .status(200)
      .render("adminPages/variantPage/adminEditVariantPage", {
        product,
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      title: "Server error",
      message: "Something went wrong",
    });
  }
};
