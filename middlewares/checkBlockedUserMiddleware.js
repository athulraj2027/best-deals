const User = require("../models/User");

module.exports = async (req, res, next) => {
  if (!req.session.userId) return next();
  try {
    const user = await User.findById(req.session.userId);
    if (user && user.isBlocked) {
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
        return res.redirect("/signin"); // Redirect to login page
      });
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
    return res.redirect("/");
  }
};
