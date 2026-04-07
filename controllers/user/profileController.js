const User = require("../../models/User");
const Address = require("../../models/Address");
const Order = require("../../models/Order");
const mongoose = require("mongoose");
const Product = require("../../models/Product");
const bcrypt = require("bcrypt");

exports.getUserProfilePage = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log(userId.userId);
    const user = await User.findById(userId);
    return res.render("userPages/profilePages/profilePage", { user });
  } catch (err) {
    console.error(err);
  }
};

exports.getUserAddressPage = async (req, res) => {
  const userId = req.session.userId;
  const user = await User.findById(userId);
  try {
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No userId found",
      });
    }

    const addresses = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) }, // Ensure only the current user's data is fetched
      },
      {
        $lookup: {
          from: "addresses",
          localField: "_id",
          foreignField: "userId",
          as: "userAddresses",
        },
      },
      {
        $project: { _id: 0, userAddresses: 1 }, // Remove user info, keep only addresses
      },
    ]);
    const userAddresses =
      addresses.length > 0 ? addresses[0].userAddresses : [];

    return res.status(200).render("userPages/profilePages/addressPage", {
      addresses: userAddresses,
      user,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.addAddressController = async (req, res) => {
  const userId = req.session.userId;

  const { type, streetAddress, city, state, zipCode, country } = req.body;
  try {
    console.log(type, streetAddress, city, state, zipCode, country);
    if (!type || !streetAddress || !city || !state || !zipCode || !country) {
      console.log("every field is not available");
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please fill all the fields",
      });
    }
    console.log("all fields are there ");
    if (type === "Home") {
      const homeAddress = await Address.findOne({ userId, type: "Home" });
      if (homeAddress) {
        console.log("there is already a home address");

        return res.status(400).json({
          status: "error",
          title: "Error",
          message: "Home address already exists",
        });
      }
    }
    const stateRegex = /^[A-Za-z\s]{2,50}$/;
    const countryRegex = /^[A-Za-z\s]{2,60}$/;
    const cityRegex = /^[A-Za-z\s]{2,50}$/;
    const zipCodeRegex = /^\d{6}$/;
    const streetAddressRegex = /^[A-Za-z0-9\s,.#-]{5,100}$/;

    if (!stateRegex.test(state)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for state name",
      });
    }
    if (!countryRegex.test(country)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for country name",
      });
    }
    if (!cityRegex.test(city)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for city name",
      });
    }
    if (!zipCodeRegex.test(zipCode)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for Zip Code",
      });
    }

    if (!streetAddressRegex.test(streetAddress)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for street address",
      });
    }
    console.log("saving the new address");

    const newAddress = new Address({
      userId,
      type,
      streetAddress,
      city,
      state,
      zipCode,
      country,
    });

    await newAddress.save();

    if (!newAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found or something wrong in adding address",
      });
    }

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Address updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server Error",
    });
  }
};

exports.editProfileController = async (req, res) => {
  const { phone } = req.body;
  const userId = req.session.userId;
  try {
    if (!phone) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please fill the field",
      });
    }

    const phoneRegex = /^\d{10}$/;
    const validRegex = phoneRegex.test(phone);
    if (!validRegex) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid syntax",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { phone },
      { new: true },
    );
    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found ",
      });
    }

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "User updated Successfully",
    });
  } catch (err) {
    console.error("Edit profile error : ", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong...",
    });
  }
};

exports.deleteAddressController = async (req, res) => {
  const addressId = req.params.id;
  try {
    if (!addressId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Some credentials missing",
      });
    }

    const deleteAddress = await Address.findOneAndDelete({
      _id: addressId,
      userId: req.session.userId,
    });
    if (!deleteAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Error in finding address before deleting",
      });
    }

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong in deleting address",
    });
  }
};

exports.getEditAddressPage = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId;
    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    const user = await User.findOne({ _id: userId });
    if (!user)
      return res
        .status(400)
        .json({ status: "error", title: "error", message: "User not found" });
    return res
      .status(200)
      .render("userPages/profilePages/editAddressPage", { address, user });
  } catch (err) {
    console.error("Error in loading edit address Page : ", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.editAddressController = async (req, res) => {
  try {
    const { type, streetAddress, city, state, zipCode, country } = req.body;
    if (!type) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please add an address type",
      });
    }
    if (!streetAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please enter street address",
      });
    }
    if (!city) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please enter a city",
      });
    }
    if (!state) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please enter a state",
      });
    }
    if (!zipCode) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please enter zipCode",
      });
    }
    if (!country) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please enter your country",
      });
    }
    const addressId = req.params.id;
    if (!addressId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Address id not found",
      });
    }

    const stateRegex = /^[A-Za-z\s]{2,50}$/;
    const countryRegex = /^[A-Za-z\s]{2,60}$/;
    const cityRegex = /^[A-Za-z\s]{2,50}$/;
    const zipCodeRegex = /^\d{6}$/;
    const streetAddressRegex = /^[A-Za-z0-9\s,.#-]{5,100}$/;

    if (!stateRegex.test(state)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for state name",
      });
    }
    if (!countryRegex.test(country)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for country name",
      });
    }
    if (!cityRegex.test(city)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for city name",
      });
    }
    if (!zipCodeRegex.test(zipCode)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for Zip Code",
      });
    }

    if (!streetAddressRegex.test(streetAddress)) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid format for street address",
      });
    }

    await Address.findByIdAndUpdate(
      addressId,
      {
        type,
        streetAddress,
        country,
        state,
        zipCode,
        city,
      },
      { new: true },
    );

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Address have been successfully updated",
    });
  } catch (err) {
    console.error("Error in editing user address : ", err);
  }
};

