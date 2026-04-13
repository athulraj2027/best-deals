const Product = require("../../models/Product");
const statusCodes = require("../../services/statusCodes");
const Category = require("../../models/Category");
const {
  determineBestOffer,
} = require("../../services/offers/determineBestOffer");

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
    let query = { status: true };

    const listedCategories = await Category.find({ status: "listed" }).select(
      "_id",
    );
    query.category = { $in: listedCategories.map((c) => c._id) };

    // Handle search
    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Handle category
    if (category && category !== "all" && category !== "") {
      try {
        const categoryObj = await Category.findOne({
          name: category,
          status: "listed",
        });
      } catch (error) {
        console.error("Error finding category:", error);
      }
    }

    // Handle brand
    if (brand && brand !== "all" && brand !== "") {
      query.brand = brand;
    }

    // Handle price range
    const minPriceVal = parseInt(minPrice);
    const maxPriceVal = parseInt(maxPrice);
    if (!isNaN(minPriceVal) && !isNaN(maxPriceVal)) {
      query["variants.price"] = {
        $gte: minPriceVal,
        $lte: maxPriceVal,
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
    let products = await Product.find(query)
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    // Calculate prices with offers for each product
    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const productObj = product.toObject();
        // Get lowest price from variants
        if (product.variants && product.variants.length > 0) {
          const lowestVariant = product.variants.reduce((min, v) =>
            v.price < min.price ? v : min,
          );
          const bestOffer = await determineBestOffer(
            product,
            lowestVariant.price,
          );

          if (bestOffer) {
            productObj.displayPrice = bestOffer.discounted_price;
            productObj.originalPrice = lowestVariant.price;
            productObj.bestOffer = bestOffer;
          } else {
            productObj.displayPrice = lowestVariant.price;
            productObj.originalPrice = lowestVariant.price;
          }
        } else {
          const bestOffer = await determineBestOffer(
            product,
            product.actualPrice,
          );
          if (bestOffer) {
            productObj.displayPrice = bestOffer.discounted_price;
            productObj.originalPrice = product.actualPrice;
            productObj.bestOffer = bestOffer;
          } else {
            productObj.displayPrice = product.actualPrice;
            productObj.originalPrice = product.actualPrice;
          }
        }
        return productObj;
      }),
    );

    // Get categories for filter section
    const categories = await Category.find({ status: "listed" });

    // If AJAX request, return JSON
    if (req.query.ajax === "true") {
      return res.json({
        products: productsWithPrices,
        currentPage: pageNum,
        totalPages,
        totalProducts,
      });
    }

    // Render the shop page
    res.render("userPages/shopPage", {
      products: productsWithPrices,
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
