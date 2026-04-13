const OtpServices = require("../../services/otpService");
const bcrypt = require("bcrypt");
const User = require("../../models/User");
const statusCodes = require("../../services/statusCodes");

exports.getVerifyOtpPage = (req, res) => {
  try {
    console.log(req.session);
    return res.status(statusCodes.SUCCESS).render("userPages/verify-otpPage");
  } catch (err) {
    console.error("Error in loading otp verification page : ", err);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Success",
      message: "Something went wrong",
    });
  }
};

exports.verifyOtpController = async (req, res) => {
  const otpInput = Object.values(req.body).join("");
  const name = req.session.name;
  const email = req.session.email;
  const password = req.session.password;
  if (req.session.referral) {
    var referralCode = req.session.referral;
  }

  console.log(password);
  console.log(otpInput);
  try {
    if (!email || !name || !password) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Credentials missing from session",
      });
    }
    console.log(password);
    const isOtpValid = await OtpServices.verifyOTP(email, otpInput);
    console.log(isOtpValid);
    if (isOtpValid) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        if (referralCode) {
          const referredUser = await User.findOne({ referralCode });
          console.log(referralCode);
          if (!referredUser)
            return res.status(statusCodes.BAD_REQUEST).json({
              status: "error",
              title: "Error",
              message: "Referral code not valid",
            });

          await User.findByIdAndUpdate(
            referredUser._id,
            {
              $inc: { wallet: 100 },
              $push: {
                walletTransactions: {
                  type: "credit",
                  amount: 100,
                  description: "Referral bonus",
                },
              },
            },
            { new: true },
          );
        }
        const newUser = new User({
          name,
          email,
          password: hashedPassword,
          isVerified: true,
        });
        // console.log(newUser.password);
        await newUser.save();
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction failed:", err);
            return res.redirect("/");
          }

          return res.status(200).json({
            status: "success",
            title: "Success",
            message: "OTP verification is successful",
          });
        });
      } catch (error) {
        console.error(error);
        res.status(statusCodes.SERVER_ERROR).json({
          status: "error",
          title: "Error",
          message: "Server failed to hash password",
        });
      }
    } else {
      res.status(statusCodes.SERVER_ERROR).json({
        status: "error",
        title: "Error",
        message: "You have entered invalid OTP. Please enter correct OTP",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Email not found in session." });
    }
    const otp = OtpServices.generateOTP();
    OtpServices.saveOTP(email, otp);
    OtpServices.sendOTP(email, otp);
    res.status(statusCodes.SUCCESS).json({
      status: "success",
      title: "OTP Resent",
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Resend Failed",
      message: "An error occurred while resending the OTP.",
    });
  }
};
