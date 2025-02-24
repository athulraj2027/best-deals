const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.id || !profile.emails?.length) {
          return done(new Error("Insufficient profile data"));
        }
        let existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          console.log("The user already exists");
          if (existingUser.isBlocked) {
            return done(null, false, { message: 'BLOCKED_USER' });
          }
          return done(null, existingUser);
        }

        existingUser = await User.findOneAndUpdate(
          { email: profile.emails[0].value },
          { $set: { googleId: profile.id } },
          { new: true }
        );

        if (existingUser) {
          console.log(
            "User exists with email but without Google login. Linking Google ID."
          );

          return done(null, existingUser);
        }

        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
        });
        await newUser.save();
        done(null, newUser);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  if (!user?._id && !user?.id) {
    return done(new Error("Invalid user object"));
  }
  done(null, {
    _id: user._id || user.id,
    isAuthenticated: true,
  });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    if (!sessionUser?._id) {
      return done(new Error("Invalid session data"));
    }

    const user = await User.findById(sessionUser._id);
    if (!user) {
      // User was deleted from database but still has a session
      return done(null, false, { message: "User no longer exists" });
    }

    // Add the authentication status to the user object
    user.isAuthenticated = sessionUser.isAuthenticated;
    done(null, user);
  } catch (err) {
    console.error("Deserialize error:", err);
    done(err);
  }
});
module.exports = passport;
