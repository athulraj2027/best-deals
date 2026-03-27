const Offer = require("../../models/Offer");
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const {
  updateProductsForOffer,
  updateOfferStatuses,
} = require("../../services/offers/determineBestOffer");

exports.getOffersPage = async (req, res) => {
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

    const offers = await Offer.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await Offer.countDocuments(filter);

    const totalPages = Math.ceil(total / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    res.render("adminPages/OfferPages/adminOffers", {
      offers,
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
    console.error("Error fetching offers :", error);
    res.redirect("/admin/dashboard");
  }
};

exports.getAddOfferPage = async (req, res) => {
  try {
    const categories = await Category.find().sort("name");
    const products = await Product.find().sort("name");
    return res.status(200).render("adminPages/OfferPages/adminAddOffer", {
      categories,
      products,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.addOfferController = async (req, res) => {
  console.log(req.body);
  try {
    const {
      code,
      description,
      offerType,
      offerValue,
      startDate,
      expiryDate,
      active,
      appliedProducts,
      appliedCategories,
    } = req.body;

    console.log(appliedProducts);
    const existingOffer = await Offer.findOne({ name: code });
    if (existingOffer) {
      return res.status(409).json({
        status: "error",
        title: "Error",
        message: "Offer name already exists",
      });
    }

    const currentDate = new Date();
    const parsedStartDate = startDate ? new Date(startDate) : currentDate;
    const parsedExpiryDate = new Date(expiryDate);

    const newOffer = new Offer({
      name: code,
      description,
      appliedCategories,
      appliedProducts,
      offerType,
      offerValue: Number(offerValue),
      startDate: parsedStartDate,
      expiryDate: parsedExpiryDate,

      active: active !== undefined ? active : true,
    });

    await newOffer.save();

    res.status(201).json({
      status: "success",
      title: "Success",
      message: "Offer created successfully",
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create offer",
      error: error.message,
    });
  }
};

exports.getEditOfferPage = async (req, res) => {
  try {
    const offer = await Offer.findOne({ _id: req.params.id });
    return res
      .status(200)
      .render("adminPages/OfferPages/adminEditOffer", { offer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.editOfferController = async (req, res) => {
  try {
    const {
      code,
      offerType,
      offerValue,

      description,
      startDate,
      expiryDate,
      active,
    } = req.body;

    const editedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        name: code,
        offerType,
        offerValue,

        description,
        startDate,
        expiryDate,
        active,
      },
      { new: true }
    );
    if (!editedOffer) {
      return res.status(404).json({
        status: "error",
        title: "Error",
        message: "Offer couldn't update",
      });
    }
    await editedOffer.save();

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Offer edited Successfully",
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

exports.deActivateOfferController = async (req, res) => {
  try {
    console.log(req.params.id);
    const deActivatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        active: false,
      },
      { new: true }
    );
    // if (!deActivatedCoupon) {
    //   return res.status(400).json({
    //     status: "error",
    //     title: "Error",
    //     message: "Couldn't deactivate Coupon",
    //   });
    // }

    // return res.status(200).json({
    //   status: "success",
    //   message: "Coupon deactivated Successfully",
    //   title: "Success",
    // });

    return res.status(200).redirect("/admin/offers");
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Server Error",
      message: "Something went wrong",
    });
  }
};

exports.activateOfferController = async (req, res) => {
  try {
    console.log(req.params.id);
    const ActivatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        active: true,
      },
      { new: true }
    );
    // if (!ActivatedCoupon) {
    //   return res.status(400).json({
    //     status: "error",
    //     title: "Error",
    //     message: "Couldn't deactivate Coupon",
    //   });
    // }

    // return res.status(200).json({
    //   status: "success",
    //   message: "Coupon Activated Successfully",
    //   title: "Success",
    // });

    return res.status(200).redirect("/admin/offers");
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Server Error",
      message: "Something went wrong",
    });
  }
};

// Get all offers
exports.getOffers = async (req, res) => {
  try {
    // Update statuses before sending
    await updateOfferStatuses();

    const offers = await Offer.find()
      .populate("appliedCategories", "name")
      .populate("appliedProducts", "name");

    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single offer
exports.getOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("appliedCategories", "name")
      .populate("appliedProducts", "name");

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
