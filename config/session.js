const session = require("express-session");
require("dotenv").config();

const sessionMiddleware = session({
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

module.exports = sessionMiddleware;
