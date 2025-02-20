const express = require("express");
const router = express.Router();
const homePageController = require("../../controllers/user/homePageController");
const signInRoutes = require("./signInRoutes");
const signUpRoutes = require("./signUpRoutes");
const verifyOtpRoutes = require("./verifyOtpRoutes");
const productsRoutes = require("./productsRoutes");
const shopRoutes = require("./shopRoutes");
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

router.route("/").get(homePageController.getHomePage);

module.exports = router;
