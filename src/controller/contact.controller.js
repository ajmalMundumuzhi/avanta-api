const { sendEmail } = require("../config/email");

async function submitContact(req, res, next) {
  try {
    const { name, email, subject, message, website } = req.body || {};

    // Silently ignore submissions caught by the frontend spam trap.
    if (website) {
      return res.status(200).json({
        success: true,
        message: "Message received.",
      });
    }

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

    if (
      name.length > 100 ||
      email.length > 254 ||
      (typeof subject === "string" && subject.length > 200) ||
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

    await sendEmail({
      to: recipient,
      replyTo: email.trim(),
      subject: `Website contact: ${
        typeof subject === "string" && subject.trim()
          ? subject.trim()
          : "General enquiry"
      }`,
      text: [
        "A new contact form message was received.",
        "",
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Subject: ${subject || "General enquiry"}`,
        "",
        "Message:",
        message.trim(),
      ].join("\n"),
    });

    return res.status(200).json({
      success: true,
      message: "Your message has been sent successfully.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { submitContact };