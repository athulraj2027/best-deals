const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const mongoose = require("mongoose");

exports.getOrdersPage = async (req, res) => {
  let { status, sort } = req.query;
  let filter = {};
  let sortOption = {};

  try {
    // ── Helper functions (res.locals for EJS) ─────────────────────────────
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

    // ── Filters & sort ─────────────────────────────────────────────────────
    if (status && status !== "") {
      filter.status = status;
    }
    switch (sort) {
      case "desc":
        sortOption = { orderDate: -1 };
        break;
      case "asc":
        sortOption = { orderDate: 1 };
        break;
      default:
        sortOption = { orderDate: -1 };
        break;
    }

    // ── Raw DB query ───────────────────────────────────────────────────────
    const rawOrders = await Order.find(filter)
      .populate("userId", "name email phone")
      .populate("addressId")
      .populate("items.productId", "name images slug")
      .sort(sortOption)
      .lean();

    // ── Enrich each order ──────────────────────────────────────────────────
    const orders = rawOrders.map((order) => {
      // 1. Items — add lineTotal + flatten product info + item status
      const items = (order.items || []).map((item) => ({
        ...item,
        lineTotal: +(item.price * item.quantity).toFixed(2),
        productName: item.productId?.name || item.name,
        productSlug: item.productId?.slug || null,
        productImage: item.image || item.productId?.images?.[0] || null,
        // ── Item-level status label ────────────────────────────────────────
        itemStatusLabel:
          {
            active: "Active",
            cancelled: "Cancelled",
            return_requested: "Return Requested",
            return_accepted: "Return Accepted",
            returned: "Returned",
          }[item.status] || item.status,
        // ── Item-level status boolean flags ───────────────────────────────
        itemStatusFlags: {
          isActive: item.status === "pending",
          isCancelled: item.status === "cancelled",
          isReturnRequested: item.status === "return_requested",
          isReturnAccepted: item.status === "return_accepted",
          isReturned: item.status === "returned",
        },
      }));

      // 2. Price breakdown
      const itemSubtotal = +items
        .reduce((s, i) => s + i.lineTotal, 0)
        .toFixed(2);
      const couponDiscount = +(order.coupon?.discountAmount || 0).toFixed(2);
      const couponCode = order.coupon?.code || null;
      const tax = +(order.tax || 0).toFixed(2);
      const grandTotal = +(order.grandTotal || 0).toFixed(2);

      // 3. Shipping address — flat display string + safe fallbacks
      const addr = order.addressId || {};
      const shippingAddress = {
        ...addr,
        type: addr.type || "Other",
        name: addr.name || order.userId?.name || "",
        phoneNumber: addr.phoneNumber || order.userId?.phone || "",
        fullAddress: [
          addr.streetAddress,
          addr.city,
          addr.state && addr.zipCode
            ? `${addr.state} ${addr.zipCode}`
            : addr.state || addr.zipCode,
          addr.country,
        ]
          .filter(Boolean)
          .join(", "),
      };

      // 4. Customer info
      const customer = {
        id: order.userId?._id?.toString() || null,
        name: order.userId?.name || "Guest",
        email: order.userId?.email || null,
        phone: order.userId?.phone || addr.phoneNumber || null,
      };

      // 5. Payment info
      const isRazorpay = order.paymentMethod === "razorpay";
      const payment = {
        method: order.paymentMethod,
        methodLabel:
          {
            cod: "Cash on Delivery",
            razorpay: "Razorpay",
            wallet: "Wallet",
          }[order.paymentMethod] || order.paymentMethod,
        status: order.payment_status,
        statusLabel:
          {
            pending: "Awaiting Payment",
            paid: "Paid",
            refunded: "Refunded",
            failed: "Payment Failed",
          }[order.payment_status] || order.payment_status,
        isPaid: order.payment_status === "paid",
        isRefunded: order.payment_status === "refunded",
        isFailed: order.payment_status === "failed",
        isPending: order.payment_status === "pending",
        razorpay: isRazorpay
          ? {
              orderId: order.razorpay?.orderId || null,
              paymentId: order.razorpay?.paymentId || null,
              signature: order.razorpay?.signature || null,
              amountRaw: order.razorpay?.amount || null,
              amountINR: order.razorpay?.amount
                ? +(order.razorpay.amount / 100).toFixed(2)
                : null,
              currency: order.razorpay?.currency || "INR",
              receipt: order.razorpay?.receipt || null,
              paymentDate: order.razorpay?.paymentDate || null,
              paymentDateFmt: order.razorpay?.paymentDate
                ? new Date(order.razorpay.paymentDate).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : null,
            }
          : null,
      };

      // 6. Status flags
      const statusFlags = {
        isPending: order.status === "pending",
        isProcessing: order.status === "processing",
        isPaidStatus: order.status === "paid",
        isDelivered: order.status === "delivered",
        isCancelled: order.status === "cancelled",
        isReturnRequested: order.status === "return requested",
        isReturnAccepted: order.status === "return accepted",
        isReturned: order.status === "returned",
        isActive: ["pending", "processing"].includes(order.status),
        isClosedOut: ["delivered", "cancelled", "returned"].includes(
          order.status,
        ),
        canCancel: ![
          "cancelled",
          "delivered",
          "return requested",
          "return accepted",
          "returned",
        ].includes(order.status),
        canReturn: order.status === "delivered",
        canAcceptReturn: order.status === "return requested",
      };

      // 7. Formatted dates
      const orderDateFmt = order.orderDate
        ? new Date(order.orderDate).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : null;

      // 8. Status label
      const statusLabel =
        {
          pending: "Pending",
          processing: "Processing",
          paid: "Paid",
          delivered: "Delivered",
          cancelled: "Cancelled",
          "return requested": "Return Requested",
          "return accepted": "Return Accepted",
          returned: "Returned",
        }[order.status] || order.status;

      return {
        ...order,
        items,
        customer,
        shippingAddress,
        payment,
        priceBreakdown: {
          itemSubtotal,
          couponCode,
          couponDiscount,
          tax,
          grandTotal,
          totalSavings: couponDiscount,
        },
        statusFlags,
        statusLabel,
        orderDateFmt,
        totalItems: items.reduce((s, i) => s + i.quantity, 0),
      };
    });

    // ── Summary stats ──────────────────────────────────────────────────────
    const stats = {
      total: rawOrders.length,
      pending: rawOrders.filter((o) => o.status === "pending").length,
      processing: rawOrders.filter((o) => o.status === "processing").length,
      delivered: rawOrders.filter((o) => o.status === "delivered").length,
      cancelled: rawOrders.filter((o) => o.status === "cancelled").length,
      returnRequested: rawOrders.filter((o) => o.status === "return requested")
        .length,
      returnAccepted: rawOrders.filter((o) => o.status === "return accepted")
        .length,
      returned: rawOrders.filter((o) => o.status === "returned").length,
      totalRevenue: +rawOrders
        .filter((o) => o.payment_status === "paid")
        .reduce((s, o) => s + (o.grandTotal || 0), 0)
        .toFixed(2),
      pendingRevenue: +rawOrders
        .filter((o) => o.payment_status === "pending")
        .reduce((s, o) => s + (o.grandTotal || 0), 0)
        .toFixed(2),
    };

    // console.log("orders : ", orders);

    return res.status(200).render("adminPages/OrderPages/adminOrders", {
      orders,
      stats,
      selectedStatus: status || "",
      selectedSort: sort || "",
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

exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate("userId", "name email phone")
      .populate("addressId")
      .populate("items.productId", "name brand");

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    return res.status(200).render("adminPages/OrderPages/adminOrderDetails", {
      order,
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = new mongoose.Types.ObjectId(req.params.id);
    const newStatus = req.body.status;

    const allowedStatuses = [
      "pending",
      "processing",
      "delivered",
      "cancelled",
      "return_requested",
      "return_accepted",
      "returned",
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error("Invalid status");
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    if (
      order.payment_status === "refunded" &&
      ["cancelled", "returned"].includes(newStatus)
    ) {
      throw new Error("Refund already processed");
    }

    const validTransitions = {
      pending: ["processing"],
      processing: ["delivered"],
      delivered: [],
      return_requested: ["return_accepted"],
      return_accepted: ["returned"],
      cancelled: [],
      returned: [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${newStatus}`,
      );
    }

    order.status = newStatus;
    order.items.forEach((item) => {
      item.status = newStatus;
    });

    if (
      newStatus === "delivered" &&
      order.paymentMethod === "cod" &&
      order.payment_status !== "paid"
    ) {
      order.payment_status = "paid";
    }

    if (newStatus === "cancelled" && order.payment_status === "paid") {
      // Restore stock
      for (const item of order.items) {
        await Product.updateOne(
          {
            _id: item.productId,
            "variants._id": item.variantId,
          },
          {
            $inc: { "variants.$.quantity": item.quantity },
          },
          { session },
        );
      }

      // Refund wallet (atomic)
      await User.updateOne(
        { _id: order.userId },
        {
          $inc: { wallet: order.grandTotal },
          $push: {
            walletTransactions: {
              type: "credit",
              amount: order.grandTotal,
              description: `Refund for cancelled order #${order.orderId}`,
              date: new Date(),
            },
          },
        },
        { session },
      );

      order.payment_status = "refunded";
    }

    if (newStatus === "returned") {
      order.items.forEach(async (item) => {
        const product = await Product.findById(item.productId);
        const variant = product.variants.find(
          (v) => v._id.toString() === item.variantId.toString(),
        );
        if (!variant)
          return res.status(400).json({ message: "Variant not found" });
        variant.quantity += item.quantity;

        await product.save();
      });
    }
    if (newStatus === "returned" && order.payment_status === "paid") {
      await User.updateOne(
        { _id: order.userId },
        {
          $inc: { wallet: order.grandTotal },
          $push: {
            walletTransactions: {
              type: "credit",
              amount: order.grandTotal,
              description: `Refund for returned order #${order.orderId}`,
              date: new Date(),
            },
          },
        },
        { session },
      );

      order.payment_status = "refunded";
    }

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      status: "success",
      message: "Order updated successfully",
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error(err);

    return res.status(400).json({
      status: "error",
      message: err.message || "Something went wrong",
    });
  }
};

exports.acceptReturnItem = async (req, res) => {
  const { orderId, itemId } = req.params;

  try {
    // 1. Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 2. Find item inside order
    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 3. Validate current state
    if (item.status !== "return_requested") {
      return res.status(400).json({
        message: "Return not requested for this item",
      });
    }

    // 4. Update item
    item.status = "return_accepted";
    item.returnedAt = new Date();

    // 5. Optional: update order status (smart logic)
    const allReturnAccepted = order.items.every(
      (i) =>
        i.status === "return_accepted" ||
        i.status === "returned" ||
        i.status === "cancelled",
    );

    if (allReturnAccepted) {
      order.status = "return accepted";
    }

    // 6. Save
    await order.save();

    return res.status(200).json({
      message: "Item return accepted successfully",
      order,
    });
  } catch (error) {
    console.error("Accept Return Error:", error);
    return res.status(500).json({
      message: "Server error while accepting return",
    });
  }
};

exports.changeItemStatus = async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;

  try {
    if (!status) return res.status(400).json({ message: "Status is required" });

    // 4. Allowed transitions (IMPORTANT)
    const allowedTransitions = {
      pending: ["processing"],
      processing: ["delivered"],
      delivered: [],
      return_requested: ["return_accepted"],
      return_accepted: ["returned"],
      returned: [],
      cancelled: [],
    };

    if (!allowedTransitions[item.status]?.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from ${item.status} to ${status}`,
      });
    }
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.status = status;

    // 6. Handle special cases
    if (status === "returned") {
      item.returnedAt = new Date();
      const user = await User.findById(order.userId);
      user.wallet += item.paidAmount.toFixed(2);
      user.walletTransactions.push({
        type: "credit",
        amount: item.paidAmount,
        description: `Refund for returned item in order #${order.id}`,
        date: new Date(),
      });
      await user.save();
      const product = await Product.findById(item.productId);
      const variant = product.variants.find(
        (v) => v._id.toString() === item.variantId.toString(),
      );
      if (!variant)
        return res.status(400).json({ message: "Variant not found" });
      variant.quantity += item.quantity;

      await product.save();
    }

    // 7. Update order-level status (smart aggregation)
    const statuses = order.items.map((i) => i.status);

    if (statuses.every((s) => s === "returned")) {
      order.status = "returned";
      order.payment_status = "refunded"; // optional
    } else if (statuses.some((s) => s === "return_requested")) {
      order.status = "return_requested";
    } else if (statuses.some((s) => s === "return_accepted")) {
      order.status = "return_accepted";
    }

    await order.save();

    return res.status(200).json({
      message: "Item status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Change Item Status Error:", error);
    return res.status(500).json({
      message: "Server error while updating item status",
    });
  }
};
