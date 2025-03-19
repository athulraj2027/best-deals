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
    } = req.query;
const filter = {}
const sortOption = {}
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const matchConditions = [{ "category.status": "listed" }, { status: true }];

    if (category) {
      const categoryObj = await Category.findOne({ name: category });
      if (categoryObj) {
        matchConditions.push({
          category: new mongoose.Types.ObjectId(categoryObj._id),
        });
        
      }
    }

    if (brand) {
      matchConditions.push({ brand: brand });
    }

    matchConditions.push({
      actualPrice: {
        $gte: parseInt(minPrice),
        $lte: parseInt(maxPrice),
      },
    });

    if (inStock === "true") {
      matchConditions.push({ inStock: true });
    }

    if (deals === "true") {
      matchConditions.push({ onSale: true });
    }

    const matchStage = {
      $match: {
        $and: matchConditions,
      },
    };

    // Set up sorting
    let sortStage = { $sort: { featured: -1 } }; // Default sort
    switch (sort) {
      case "price-asc":
        sortStage = { $sort: { actualPrice: 1 } };
        break;
      case "price-desc":
        sortStage = { $sort: { actualPrice: -1 } };
        break;
      case "newest":
        sortStage = { $sort: { createdAt: -1 } };
        break;
      case "popular":
        sortStage = { $sort: { popularity: -1 } };
        break;
    }

    // Build the aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      matchStage,
      sortStage,
      { $skip: skip },
      { $limit: limitNum },
    ];

    // Execute the aggregation pipeline
    const products = await Product.aggregate(pipeline);

    // Count total products that match our filters (without pagination)
    const countPipeline = [
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      matchStage,
      { $count: "total" },
    ];

    const countResult = await Product.aggregate(countPipeline);
    const totalProducts = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Get all categories for the filter section
    const categories = await Category.find({ status: "listed" });

    // Render the shop page with data and current filters
    res.render("userPages/shopPage", {
      products,
      categories,
      currentPage: pageNum,
      totalPages,
      filters: {
        category,
        brand,
        minPrice,
        maxPrice,
        inStock,
        deals,
        sort,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("userPages/shopPage", {
      products: [],
      categories: [],
      currentPage: 1, // Add this
      totalPages: 1, // Add this
      error:
        "An error occurred while loading products. Please try again later.",
    });
  }
};
