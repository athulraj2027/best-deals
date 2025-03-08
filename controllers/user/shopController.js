const Product = require("../../models/Product");
const statusCodes = require("../../services/statusCodes");
const Category = require("../../models/Category");

exports.getShopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $match: { "category.status": "listed" } },
      {$match: {'status':true}}
    ]);

    const totalProducts = await Product.countDocuments();
    console.log(totalProducts)
    const categories = await Category.find({ status: "listed" });


    const totalPages = Math.ceil(totalProducts / limit);

    res.render("userPages/shopPage", {
      products,
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("userPages/shopPage", { products: [], error: err });
  }
};
