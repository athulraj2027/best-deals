const Product = require("../../models/Product");
const Category = require("../../models/Category");
const statusCodes = require("../../services/statusCodes");

exports.getHomePage = async (req, res) => {
  try {
    console.log(req.session.userId);
    const rawProducts = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $match: { "category.status": "listed" } },
      { $match: { status: true } },
    ]);

    const products = rawProducts.map((product) => {
      const lowestPrice =
        product.variants.length > 0
          ? Math.min(...product.variants.map((v) => v.price))
          : product.actualPrice;

      let imageUrl = "/images/default-product.jpg";
      for (const variant of product.variants) {
        if (variant.images && variant.images.length > 0) {
          imageUrl = variant.images[0].url;
          break;
        }
      }

      console.log("imageurl : ", imageUrl);

      return {
        _id: product._id,
        name: product.name,
        brand: product.brand,
        price: lowestPrice,
        imageUrl: imageUrl,
        category: product.category,
        status: product.status,
      };
    });

    const categories = await Category.find({ status: "listed" });
    const isLoggedIn = req.isAuthenticated();
    console.log("products ; ", products);

    return res.status(statusCodes.SUCCESS).render("userPages/homePage", {
      products,
      categories,
      isLoggedIn,
      userId: req.session.userId || null,
    });
  } catch (err) {
    console.log("Error in loading home page: ", err);
    return res.status(statusCodes.SERVER_ERROR).render("serverError", {
      error: err.message || "Failed to load home page",
    });
  }
};
