const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/api-error");
const asyncHandler = require("../utils/async-handler");
const { sendSuccess } = require("../utils/api-response");
const { cookieName, sessionCookieOptions } = require("../middleware/auth");

const validateLogin = function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const details = [];
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    details.push({ field: "email", message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 1 || password.length > 256) {
    details.push({ field: "password", message: "Password is required and must be 256 characters or fewer." });
  }
  if (Object.keys(req.body || {}).some((field) => !["email", "password"].includes(field))) {
    details.push({ field: "body", message: "Only email and password are accepted." });
  }
  if (details.length) return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", details));
  return next();
};

const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.trim().toLowerCase() }).select("+passwordHash +authVersion");
  const validPassword = user && await bcrypt.compare(req.body.password, user.passwordHash);
  if (!user || !validPassword || !user.isActive) {
    throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  }

  const token = jwt.sign({ ver: user.authVersion }, process.env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    algorithm: "HS256",
  });
  res.cookie(cookieName, token, sessionCookieOptions());
  return sendSuccess(res, {
    message: "Signed in successfully.",
    data: { user: { id: user._id, name: user.name, email: user.email, role: user.role } },
  });
});

const getSession = asyncHandler(async (req, res) => sendSuccess(res, {
  message: "Session retrieved.",
  data: { user: req.user },
}));

const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $inc: { authVersion: 1 } });
  res.clearCookie(cookieName, { ...sessionCookieOptions(), maxAge: undefined });
  return sendSuccess(res, { message: "Signed out successfully.", data: null });
});

module.exports = { getSession, login, logout, validateLogin };