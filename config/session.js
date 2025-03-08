const session = require("express-session");
require("dotenv").config();

const userSessionMiddleware = session({
  name: "user_session",
  secret: process.env.SESSION_SECRET || "bestDeals-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 50 * 60 * 1000,
    path: "/",
  },
});

const adminSessionMiddleware = session({
  name: "admin_session",
  secret: process.env.SESSION_SECRET || "bestDeals-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 50 * 60 * 1000,
    path: "/",
  },
});
module.exports = { userSessionMiddleware, adminSessionMiddleware };