exports.getOrdersPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    if (!orders) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Couldn't find your orders",
      });
    }

    console.log("orders : ", orders);

    orders.forEach((order) => console.log("items ; ", order.items));

    return res
      .status(200)
      .render("userPages/profilePages/orderPage", { orders, user });
  } catch (err) {
    console.error(err);
    return res.status;
  }
};

exports.cancelOrderController = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Order not found",
      });
    }

    if (order.userId.toString() !== req.session.userId.toString()) {
      return res.status(403).json({
        status: "error",
        title: "error",
        message: "You are not authorized to cancel the order",
      });
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    const items = order.items;
    for (const item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "variants._id": item.variantId,
        },
        {
          $inc: { "variants.$.quantity": +item.quantity },
        },
        { new: true },
      );
      if (!updatedProduct) {
        return res.status(400).json({
          status: "error",
          title: "Error",
          message: `Error updating stock for product ${item.name}`,
        });
      }

      item.status = "cancelled";
    }

    const user = await User.findById(order.userId);
    if (!user)
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: `Couldn't find user`,
      });

    order.status = "cancelled";

    // Refund to wallet if order was paid
    if (order.payment_status === "paid") {
      order.payment_status = "refunded";
      const refundAmount = order.grandTotal;
      user.wallet += refundAmount;

      const walletTransaction = {
        type: "credit",
        description: `Order cancellation refund for Order #${order.orderId}`,
        amount: refundAmount,
        date: new Date(),
      };
      user.walletTransactions.push(walletTransaction);
    }

    await order.save();
    await user.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message:
        "Order cancelled successfully. Stock has been restored and refund processed.",
      order,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.getResetPassword = async (req, res) => {
  try {
    console.log("sessionId : ", req.session.userId);

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found",
      });
    }
    if (user.googleId) {
      return res.status(400).redirect("/profile");
    }
    return res
      .status(200)
      .render("userPages/profilePages/passwordPage", { user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.getWalletTransactionsPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found",
      });
    }
    const transactions = user.walletTransactions;
    const walletBalance = user.wallet;
    console.log("Transactions : ", transactions);
    return res.status(200).render("userPages/profilePages/transactionsPage", {
      transactions,
      user,
      walletBalance,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.resetPasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findOne({ _id: req.session.userId });

    if (!user) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No user found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Incorrect Current Password",
      });
    }

    const newUserPassword = await bcrypt.hash(newPassword, 10);
    if (!newUserPassword) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Couldn't hash password",
      });
    }

    user.password = newUserPassword;
    await user.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.returnOrderController = async (req, res) => {
  console.log("order returning started");
  const orderId = req.params.id;
  try {
    const cancelledOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "return_requested",
      },
      { new: true },
    );

    if (!cancelledOrder)
      return res.status(404).json({
        status: "error",
        title: "Error",
        message: "Order not found",
      });

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Request accepted",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.cancelItemController = async (req, res) => {
  try {
    const { variantId, productId, orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: "failed",
        message: "Order not found",
      });
    }

    const item = order.items.find(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId.toString() === variantId,
    );

    if (!item) {
      return res.status(404).json({
        status: "failed",
        message: "Item not found",
      });
    }

    if (item.status !== "pending") {
      return res.status(400).json({
        status: "failed",
        message: "Item cannot be cancelled",
      });
    }

    item.status = "cancelled";

    // refund logic if prepaid
    if (order.payment_status === "paid") {
      const user = await User.findById(order.userId);
      const refundAmount = item.paidAmount;
      user.wallet += refundAmount;

      const walletTransaction = {
        type: "credit",
        description: `Order cancellation refund for Order #${order.orderId} item`,
        amount: refundAmount,
        date: new Date(),
      };
      user.walletTransactions.push(walletTransaction);
      await user.save();
    }

    const allItemsCancelled = order.items.every(
      (i) => i.status === "cancelled",
    );

    if (allItemsCancelled) {
      order.status = "cancelled";
    }
    await Product.findOneAndUpdate(
      {
        _id: productId,
        "variants._id": variantId,
      },
      {
        $inc: { "variants.$.quantity": item.quantity },
      },
    );
    await order.save();

    res.json({
      status: "success",
      message: "Item cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel item error:", error);

    res.status(500).json({
      status: "failed",
      message: "Server error",
    });
  }
};

exports.returnItemController = async (req, res) => {
  try {
    const { variantId, productId, orderId, reason } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: "failed",
        message: "Order not found",
      });
    }

    const item = order.items.find(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId.toString() === variantId,
    );

    if (!item) {
      return res.status(404).json({
        status: "failed",
        message: "Item not found in order",
      });
    }

    if (item.status === "delivered") {
      item.status = "return_requested";
      item.returnReason = reason;

      await order.save();

      res.json({
        status: "success",
        message: "Return request submitted",
      });
    } else {
      return res.status(400).json({
        status: "failed",
        message: "Item cannot be returned",
      });
    }
  } catch (error) {
    console.error("Return item error:", error);
    res.status(500).json({
      status: "failed",
      message: "Server error",
    });
  }
};
