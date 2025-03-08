module.exports = (req, res, next) => {
  if (!req.session.adminEmail) {
    return res.redirect("/admin");
  }
  next();
};
