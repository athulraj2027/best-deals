const User = require("../models/User");

module.exports = async (req, res, next) => {
  if (req.session.userId) {
    const userId = req.session.userId;
    const user = await User.findOne({ _id: userId });
    if (!user) {
      next();
    }
    return res.redirect("/");
  }
  next();
};
