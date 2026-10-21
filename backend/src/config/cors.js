const ApiError = require("../utils/api-error");

function getCorsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "This origin is not allowed.", "CORS_ORIGIN_NOT_ALLOWED"));
    },
    optionsSuccessStatus: 204,
  };
}

module.exports = { getCorsOptions };