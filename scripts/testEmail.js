
require("dotenv").config();

const {
  verifyEmailConnection,
} = require("../src/config/email");

async function main() {
  try {
    await verifyEmailConnection();
    console.log("SMTP connection verified successfully.");
  } catch (error) {
    console.error("SMTP verification failed:", error.message);
    process.exitCode = 1;
  }
}

main();
