const statusCodes = require("../../services/statusCodes");
const User = require("../../models/User");

exports.getVerifyEmailPage = async (req, res) => {
  try {
    return res.render("userPages/verifyEmailPage");
  } catch (err) {
    console.error(err);
  }
};

exports.verifyEmailPageController = async (req, res) => {
  const { email } = req.body;
  try {

    if (!email) {
      return res.status(statusCodes.BAD_REQUEST).json({
        title: "error",
        message: "Please enter an email",
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(statusCodes.NOT_FOUND).json({
        title: "error",
        message: "Invalid email address",
      });
    }



  } catch (err) {}
};
