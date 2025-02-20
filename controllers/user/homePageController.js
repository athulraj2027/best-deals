const Product = require("../../models/Product");
const Category = require("../../models/Category");
const statusCodes = require("../../services/statusCodes");

exports.getHomePage = async (req, res) => {
  try {
    console.log(req.session.email);

    const rawProducts = await Product.find({ status: true })
      .sort({ createdAt: -1 })
      .limit(5);

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

    const categories = await Category.find();
    const isLoggedIn = req.isAuthenticated();

    return res.status(statusCodes.SUCCESS).render("userPages/homePage", {
      products,
      categories,
      isLoggedIn,
      userId: req.session.userId || null,
    });
  } catch (err) {
    console.log("Error in loading home page: ", err);
    return res.status(statusCodes.SERVER_ERROR).render("error");
  }
};
