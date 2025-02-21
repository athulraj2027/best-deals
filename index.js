const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

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
const sessionMiddleware = require("./config/session");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Global middlewares ---

connectDB();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(cacheMiddleware);

// --- Routes ---

app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use("/", userRoutes);

app.use((req, res, next) => {
  res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => console.log("Server is connected"));