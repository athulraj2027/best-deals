const User = require("../../models/User");
const statusCodes = require("../../services/statusCodes");

exports.viewUser = async (req, res) => {
  try {
    const customerId = req.params.id;
    const user = await User.findById(customerId);
    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CustomerPages/adminCustomerView", {
        user,
      });
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR).redirect("/admin/users");
  }
};

exports.viewUsersPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page
    const skip = (page - 1) * limit;

    const customers = await User.find().skip(skip).limit(limit);
    const totalCustomers = await User.countDocuments(); // Total users count
    const totalPages = Math.ceil(totalCustomers / limit);

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CustomerPages/adminCustomers", {
        customers,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
      });
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR).redirect("/admin/dashboard");
  }
};

exports.listingUsersController = async (req, res) => {
  const customerId = req.params.id;
  const customer = await User.findById(customerId);
  try {
  } catch (err) {
    console.log(err);
    return res.status(statusCodes.SERVER_ERROR).redirect("/admin/dashboard");
  }
};

exports.blockCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    await User.findByIdAndUpdate(customerId, { isActive: false }); // Set status to false
    res.status(200).redirect("/admin/customers");
  } catch (err) {
    console.error("Error blocking customer:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.unblockCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    await User.findByIdAndUpdate(customerId, { isActive: true }); // Set status to true
    res.redirect("/admin/customers");
  } catch (err) {
    console.error("Error unblocking customer:", err);
    res.status(500).send("Internal Server Error");
  }
};

// exports.unlistCustomer = async (req, res) => {
//   try {
//     const customerId = req.params.customerId;
//     await User.findByIdAndUpdate(customerId, { isListed: false }); // Set isListed to false
//     res.redirect("/admin/customers");
//   } catch (err) {
//     console.error("Error unlisting customer:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };

// exports.listCustomer = async (req, res) => {
//   try {
//     const customerId = req.params.customerId;
//     console.log(customerId);
//     await User.findByIdAndUpdate(customerId, { isListed: true }); // Set isListed to true
//     res.redirect("/admin/customers");
//   } catch (err) {
//     console.error("Error listing customer:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };
