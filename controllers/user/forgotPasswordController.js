const statusCodes = require("../../services/statusCodes");
const User = require("../../models/User");
const otpServices = require("../../services/otpService");
const bcrypt = require("bcrypt");

exports.getVerifyEmailPage = async (req, res) => {
  try {
    return res.render("userPages/verifyEmailPage");
  } catch (err) {
    console.error(err);
  }
};

exports.verifyEmailPageController = async (req, res) => {
  const { email } = req.body;
  console.log(email);
  try {
    if (!email) {
      return res.status(statusCodes.BAD_REQUEST).json({
        title: "error",
        message: "Please enter an email",
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(200).json({
        status: "success",
        message: "If this email exists, OTP has been sent",
      });
    }

    const otp = await otpServices.generateOTP();
    otpServices.saveOTP(email, otp);
    otpServices.sendOTP(email, otp);

    req.session.email = email;
    req.session.save();

    return res.status(statusCodes.SUCCESS).json({
      status: "success",
      title: "Success",
      message: "OTP has been sent to the email",
    });
  } catch (err) {
    console.error("Error in verify email controller : ", err);
    return res.status(statusCodes.SERVER_ERROR).json({
      title: "error",
      message: "Something went wrong",
    });
  }
};

exports.getVerifyOtpPage = async (req, res) => {
  try {
    console.log(req.session);
    return res
      .status(statusCodes.SUCCESS)
      .render("userPages/passwordChangeVerifyOtp");
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
  try {
    const email = req.session.email;
    if (!email) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Credentials missing from session",
      });
    }
    const isOtpValid = await otpServices.verifyOTP(email, otpInput);
    if (isOtpValid) {
      return res.status(statusCodes.SUCCESS).json({
        status: "success",
        title: "Success",
        message: "OTP verification is successful",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      status: "error",
      title: "Error",
      message: "Invalid OTP",
    });
  } catch (error) {
    console.error("Error in verifying otp : ", error);
  }
};

exports.getNewPasswordPage = async (req, res) => {
  try {
    return res.render("userPages/newPasswordPage");
  } catch (err) {
    console.error("Error in loading new password page : ", err);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.setNewPasswordController = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const email = req.session.email;
  console.log("setNew password");

  try {
    if (!password || !confirmPassword) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Please fill all the fields",
      });
    }
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Invalid Password",
        message:
          "Password must be at least 8 characters long, contain at least one letter, one number, and one special character.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Passwords doesn't match",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOne({ email }).select("_id");
    const userId = user ? user._id.toString() : null;
    await User.findByIdAndUpdate(
      userId,
      { $set: { password: hashedPassword } }, // Update password
      { new: true },
    );
    console.log("New password set!!!!");

    return res.status(statusCodes.SUCCESS).json({
      status: "success",
      title: "Success",
      message: "Password reset successful",
    });
  } catch (err) {
    console.error("Error in setting new password : ", err);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};
