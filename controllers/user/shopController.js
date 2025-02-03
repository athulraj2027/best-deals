const Product = require('../../models/Product')
// const Category= require('../../models/Category')

exports.getShopPage = async (req, res) => {
  const products = await Product.find();
  res.render("userPages/shopPage", { products });
};