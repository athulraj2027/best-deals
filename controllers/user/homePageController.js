const Product = require("../../models/Product");
const Category = require("../../models/Category");

exports.getHomePage = async (req, res) => {
  try {
    // the await method for both the models take more time we can use promise for that so it works simultaneously
    // const products = await Product.find({}).limit(5);
    // const categories = await Category.find().limit(5);

    const [products, categories] = await Promise.all([
      Product.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name price images description"),
      Category.find({}).limit(5).select("name image"),
    ]);

    const isLoggedIn = req.isAuthenticated();

    console.log(isLoggedIn);
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
