const Product = require("../../models/Product");
const statusCodes = require("../../services/statusCodes");
// const Category= require('../../models/Category')

exports.getShopPage = async (req, res) => {
  const products = await Product.find();
  try {
    if (!products) {
      return res.status(statusCodes.BAD_REQUEST).redirect("/");
    }
    res.render("userPages/shopPage", { products });
  } catch (err) {
    console.error(err);
    res
      .status(statusCodes.SERVER_ERROR)
      .render("userPages/shopPage", { products });
  }
};
