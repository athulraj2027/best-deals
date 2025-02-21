const express = require("express");
const router = express.Router();
const homePageController = require("../../controllers/user/homePageController");
const signInRoutes = require("./signInRoutes");
const signUpRoutes = require("./signUpRoutes");
const verifyOtpRoutes = require("./verifyOtpRoutes");
const productsRoutes = require("./productsRoutes");
const shopRoutes = require("./shopRoutes");
const homePageRoutes = require("./homePageRoutes");
const verifyOtpController = require("../../controllers/user/verifyOtpController");

router.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  next();
});

router.use("/signin", signInRoutes);
router.use("/signup", signUpRoutes);
router.use("/verify-otp", verifyOtpRoutes);
router.use("/product", productsRoutes);
router.route("/resend-otp").post(verifyOtpController.resendOtp);
router.use("/shop", shopRoutes);

router.route("/logout").post((req, res) => {
  req.session.destroy();
  res.clearCookie("auth_token");
  res.redirect("/");
});

router.use("/", homePageRoutes);

module.exports = router;
