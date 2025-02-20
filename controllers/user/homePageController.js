const Product = require("../../models/Product");
const Category = require("../../models/Category");

exports.getHomePage = async (req, res) => {
  try {
    // Get products and transform them to include variant images and pricing
    const rawProducts = await Product.find({ status: true })
      .sort({ createdAt: -1 })
      .limit(5);

    // Transform products to make them easier to use in the template
    const products = rawProducts.map((product) => {
      // Get the lowest price from all variants
      const lowestPrice =
        product.variants.length > 0
          ? Math.min(...product.variants.map((v) => v.price))
          : product.actualPrice;

      // Get the first image from the first variant with images
      let imageUrl = "/images/default-product.jpg"; // Default fallback image
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

    return res.render("userPages/homePage", {
      products,
      categories,
      isLoggedIn,
      user: req.user || null,
    });
  } catch (err) {
    console.log("Error in loading home page: ", err);
    return res.status(500).render("error");
  }
};
