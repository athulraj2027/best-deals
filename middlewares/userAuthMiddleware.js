const User = require("../models/User");

module.exports = async (req, res, next) => {
  if (req.session.userId) {
    const userId = req.session.userId;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      next();
    }
    if (user.isBlocked) {
      // Destroy the session if user is blocked
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).send("Error logging out blocked user");
        }
        return res.redirect("/login"); // Or any route for blocked users
      });
      return;
    }
    return res.redirect("/");
  }
  next();
};
