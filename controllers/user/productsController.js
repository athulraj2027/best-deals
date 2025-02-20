const Product = require("../../models/Product");

exports.getProductViewPage = async (req, res) => {
  try {
    const productId = req.productId;
    
    // Find the product by ID
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/');
    }

    // You might want to fetch related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id } // exclude current product
    }).limit(4);

    // Render the product detail page
    res.render('userPages/productPage', {
      title: product.name,
      product,
      relatedProducts,
     
    });
  } catch (err) {
    console.error('Error fetching product details:', err);
    // req.flash('error', 'Something went wrong, please try again');
    res.redirect('/');
  }
}
;
