const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["Admin", "Staff"], required: true, default: "Staff" },
  isActive: { type: Boolean, required: true, default: true },
  authVersion: { type: Number, required: true, default: 0, select: false },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);