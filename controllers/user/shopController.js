const Product = require("../../models/Product");
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
      search,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let query = { status: true };

    // ✅ Get listed categories
    const listedCategories = await Category.find({ status: "listed" }).select(
      "_id",
    );
    const listedCategoryIds = listedCategories.map((c) => c._id);

    // Default category filter (only listed)
    query.category = { $in: listedCategoryIds };

    // ✅ Search
    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { brand: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // ✅ Category filter
    if (category && category !== "all" && category !== "") {
      const categoryObj = await Category.findOne({
        name: category,
        status: "listed",
      });

      if (categoryObj) {
        query.category = categoryObj._id;
      } else {
        query.category = null; // No results
      }
    }

    // ✅ Brand filter
    if (brand && brand !== "all" && brand !== "") {
      query.brand = brand;
    }

    // ✅ Variant filtering using $elemMatch (IMPORTANT)
    const minPriceVal = parseInt(minPrice);
    const maxPriceVal = parseInt(maxPrice);

    let variantFilter = {};

    if (!isNaN(minPriceVal) && !isNaN(maxPriceVal)) {
      variantFilter.price = { $gte: minPriceVal, $lte: maxPriceVal };
    }

    if (inStock === "true") {
      variantFilter.quantity = { $gt: 0 };
    }

    if (Object.keys(variantFilter).length > 0) {
      query.variants = { $elemMatch: variantFilter };
    }

    // ✅ Fetch products
    let products = await Product.find(query)
      .populate("category")
      .sort({ createdAt: -1 }) // default sort
      .skip(skip)
      .limit(limitNum);

    // ✅ Compute display price (with offers)
    let productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const productObj = product.toObject();

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
        }

        return productObj;
      }),
    );

    // ✅ Deals filter (after computing offers)
    if (deals === "true") {
      productsWithPrices = productsWithPrices.filter(
        (p) => p.bestOffer && p.bestOffer.discount > 0,
      );
    }

    // ✅ Sorting (AFTER computing price)
    if (sort) {
      switch (sort) {
        case "price-asc":
          productsWithPrices.sort((a, b) => a.displayPrice - b.displayPrice);
          break;
        case "price-desc":
          productsWithPrices.sort((a, b) => b.displayPrice - a.displayPrice);
          break;
        case "name-asc":
          productsWithPrices.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "newest":
          productsWithPrices.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          );
          break;
      }
    }

    // ✅ Count AFTER filters (important)
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // ✅ Categories for UI
    const categories = await Category.find({ status: "listed" });

    // ✅ AJAX response
    if (req.query.ajax === "true") {
      return res.json({
        products: productsWithPrices,
        currentPage: pageNum,
        totalPages,
        totalProducts,
      });
    }

    // ✅ Render page
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
      error: "Something went wrong. Please try again later.",
    });
  }
};
