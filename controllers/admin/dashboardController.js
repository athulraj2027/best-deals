const Order = require("../../models/Order");
const Coupon = require("../../models/Coupon");
const PDFDocument = require("pdfkit");

exports.getAdminDashboard = (req, res) => {
  return res.render("adminPages/adminDashboard");
};
