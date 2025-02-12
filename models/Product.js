const mongoose = require("mongoose");

// Product Schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    // price: {
    //   type: Number,
    //   required: true,
    //   min: 0,
    // // },
    // category: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Category", // Reference to the Category model
    //   required: true,
    // },

    // stock: {
    //   type: Number,
    //   required: true,
    //   min: 0,
    // },

    primaryImage: {
      type: String,
      required: true,
    },

    // ratings: [
    //   {
    //     user: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "User", // Reference to the User model who gave the rating
    //       required: true,
    //     },
    //     rating: {
    //       type: Number,
    //       required: true,
    //       min: 1,
    //       max: 5,
    //     },
    //     comment: {
    //       type: String,
    //       trim: true,
    //     },
    //     createdAt: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //   },
    // ],

    // status: {
    //   type: Boolean,
    //   required: true,
    //   default: true,
    // },

    // discount: {
    //   type: Number,
    //   min: 0,
    //   max: 100,
    //   default: 0,
    // },

    actualPrice:{
      type:Number,
      required:true,
      min:0,
      default:0
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

productSchema.virtual("variants", {
  ref: "Variant",
  localField: "_id",
  foreignField: "productId",
});

// Product model
module.exports = mongoose.model("Product", productSchema);
