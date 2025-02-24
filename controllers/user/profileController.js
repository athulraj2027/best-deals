const User = require("../../models/User");

exports.getUserProfilePage = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log(userId.userId)
    const user = await User.findById(userId );
    return res.render("userPages/profilePages/profilePage", {user});
  } catch (err) {
    console.error(err);
  }
};
