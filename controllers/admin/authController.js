const Admin = require("../../models/Admin");
const statusCodes = require("../../services/statusCodes");
const bcrypt = require('bcrypt')

// --- Get controller ---

exports.getAdminLoginPage = (req, res) => {
  try {
    res.render("adminPages/signInPage");
  } catch (error) {
    console.error(error);
    return res.status(statusCodes.SERVER_ERROR);
  }
};

// --- Post controller ---

exports.adminLoginController = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Email and password required",
      });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(statusCodes.NOT_FOUND).json({
        status: "error",
        title: "Error",
        message: "Invalid password or email",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: "error",
        title: "Error",
        message: "Invalid password or email",
      });
    }
    req.session.adminEmail = email;

    console.log("session created");
    return res.status(statusCodes.SUCCESS).json({
      status: "success",
      title: "Validation Successful",
      message: "You are being logged in ",
    });
  } catch (err) {
    console.log(err);
    res.status(statusCodes.SERVER_ERROR).json({
      status: "error",
      title: "Validation error",
      message: "Something wrong occured",
    });
  }
};
