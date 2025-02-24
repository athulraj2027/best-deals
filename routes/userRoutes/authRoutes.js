const express = require("express");
const passport = require("../../config/passport");
const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signin" }),
  (req, res) => {
    if(req.user){
      req.session.userId = req.user._id;
      req.session.email = req.session.email
      
      req.session.save((err)=>{
        if(err){
          console.log("Google session save error : ",err)
          return res.redirect('/signin')
        }
        
      })
    }
        console.log(req.session.email);
    return res.redirect("/");
  }
);

module.exports = router;
