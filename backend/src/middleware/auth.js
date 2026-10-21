const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/api-error");
const asyncHandler = require("../utils/async-handler");

const cookieName = "retail_session";

const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[cookieName];
  if (!token) throw new ApiError(401, "Authentication is required.", "AUTHENTICATION_REQUIRED");

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new ApiError(401, "Session is invalid or expired.", "INVALID_SESSION");
  }

  const user = await User.findById(claims.sub).select("name email role isActive authVersion").lean();
  if (!user || !user.isActive || user.authVersion !== claims.ver) {
    throw new ApiError(401, "Session is invalid or expired.", "INVALID_SESSION");
  }

  req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  return next();
});

function authorizeRoles(...roles) {
  return function roleAuthorization(req, res, next) {
    if (!req.user) return next(new ApiError(401, "Authentication is required.", "AUTHENTICATION_REQUIRED"));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN"));
    return next();
  };
}

function sessionCookieOptions() {
  const sameSite = process.env.SESSION_COOKIE_SAME_SITE || "lax";
  if (!["lax", "strict", "none"].includes(sameSite)) {
    throw new Error("SESSION_COOKIE_SAME_SITE must be lax, strict, or none.");
  }

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    maxAge: Number(process.env.JWT_COOKIE_MAX_AGE_MS) || 900000,
  };
}

module.exports = { authenticate, authorizeRoles, cookieName, sessionCookieOptions };