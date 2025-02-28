const { genSalt } = require("bcrypt");
const Admin = require("../models/Admin");

module.exports = async (req, res, next) => {
  if (req.session.email) {
    const email = req.session.email;
    const admin = await Admin.find({ email });
    if (!admin) {
      next();
    }
    return res.redirect("/admin/dashboard");
  }
  next();
};
