const Coupon = require("../../models/Coupon");
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
    return res.status(200).render("adminPages/CouponPages/adminAddCoupon");
  } catch (error) {
    console.log(error);
  }
};

exports.addCouponController = async (req, res) => {
  try {
    console.log("request body : ", req.body);
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
    } = req.body;

    if(discountType ==='percentage'){

    }else{
        
    }
  } catch (error) {
    console.error(error);
  }
};
