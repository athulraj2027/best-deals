const multer = require("multer");
const path = require("path");
const storage = multer.memoryStorage();

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join("../public/images/categories/"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join("../public/images/products/"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadCategoryImages = multer({
  storage: categoryStorage,
}).single("categoryImage");

const uploadProductImages =  multer({
  storage: productStorage,
  limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
      } else {
          cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
      }
  }
});

function generateFieldNames(maxVariants, maxPositions) {
  const fields = [];
  
  for (let i = 0; i < maxVariants; i++) {
    // Add fields for replacement images (for editing existing images)
    for (let j = 0; j < maxPositions; j++) {
      fields.push({ 
        name: `variants[${i}][replaceImage][${j}]`, 
        maxCount: 1 
      });
    }
    
    // For adding new images to existing variants
    fields.push({ 
      name: `variants[${i}][newImages]`, 
      maxCount: 3 
    });
  }
  
  return fields;
}

const productEditImageUpload = uploadProductImages.fields(generateFieldNames(10, 3)); // Support up to 10 variants with 3 images each

module.exports = {
  uploadCategoryImages,
  uploadProductImages,
  productEditImageUpload
};
