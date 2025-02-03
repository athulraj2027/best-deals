const express = require("express");
const passport = require('../../config/passport')
const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req,res)=>{
    res.redirect('/')
  }
);

module.exports = router