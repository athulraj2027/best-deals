const Product = require("../../models/Product");
const statusCodes = require("../../services/statusCodes");

exports.getProductViewPage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }

    if (product.status != true) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }
    if (product.category.status != "listed")
      return res.status(500).redirect("/");

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id }, // exclude current product
    }).limit(4);

    res.status(statusCodes.SUCCESS).render("userPages/productPage", {
      title: product.name,
      product,
      relatedProducts,
    });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(statusCodes.SERVER_ERROR).redirect("/");
  }
};
