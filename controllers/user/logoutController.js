const statusCodes = require('../../services/statusCodes')
exports.logoutController = (req, res) => {
  try {
    req.logout((logoutErr) => {
      if (logoutErr) {
        console.error("Logout Error: ", logoutErr);
        return res.status(statusCodes.SERVER_ERROR).json();
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destruction error : ", sessionErr);
          return res.status(statusCodes.SERVER_ERROR).json({ error: "Unable to destroy error" });
        }
        res.clearCookie("sessionId");
        res.redirect("/signin");
      });
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(statusCodes.SERVER_ERROR).json({ error: "Server error during logout" });
  }
};
