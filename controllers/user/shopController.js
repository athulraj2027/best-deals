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
    
    // Initial match conditions that are always applied
    const matchConditions = [];
    
    // Add core conditions - products must be listed with a listed category
    matchConditions.push({ status: true });
    
    // Handle search query
    if (search && search.trim() !== '') {
      // Create text search condition
      matchConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (category && category !== 'all' && category !== '') {
      try {
        const categoryObj = await Category.findOne({ name: category });
        if (categoryObj) {
          matchConditions.push({
            category: new mongoose.Types.ObjectId(categoryObj._id),
          });
        }
      } catch (error) {
        console.error("Error finding category:", error);
        // Continue without category filter if there's an error
      }
    }

    if (brand && brand !== 'all' && brand !== '') {
      matchConditions.push({ brand: brand });
    }

    // Only add price range if values are provided and valid
    const minPriceVal = parseInt(minPrice);
    const maxPriceVal = parseInt(maxPrice);
    if (!isNaN(minPriceVal) && !isNaN(maxPriceVal)) {
      matchConditions.push({
        actualPrice: {
          $gte: minPriceVal,
          $lte: maxPriceVal,
        },
      });
    }

    if (inStock === "true") {
      // Check if any variant has quantity > 0
      matchConditions.push({
        "variants.quantity": { $gt: 0 }
      });
    }

    if (deals === "true") {
      // Implement deals logic if you have it in your database
      // For example, if you have a discount field:
      // matchConditions.push({ discount: { $gt: 0 } });
    }

    // Construct the final match stage - use $and only if we have multiple conditions
    const matchStage = {
      $match: matchConditions.length > 1 ? { $and: matchConditions } : matchConditions[0] || {}
    };

    // Set up sorting - default to recent items if no sort specified
    let sortStage = { $sort: { createdAt: -1 } }; // Default sort
    
    if (sort) {
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
        case "name-asc":
          sortStage = { $sort: { name: 1 } };
          break;
        // Add other sort options as needed
      }
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
      { 
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true // Keep products even if category lookup fails
        }
      },
      matchStage,
      sortStage,
      { $skip: skip },
      { $limit: limitNum },
    ];

    // console.log("Pipeline:", JSON.stringify(pipeline, null, 2)); // Debug log

    // Execute the aggregation pipeline
    const products = await Product.aggregate(pipeline);
    
    console.log(`Found ${products.length} products`); // Debug log

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
      { 
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true
        }
      },
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
      error:
        "An error occurred while loading products. Please try again later.",
    });
  }
};