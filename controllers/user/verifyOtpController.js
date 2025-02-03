const OtpServices = require("../../services/otpService");
const bcrypt = require("bcrypt");
const User = require("../../models/User");

exports.getVerifyOtpPage = (req, res) => {
  try {
    console.log(req.session);
    return res.render("userPages/verify-otpPage");
  } catch (err) {
    console.error("Error in loading otp verification page : ", err);
  }
};

exports.verifyOtpController = async (req, res) => {
  const otpInput = Object.values(req.body).join("");
  const name = req.session.name;
  const email = req.session.email;
  const password = req.session.password;

  if (!email || !name || !password) {
    return res.json({
      status: "error",
      title: "Error",
      message: "Credentials missing from session",
    });
  }
  console.log(password);
  const isOtpValid = await OtpServices.verifyOTP(email, otpInput);
  if (isOtpValid) {
    // await bcrypt.hash(password, 10, async (err, hashedPassword) => {
    //   if (err) {
    //     console.error(err);
    //     return res.json({
    //       status: "error",
    //       title: "Error",
    //       message: "Server failed to hash password",
    //     });
    //   }
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    try {
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        isVerified: true,
      });
      console.log(newUser.password);
      await newUser.save();

      // Clear session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction failed:", err);
          return res.redirect("/"); // Handle redirection if session destruction fails
        }

        return res.json({
          status: "success",
          title: "Success",
          message: "OTP verification is successful",
        });
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
        title: "Error",
        message: "Server failed to hash password",
      });
    }
  } else {
    res.json({
      status: "error",
      title: "Error",
      message: "You have entered invalid OTP. Please enter correct OTP",
    });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    console.log(req.session.email);
    const email = req.session.email;

    if (!email) {
      return res.status(400).json({ message: "Email not found in session." });
    }

    const otp = OtpServices.generateOTP();
    OtpServices.saveOTP(email, otp);
    OtpServices.sendOTP(email, otp);
    res.status(200).json({
      status: "success",
      title: "OTP Resent",
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      status: "error",
      title: "Resend Failed",
      message: "An error occurred while resending the OTP.",
    });
  }
};
