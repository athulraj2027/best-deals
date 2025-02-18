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


module.exports = {
  uploadCategoryImages,
  uploadProductImages,
};
