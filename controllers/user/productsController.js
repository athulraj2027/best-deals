const Product = require("../../models/Product");

exports.getProductViewPage = async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId);
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: productId },
  }).limit(4);
  try {
    return res.render("userPages/productPage", { product, relatedProducts });
  } catch (err) {
    console.log(err);
    return res.render("serverError");
  }
};
