
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const readline = require("readline");
const AdminUser = require("../src/models/AdminUser");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createAdmin() {
  try {
    const name = (await ask("Admin name: ")).trim();
    const email = (await ask("Admin email: ")).trim().toLowerCase();
    const password = await ask("Admin password: ");

    if (!name || !email || password.length < 12) {
      throw new Error(
        "Name and email are required. Password must be at least 12 characters."
      );
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await AdminUser.findOne({ email });

    if (existing) {
      throw new Error("An admin with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await AdminUser.create({
      name,
      email,
      passwordHash,
      role: "admin",
      isActive: true,
    });

    console.log(`Admin created successfully: ${admin.email}`);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();
