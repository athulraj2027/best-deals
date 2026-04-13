const User = require("../../models/User");
const otpServices = require("../../services/otpService");
const statusCodes = require("../../services/statusCodes");

exports.getSignUpPage = (req, res) => {
  try {
    const error = "";
    return res
      .status(statusCodes.SUCCESS)
      .render("userPages/signUpPage", { error });
  } catch (err) {
    console.log("Error in loading user sign up page : ", err);
    return res.status(statusCodes.SERVER_ERROR).render("serverError");
  }
};

exports.signUpController = async (req, res) => {
  const { name, email, password, confirmPassword, referralCode } = req.body;
  console.log(req.body);
  try {
    if (!name || !email || !password || !confirmPassword) {
      console.log("Credentials missing");
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Please fill all the columns",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("existing user");
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "The user is already registered",
        errors: {
          email: "Email is already taken",
        },
      });
    }

    if (password !== confirmPassword) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Passwords do not match",
        errors: {
          password: "Passwords do not match",
          confirmPassword: "Passwords do not match",
        },
      });
    }

    if (referralCode && referralCode.trim() !== "") {
      const isReferralValid = await User.findOne({ referralCode });
      if (!isReferralValid)
        return res.status(statusCodes.BAD_REQUEST).json({
          status: "error",
          title: "Error",
          message: "Invalid referral Code",
          errors: {
            password: "Invalid referral Code",
            confirmPassword: "Invalid referral Code",
          },
        });
    }

    const otp = otpServices.generateOTP();
    otpServices.saveOTP(email, otp);
    otpServices.sendOTP(email, otp);

    req.session.name = name;
    req.session.email = email;
    req.session.password = password;
    if (referralCode) {
      req.session.referral = referralCode;
    } else {
      delete req.session.referral;
    }

    req.session.save();
    console.log(req.session);

    return res.status(statusCodes.SUCCESS).json({
      status: "success",
      title: "Success",
      message: "User registered successfully!",
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Server Error",
      message: "Something went wrong",
    });
  }
};
