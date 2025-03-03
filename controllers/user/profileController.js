const User = require("../../models/User");
const Address = require("../../models/Address");

exports.getUserProfilePage = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log(userId.userId);
    const user = await User.findById(userId);
    return res.render("userPages/profilePages/profilePage", { user });
  } catch (err) {
    console.error(err);
  }
};

exports.getUserAddressPage = async (req, res) => {
  const userId = req.session.userId;
  try {
    if (!userId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "No userId found",
      });
    }
    const addresses = await Address.find({ userId });

    return res
      .status(200)
      .render("userPages/profilePages/addressPage", { addresses });
  } catch (err) {
    console.log(err);
  }
};

exports.addAddressController = async (req, res) => {
  const userId = req.session.userId;

  const { street, city, state, zipCode, country } = req.body;
  try {
    if (!street || !city || !state || !zipCode || !country) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please fill all the fields",
      });
    }
    await User.findByIdAndUpdate(
      userId,
      {
        $push: { address: { street, city, state, zipCode, country } },
      },
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Address updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server Error",
    });
  }
};

exports.editProfileController = async (req, res) => {
  const { phone } = req.body;
  const userId = req.session.userId;
  try {
    if (!phone) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please fill the field",
      });
    }

    const phoneRegex = /^\d{10}$/;
    const validRegex = phoneRegex.test(phone);
    if (!validRegex) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Invalid syntax",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { phone },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found ",
      });
    }

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "User updated Successfully",
    });
  } catch (err) {
    console.error("Edit profile error : ", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong...",
    });
  }
};
