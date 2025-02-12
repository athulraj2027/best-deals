const Product = require("../../models/Product");
const Category = require("../../models/Category");

exports.getHomePage = async (req, res) => {
  try {
    // the await method for both the models take more time we can use promise for that so it works simultaneously
    // const products = await Product.find({}).limit(5);
    // const categories = await Category.find().limit(5);

    const products = await Product.find({}).limit(5);
    const categories = await Category.find().limit(5);

    const isLoggedIn = req.isAuthenticated();

    console.log(categories);
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
