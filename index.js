const path = require("path");
require("dotenv").config();
require('./jobs/updateProductOffers');
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// --- Local imports --- 

const userRoutes = require("./routes/userRoutes/userMainRoutes");
const authRoutes = require("./routes/userRoutes/authRoutes");
const adminRoutes = require("./routes/adminRoutes/adminMainRouter");
const cacheMiddleware = require("./middlewares/cacheMiddleware");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const {userSessionMiddleware,adminSessionMiddleware} = require("./config/session");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Global middlewares ---

connectDB();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/admin',adminSessionMiddleware);
app.use('/',userSessionMiddleware)
app.use(passport.initialize());
app.use(passport.session());
app.use(cacheMiddleware);

// --- Routes ---

app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use("/", userRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render("errorPage", {
    error: "404 - Page Not Found",
    message: "The page you are looking for does not exist.",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("serverError", {
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

app.listen(PORT, () => console.log("Server is connected"));