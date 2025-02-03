const Admin = require("../../models/Admin");

// --- Get controller ---

exports.getAdminLoginPage = (req, res) => {
  res.render("adminPages/signInPage");
};

// --- Post controller ---

exports.adminLoginController = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Email and password required",
      });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        status: "error",
        title: "Error",
        message: "Invalid password or email",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        title: "Error",
        message: "Invalid password or email",
      });
    }
    req.session.email = email;

    console.log(req.session);
    console.log("session created");
    return res.status(200).json({
      status: "success",
      title: "Validation Successful",
      message: "You are being logged in ",
    });
  } catch (err) {
    console.log(err);
    res.status(50).json({
      status: "error",
      title: "Validation error",
      message: "Something wrong occured",
    });
  }
};
