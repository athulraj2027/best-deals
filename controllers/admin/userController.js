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
    const { sort } = req.query;
    let sortOption = {};

    switch (sort) {
      case "desc":
        sortOption = { createdAt: -1 };
        break;
      case "asc":
        sortOption = { createdAt: 1 };
        break;
      case "name_desc":
        sortOption = { name: -1 };
        break;
      case "name_asc":
        sortOption = { name: 1 };
        break;
    }
    
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page
    const skip = (page - 1) * limit;

    const customers = await User.find().sort(sortOption).skip(skip).limit(limit);
    const totalCustomers = await User.countDocuments(); // Total users count
    const totalPages = Math.ceil(totalCustomers / limit);

    return res
      .status(statusCodes.SUCCESS)
      .render("adminPages/CustomerPages/adminCustomers", {
        customers,
        currentPage: page,
        selectedSort : sort,
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
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: true }); // Set status to false

    req.sessionStore.all((err, sessions) => {
      if (err) {
        console.error("Error fetching sessions:", err);
        return res.status(500).json({ error: "Failed to fetch sessions" });
      }

      // Iterate through sessions and destroy the session of the blocked user
      for (let sessionID in sessions) {
        if (
          sessions[sessionID].userId &&
          sessions[sessionID].userId.toString() === userId
        ) {
          req.sessionStore.destroy(sessionID, (err) => {
            if (err) {
              console.error("Error destroying session:", err);
            } else {
              console.log(
                `Session ${sessionID} destroyed for blocked user ${userId}`
              );
            }
          });
        }
      }
    });
    res.status(200).redirect("/admin/customers");
  } catch (err) {
    console.error("Error blocking customer:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.unblockCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    await User.findByIdAndUpdate(customerId, { isBlocked: false }); // Set status to true
    res.redirect("/admin/customers");
  } catch (err) {
    console.error("Error unblocking customer:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateWallet = async (req, res) => {
  try {
    const userId = req.params.id;
    const { amount, type, description } = req.body; // type: 'credit' or 'debit'

    if (!amount || !type) {
      return res.status(400).json({
        status: "error",
        message: "Amount and type are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid amount",
      });
    }

    if (type === "credit") {
      user.wallet += amountNum;
    } else if (type === "debit") {
      if (user.wallet < amountNum) {
        return res.status(400).json({
          status: "error",
          message: "Insufficient wallet balance",
        });
      }
      user.wallet -= amountNum;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Invalid type. Use 'credit' or 'debit'",
      });
    }

    user.walletTransactions.push({
      type: type,
      amount: amountNum,
      description: description || `Admin ${type === "credit" ? "added" : "deducted"} wallet balance`,
      date: new Date(),
    });

    await user.save();

    return res.status(200).json({
      status: "success",
      message: `Wallet ${type === "credit" ? "credited" : "debited"} successfully`,
      newBalance: user.wallet,
    });
  } catch (err) {
    console.error("Error updating wallet:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("wallet walletTransactions");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      wallet: user.wallet,
      transactions: user.walletTransactions || [],
    });
  } catch (err) {
    console.error("Error fetching wallet transactions:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
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
