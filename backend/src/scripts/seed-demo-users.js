require("../config/env");

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user.model");

const demoUsers = [
  { role: "Admin", nameKey: "DEMO_ADMIN_NAME", emailKey: "DEMO_ADMIN_EMAIL", passwordKey: "DEMO_ADMIN_PASSWORD" },
  { role: "Staff", nameKey: "DEMO_STAFF_NAME", emailKey: "DEMO_STAFF_EMAIL", passwordKey: "DEMO_STAFF_PASSWORD" },
];

async function seedDemoUsers() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Demo users may only be seeded when NODE_ENV=development.");
  }

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  for (const demoUser of demoUsers) {
    const name = process.env[demoUser.nameKey]?.trim();
    const email = process.env[demoUser.emailKey]?.trim().toLowerCase();
    const password = process.env[demoUser.passwordKey];
    if (!name || !email || !password || password.length < 12) {
      throw new Error(`${demoUser.nameKey}, ${demoUser.emailKey}, and a password of at least 12 characters are required.`);
    }
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const rounds = Math.min(14, Math.max(10, Number(process.env.BCRYPT_ROUNDS) || 12));
  for (const demoUser of demoUsers) {
    const passwordHash = await bcrypt.hash(process.env[demoUser.passwordKey], rounds);
    await User.updateOne(
      { email: process.env[demoUser.emailKey].trim().toLowerCase() },
      {
        $set: {
          name: process.env[demoUser.nameKey].trim(),
          passwordHash,
          role: demoUser.role,
          isActive: true,
        },
      },
      { upsert: true, runValidators: true },
    );
    console.log(`Seeded development ${demoUser.role} account: ${process.env[demoUser.emailKey].trim().toLowerCase()}`);
  }
}

seedDemoUsers()
  .catch((error) => {
    console.error(`Demo account seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });