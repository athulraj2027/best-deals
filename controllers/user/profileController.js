const User = require("../../models/User");

exports.getUserProfilePage = async (req, res) => {
  try {
    const email = req.session.email;
    
    const user = await User.findOne({ email });
    return res.render("userPages/profilePages/profilePage", {user});
  } catch (err) {
    console.error(err);
  }
};
