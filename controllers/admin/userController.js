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
    const customers = await User.find();
    res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CustomerPages/adminCustomers", { customers });
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
