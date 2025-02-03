const sessionIsAuthenticated = (req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  next();
};

module.exports = sessionIsAuthenticated
