const ApiError = require("../utils/api-error");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} was not found.`, "ROUTE_NOT_FOUND"));
}

module.exports = { notFoundHandler };