const Order = require("../../models/Order");
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
        default:
          return "bg-secondary";
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
