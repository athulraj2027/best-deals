const mongoose = require("mongoose");
require("dotenv").config();
const mongoURI = process.env.MONGO_URI;

const connectDB = () => {
  mongoose
    .connect(mongoURI)
    .then(() => console.log("DB connected"))
    .catch((err) => console.log(err));
};

module.exports = connectDB;
