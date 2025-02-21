const express = require("express");
const passport = require("../../config/passport");
const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.userId = req.user._id;
    console.log(req.session.userId);
    return res.redirect("/");
  }
);

module.exports = router;
