const Product = require("../../models/Product");
const Category = require("../../models/Category");

exports.getHomePage = async (req, res) => {
  try {

    const products = await Product.find();
    const categories = await Category.find();

    const isLoggedIn = req.isAuthenticated();

 
    return res.render("userPages/homePage", {
      products,
      categories,
      isLoggedIn,
      user:req.user || null
    });
  } catch (err) {
    console.log('Error in loading home page : ',err);
    return res.status(500).render('error')
  }
};
