
const { sendEmail } = require("../config/email");

async function submitContact(req, res, next) {
  try {
    const { name, email, subject, message, website } = req.body || {};

    // Silently ignore submissions caught by the spam trap.
    if (website) {
      return res.status(200).json({
        success: true,
        message: "Message received.",
      });
    }

    // Validate required fields.
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof message !== "string" ||
      message.trim().length < 10
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid name, email, and message.",
        },
      });
    }

    // Validate field lengths.
    if (
      name.length > 100 ||
      email.length > 254 ||
      (subject !== undefined &&
        (typeof subject !== "string" || subject.length > 200)) ||
      message.length > 5000
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more fields exceed the allowed length.",
        },
      });
    }

    const recipient =
      process.env.CONTACT_EMAIL || "Hello.avantaliving@gmail.com";

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSubject =
      typeof subject === "string" && subject.trim()
        ? subject.trim()
        : "General enquiry";
    const cleanMessage = message.trim();

    // Respond immediately, without waiting for SMTP.
    res.status(200).json({
      success: true,
      message: "Your message has been received.",
    });

    // Attempt email delivery in the background.
    setImmediate(() => {
      sendEmail({
        to: recipient,
        replyTo: cleanEmail,
        subject: `Website contact: ${cleanSubject}`,
        text: [
          "A new contact form message was received.",
          "",
          `Name: ${cleanName}`,
          `Email: ${cleanEmail}`,
          `Subject: ${cleanSubject}`,
          "",
          "Message:",
          cleanMessage,
        ].join("\n"),
      }).catch((error) => {
        console.error("Contact email delivery failed:", error);
      });
    });
  } catch (error) {
    if (res.headersSent) {
      return next(error);
    }

    return next(error);
  }
}

module.exports = { submitContact };
