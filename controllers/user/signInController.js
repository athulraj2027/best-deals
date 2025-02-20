// const { Error } = require("mongoose");
const User = require("../../models/User");
const bcrypt = require("bcrypt");
const statusCodes = require("../../services/statusCodes");

exports.getSignInPage = (req, res) => {
  try {
    return res.render("userPages/signInPage");
  } catch (err) {
    console.error("Error rendering sign in page  : ", err);
    return res.status(500).render("serverError");
  }
};

exports.signInController = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Credentials Missing",
        message: "Please fill all the columns",
      });
    }

    const user = await User.findOne({ email });

    if (user.isBlocked) {
      console.log("Blocked user trying to login");
      return res.status(statusCodes.FORBIDDEN).json({
        status: "error",
        title: "Entry restricted",
        message: "You have been blocked by admin",
      });
    }

    if (!user) {
      console.log("Invalid email");
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Invalid Credentials",
        message: "Invalid email or Password",
      });
    }

    if (user.googleId) {
      console.log("User is linked with googleAuth");
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Account linked with Google",
        message: "Try sign in with Google",
      });
    }

    console.log(password, user.password);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Invalid password");
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Invalid Credentials",
        message: "Invalid email or Password",
      });
    }

    if (!req.session) {
      console.error("Session not initialized");
      return res.status(statusCodes.SERVER_ERROR).json({
        status: "error",
        title: "Server Error",
        message: "Session initialization failed.",
      });
    }

    req.session.userId = user._id;
    req.session.email = email;
    req.session.isAuthenticated = true;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(statusCodes.SERVER_ERROR).json({
          status: "error",
          title: "Session Error",
          message: "Failed to create session",
        });
      }
      console.log("Session created successfully for user:", email);
      return res.status(statusCodes.SUCCESS).json({
        status: "success",
        title: "Login Successful",
        message: "You are being redirected to the home page",
      });
    });
  } catch (err) {
    console.error("Error in signing in user", err);
    return res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Oops..",
      message: "An error occured....",
    });
  }
};
