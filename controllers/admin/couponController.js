const mongoose = require("mongoose");
const Coupon = require("../../models/Coupon");
const Category = require("../../models/Category");
const Product = require("../../models/Product");

exports.getCouponsPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const query = req.query.query || "";
    const status = req.query.status || "";
    const sort = req.query.sort || "";

    const filter = {};

    if (query) {
      filter.$or = [
        { code: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      const now = new Date();

      switch (status) {
        case "active":
          filter.active = true;
          filter.startDate = { $lte: now };
          filter.expiryDate = { $gt: now };
          break;
        case "expired":
          filter.active = true;
          filter.expiryDate = { $lt: now };
          break;
        case "upcoming":
          filter.active = true;
          filter.startDate = { $gt: now };
          break;
        case "inactive":
          filter.active = false;
          break;
      }
    }

    let sortOption = {};

    switch (sort) {
      case "expiry_asc":
        sortOption = { expiryDate: 1 };
        break;
      case "expiry_desc":
        sortOption = { expiryDate: -1 };
        break;
      case "creation_asc":
        sortOption = { createdAt: 1 };
        break;
      case "creation_desc":
        sortOption = { createdAt: -1 };
        break;
      case "discount_high":
        sortOption = { discountValue: -1 };
        break;
      case "discount_low":
        sortOption = { discountValue: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const coupons = await Coupon.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await Coupon.countDocuments(filter);

    const totalPages = Math.ceil(total / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    res.render("adminPages/CouponPages/adminCoupons", {
      coupons,
      currentPage: page,
      totalPages,
      hasPrevPage,
      hasNextPage,
      prevPage: page - 1,
      nextPage: page + 1,
      query,
      selectedStatus: status,
      selectedSort: sort,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.redirect("/admin/dashboard");
  }
};

exports.getAddCouponPage = async (req, res) => {
  try {
    const categories = await Category.find().sort("name");
    const products = await Product.find().sort("name");
    return res.status(200).render("adminPages/CouponPages/adminAddCoupon", {
      categories,
      products,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.addCouponController = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      startDate,
      expiryDate,
      usageLimit,
      active,
      appliedProducts,
      appliedCategories,
    } = req.body;

    const cleanArray = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({
        message: "Percentage cannot exceed 100",
      });
    }

    if (discountValue > minPurchase)
      return res
        .status(400)
        .json({ message: "Discount value must be less than minimum purchase" });
        
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(409).json({
        status: "error",
        title: "Error",
        message: "Coupon code already exists",
      });
    }

    const currentDate = new Date();
    const parsedStartDate = startDate ? new Date(startDate) : currentDate;
    const parsedExpiryDate = new Date(expiryDate);

    if (parsedStartDate >= parsedExpiryDate) {
      return res.status(400).json({
        message: "Expiry date must be after start date",
      });
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      description,
      appliedProducts: cleanArray(appliedProducts),
      appliedCategories: cleanArray(appliedCategories),
      discountType,
      discountValue: Number(discountValue),
      minPurchase: minPurchase ? Number(minPurchase) : 0,
      startDate: parsedStartDate,
      expiryDate: parsedExpiryDate,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      active: active === "true" || active === true,
    });

    await newCoupon.save();

    res.status(201).json({
      status: "success",
      title: "Success",
      message: "Coupon created successfully",
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    });
  }
};

exports.getEditCouponPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send("Invalid ID");
    }
    const coupon = await Coupon.findOne({ _id: req.params.id });
    return res
      .status(200)
      .render("adminPages/CouponPages/adminEditCoupon", { coupon });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.editCouponController = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      description,
      startDate,
      expiryDate,
      active,
      usageLimit,
    } = req.body;

    const existing = await Coupon.findOne({
      code: code.toUpperCase(),
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(409).json({
        status: "error",
        message: "Coupon code already exists",
      });
    }

    const parsedStartDate = new Date(startDate);
    const parsedExpiryDate = new Date(expiryDate);
    if (parsedStartDate >= parsedExpiryDate) {
      return res.status(400).json({
        message: "Expiry date must be after start date",
      });
    }
    const editedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        minPurchase,
        description,
        startDate,
        expiryDate,
        active: active === "true" || active === true,
        usageLimit,
      },
      { new: true },
    );
    if (!editedCoupon) {
      return res.status(404).json({
        status: "error",
        title: "Error",
        message: "Coupon couldn't update",
      });
    }
    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Coupon edited Successfully",
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

exports.deActivateCouponController = async (req, res) => {
  try {
    console.log(req.params.id);
    await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        active: false,
      },
      { new: true },
    );

    return res.status(200).redirect("/admin/coupons");
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Server Error",
      message: "Something went wrong",
    });
  }
};

exports.activateCouponController = async (req, res) => {
  try {
    console.log(req.params.id);
    await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        active: true,
      },
      { new: true },
    );

    return res.status(200).redirect("/admin/coupons");
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Server Error",
      message: "Something went wrong",
    });
  }
};
