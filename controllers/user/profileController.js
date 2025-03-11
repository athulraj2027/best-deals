const User = require("../../models/User");
const Address = require("../../models/Address");
const mongoose = require("mongoose");

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

    const addresses = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) }, // Ensure only the current user's data is fetched
      },
      {
        $lookup: {
          from: "addresses",
          localField: "_id",
          foreignField: "userId",
          as: "userAddresses",
        },
      },
      {
        $project: { _id: 0, userAddresses: 1 }, // Remove user info, keep only addresses
      },
    ]);
    const userAddresses =
      addresses.length > 0 ? addresses[0].userAddresses : [];

    return res.status(200).render("userPages/profilePages/addressPage", {
      addresses: userAddresses,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.addAddressController = async (req, res) => {
  const userId = req.session.userId;

  const { type, streetAddress, city, state, zipCode, country } = req.body;
  try {
    console.log(type, streetAddress, city, state, zipCode, country);
    if (!type || !streetAddress || !city || !state || !zipCode || !country) {
      console.log("every field is not available");
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Please fill all the fields",
      });
    }
    console.log("all fields are there ");
    if (type === "Home") {
      const homeAddress = await Address.findOne({ userId, type: "Home" });
      if (homeAddress) {
        console.log("there is already a home address");

        return res.status(400).json({
          status: "error",
          title: "Error",
          message: "Home address already exists",
        });
      }
    }

    console.log("saving the new address");

    const newAddress = new Address({
      userId,
      type,
      streetAddress,
      city,
      state,
      zipCode,
      country,
    });

    await newAddress.save();

    if (!newAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "User not found or something wrong in adding address",
      });
    }

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

exports.deleteAddressController = async (req, res) => {
  const addressId = req.params.id;
  try {
    if (!addressId) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Some credentials missing",
      });
    }

    const deleteAddress = await Address.findByIdAndDelete({ _id: addressId });
    if (!deleteAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "Error in finding address before deleting",
      });
    }

    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong in deleting address",
    });
  }
};

exports.getEditAddressPage = async (req, res) => {
  try {
    const addressId = req.params.id;
    const address = await Address.findById(addressId);

    return res
      .status(200)
      .render("userPages/profilePages/editAddressPage", { address });
  } catch (err) {
    console.error("Error in loading edit address Page : ", err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Something went wrong",
    });
  }
};

exports.editAddressController = async (req, res) => {
  try {
    const { type, streetAddress, city, state, zipCode, country } = req.body;
    const addressId = req.params.id;

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      {
        type,
        streetAddress,
        country,
        state,
        zipCode,
        city,
      },
      { new: true }
    );
    if (!updatedAddress) {
      return res.status(400).json({
        status: "error",
        title: "Error",
        message: "There is something wrong in the field data",
      });
    }

    await updatedAddress.save();
    return res.status(200).json({
      status: "success",
      title: "Success",
      message: "Address have been successfully updated",
    });
  } catch (err) {
    console.error("Error in editing user address : ", err);
  }
};
