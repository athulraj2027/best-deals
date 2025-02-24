const Product = require("../../models/Product");
const statusCodes = require("../../services/statusCodes");
// const Category= require('../../models/Category')

exports.getShopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch products with pagination
    const products = await Product.find().skip(skip).limit(limit);
    const totalProducts = await Product.countDocuments();

    // Check if products exist
    if (!products || products.length === 0) {
      return res.status(400).redirect("/");
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("userPages/shopPage", {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("userPages/shopPage", { products: [], error: err });
  }
};

