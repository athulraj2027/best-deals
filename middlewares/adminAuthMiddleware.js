const { genSalt } = require("bcrypt");
const Admin = require("../models/Admin");

module.exports = async (req, res, next) => {
  if (req.session.adminEmail) {
    const email = req.session.adminEmail;
    const admin = await Admin.find({ email });
    if (!admin) {
      next();
    }
    return res.redirect("/admin/dashboard");
  }
  next();
};
