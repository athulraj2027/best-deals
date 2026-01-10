const Order = require("../../models/Order");
const User = require("../../models/User");
const mongoose = require("mongoose");

exports.getOrdersPage = async (req, res) => {
  let { status, sort } = req.query;
  let filter = {};
  let sortOption = {};
  try {
    // Helper functions

    res.locals.getStatusBadgeClass = (status) => {
      switch (status) {
        case "pending":
          return "bg-warning";
        case "processing":
          return "bg-info";
        case "delivered":
          return "bg-success";
        case "cancelled":
          return "bg-danger";
        case "paid":
          return "bg-primary";
        case "return requested":
          return "bg-warning text-dark";
        case "return accepted":
          return "bg-info text-dark";
        case "returned":
          return "bg-secondary text-white";
        default:
          return "bg-dark";
      }
    };

    res.locals.getPaymentStatusBadgeClass = (status) => {
      switch (status) {
        case "pending":
          return "bg-warning";
        case "paid":
          return "bg-success";
        case "refunded":
          return "bg-info";
        case "failed":
          return "bg-danger";
        default:
          return "bg-secondary";
      }
    };

    if (status && status !== "") {
      filter.status = status;
    }
    switch (sort) {
      case "desc":
        sortOption = { createdAt: 1 };
        break;
      case "asc":
        sortOption = { createdAt: -1 };
        break;
    }
    const orders = await Order.find(filter).sort(sort);

    return res.status(200).render("adminPages/OrderPages/adminOrders", {
      orders,
      selectedStatus: status,
      selectedSort: sort,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
};

exports.changeStatusController = async (req, res) => {
  try {
    const params = req.params.id;
    const orderId = new mongoose.Types.ObjectId(params);

    // Make sure status is being received correctly
    const status = req.body.status;
    console.log("Request body:", req.body);
    console.log("Status to set:", status);

    if (!status) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Status value is missing",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Could not update the order",
      });
    }
    if (updatedOrder.status === "returned") {
      const user = await User.findById(updatedOrder.userId);
      if (user) {
        const refundAmount = updatedOrder.grantTotal;

        // Update wallet balance
        user.wallet += refundAmount;

        // Add transaction
        user.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for returned order #${updatedOrder._id}`,
          date: new Date(),
        });

        // Update order payment status
        updatedOrder.payment_status = "refunded";

        await updatedOrder.save();
        await user.save();
      }
    }

    console.log("refunded,user wallet updated");
    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Order updated successfully",
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
