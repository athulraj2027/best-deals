const Product = require("../../models/Product");
const statusCodes = require("../../services/statusCodes");
const Category = require("../../models/Category");
const mongoose = require("mongoose");
exports.getShopPage = async (req, res) => {
  try {
    const {
      category,
      brand,
      minPrice = 0,
      maxPrice = 2000,
      inStock,
      deals,
      sort,
      page = 1,
      limit = 10,
      search, // New search parameter
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build base query - this will be for direct find() operation
    let query = { status: true };
    
    // Handle search
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Handle category
    if (category && category !== 'all' && category !== '') {
      try {
        const categoryObj = await Category.findOne({ name: category });
        if (categoryObj) {
          query.category = categoryObj._id;
        }
      } catch (error) {
        console.error("Error finding category:", error);
      }
    }

    // Handle brand
    if (brand && brand !== 'all' && brand !== '') {
      query.brand = brand;
    }

    // Handle price range
    const minPriceVal = parseInt(minPrice);
    const maxPriceVal = parseInt(maxPrice);
    if (!isNaN(minPriceVal) && !isNaN(maxPriceVal)) {
      query.actualPrice = {
        $gte: minPriceVal,
        $lte: maxPriceVal
      };
    }

    // Handle in-stock
    if (inStock === "true") {
      query["variants.quantity"] = { $gt: 0 };
    }

    // Handle deals if applicable
    if (deals === "true") {
      // Add appropriate deal condition
    }

    console.log("Query:", JSON.stringify(query, null, 2));

    // Determine sort order
    let sortOption = { createdAt: -1 }; // Default sort
    
    if (sort) {
      switch (sort) {
        case "price-asc":
          sortOption = { actualPrice: 1 };
          break;
        case "price-desc":
          sortOption = { actualPrice: -1 };
          break;
        case "newest":
          sortOption = { createdAt: -1 };
          break;
        case "name-asc":
          sortOption = { name: 1 };
          break;
      }
    }

    // First, get count of matching products
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Then get the products with populated categories
    const products = await Product.find(query)
      .populate('category')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    console.log(`Found ${products.length} products out of ${totalProducts} total matches`);

    // Get categories for filter section
    const categories = await Category.find({ status: "listed" });

    // Render the shop page
    res.render("userPages/shopPage", {
      products,
      categories,
      currentPage: pageNum,
      totalPages,
      filters: {
        category,
        brand,
        minPrice: minPriceVal,
        maxPrice: maxPriceVal,
        inStock,
        deals,
        sort,
        search,
      },
    });
  } catch (err) {
    console.error("Shop page error:", err);
    res.status(500).render("userPages/shopPage", {
      products: [],
      categories: [],
      currentPage: 1,
      totalPages: 1,
      error: "An error occurred while loading products. Please try again later.",
    });
  }
};