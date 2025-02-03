const User = require("../../models/User");
const otpServices = require("../../services/otpService");

exports.getSignUpPage = (req, res) => {
  try {
    const error = "";
    res.render("userPages/signUpPage", { error });
  } catch (err) {
    console.log("Error in loading user sign up page : ", err);
    return res.render("serverError");
  }
};

exports.signUpController = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    console.log("Credentials missing");
    return res.json({
      status: "error",
      title: "Error",
      message: "Please fill all the columns",
      errors: {
        name: !name ? "Name is required" : null,
        email: !email ? "Email is required" : null,
        password: !password ? "Password is required" : null,
        confirmPassword: !confirmPassword
          ? "Confirm Password is required"
          : null,
      },
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.json({
      status: "error",
      title: "Error",
      message: "The user is already registered",
      errors: {
        email: "Email is already taken",
      },
    });
  }

  if (password !== confirmPassword) {
    return res.json({
      status: "error",
      title: "Error",
      message: "Passwords do not match",
      errors: {
        password: "Passwords do not match",
        confirmPassword: "Passwords do not match",
      },
    });
  }
  const otp = otpServices.generateOTP();
  otpServices.saveOTP(email, otp);
  otpServices.sendOTP(email, otp);

  req.session.name = name;
  req.session.email = email;
  req.session.password = password;

  req.session.save();
  console.log(req.session);

  return res.json({
    status: "success",
    title: "Success",
    message: "User registered successfully!",
  });
};
