
const { sendEmail } = require("../config/email");

const PROPERTY_TYPES = [
  "My entire vacation home (or condo)",
  "I have more than one property type",
  "No property yet, but I'm looking to buy",
  "My primary residence",
  "My timeshare",
  "A private room in my home",
  "A guesthouse with a private entrance",
  "My unique property (treehouse, glamp site, etc.)",
  "Other",
];

const MANAGEMENT_TYPES = [
  "I self-manage my property",
  "I use a property manager",
  "Nobody. I've never rented it out before",
];

const AVAILABILITY_OPTIONS = [
  "Under 10% (0-4 weeks)",
  "10-50% (5-26 weeks)",
  "50-90% (26-47 weeks)",
  "90%+ (Over 47 weeks)",
];

const REVENUE_OPTIONS = [
  "$50,000 or less",
  "$50,000-$75,000",
  "$75,000-$100,000",
  "$100,000+",
];

function sendError(res, status, code, message, fields) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  });
}

async function verifyCaptcha(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    throw new Error("reCAPTCHA server configuration is missing.");
  }

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Unable to verify reCAPTCHA.");
  }

  const result = await response.json();

  return result.success === true;
}

function buildCompanyEmail(data) {
  return [
    "A new property assessment request has been received.",
    "",
    "PROPERTY INFORMATION",
    "--------------------",
    `Property type: ${data.propertyType}`,
    `Management: ${data.managementType}`,
    `Rental availability: ${data.availability}`,
    `Annual gross revenue: ${data.annualRevenue}`,
    "",
    "PROPERTY DETAILS",
    "----------------",
    `Bedrooms: ${data.bedrooms}`,
    `Address: ${data.address}`,
    "",
    "CONTACT INFORMATION",
    "-------------------",
    `Name: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    "",
    `Submitted at: ${new Date().toISOString()}`,
  ].join("\n");
}

function buildCustomerEmail(data) {
  return [
    `Hi ${data.firstName},`,
    "",
    "Thank you for your interest in Avanta Living's landlord partnership program.",
    "",
    "We have received your property assessment request successfully.",
    "Our team will review your property details and contact you soon.",
    "",
    "YOUR SUBMISSION",
    "---------------",
    `Property type: ${data.propertyType}`,
    `Bedrooms: ${data.bedrooms}`,
    `Address: ${data.address}`,
    "",
    "This is an acknowledgement of your enquiry, not a confirmation of a property assessment or partnership.",
    "",
    "Kind regards,",
    "Avanta Living",
  ].join("\n");
}

async function createPropertyAssessment(req, res, next) {
  try {
    const body = req.body || {};
    const errors = {};

    const fields = [
      "propertyType",
      "managementType",
      "availability",
      "annualRevenue",
      "address",
      "firstName",
      "lastName",
      "email",
      "phone",
    ];
    if (process.env.NODE_ENV === "production") {
      fields.push("captchaToken");
    }

    for (const field of fields) {
      if (
        typeof body[field] !== "string" ||
        !body[field].trim()
      ) {
        errors[field] = `${field} is required.`;
      }
    }

    const bedroomCount = Number(body.bedrooms);

    if (
      body.bedrooms === undefined ||
      body.bedrooms === null ||
      body.bedrooms === "" ||
      !Number.isInteger(bedroomCount) ||
      bedroomCount < 0 ||
      bedroomCount > 100
    ) {
      errors.bedrooms = "Enter a valid bedroom count.";
    }

    if (
      typeof body.propertyType === "string" &&
      !PROPERTY_TYPES.includes(body.propertyType.trim())
    ) {
      errors.propertyType = "Select a valid property type.";
    }

    if (
      typeof body.managementType === "string" &&
      !MANAGEMENT_TYPES.includes(body.managementType.trim())
    ) {
      errors.managementType = "Select a valid management option.";
    }

    if (
      typeof body.availability === "string" &&
      !AVAILABILITY_OPTIONS.includes(body.availability.trim())
    ) {
      errors.availability = "Select a valid availability option.";
    }

    if (
      typeof body.annualRevenue === "string" &&
      !REVENUE_OPTIONS.includes(body.annualRevenue.trim())
    ) {
      errors.annualRevenue = "Select a valid revenue option.";
    }

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = "Enter a valid email address.";
    }

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    if (phone && !/^[+()\d\s-]{7,30}$/.test(phone)) {
      errors.phone = "Enter a valid phone number.";
    }

    const maxLengths = {
      propertyType: 150,
      managementType: 100,
      availability: 100,
      annualRevenue: 50,
      address: 1000,
      firstName: 100,
      lastName: 100,
      email: 254,
      phone: 30,
      captchaToken: 5000,
    };

    for (const [field, max] of Object.entries(maxLengths)) {
      if (
        typeof body[field] === "string" &&
        body[field].length > max
      ) {
        errors[field] = `${field} exceeds the maximum allowed length.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Please check the submitted information.",
        errors
      );
    }

    if (process.env.NODE_ENV === "production") {
      const captchaValid = await verifyCaptcha(
        body.captchaToken.trim()
      );

      if (!captchaValid) {
        return sendError(
          res,
          400,
          "CAPTCHA_FAILED",
          "reCAPTCHA verification failed. Please try again."
        );
      }
    }

    const assessment = {
      propertyType: body.propertyType.trim(),
      managementType: body.managementType.trim(),
      availability: body.availability.trim(),
      annualRevenue: body.annualRevenue.trim(),
      bedrooms: bedroomCount,
      address: body.address.trim(),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email,
      phone,
    };

    const companyEmail =
      process.env.CONTACT_EMAIL || "Hello.avantaliving@gmail.com";

    const companyResult = await sendEmail({
      to: companyEmail,
      subject: `New Property Assessment — ${assessment.firstName} ${assessment.lastName}`,
      text: buildCompanyEmail(assessment),
      replyTo: assessment.email,
    });

    console.log(
      "Property assessment notification sent:",
      companyResult.messageId
    );

    let customerEmailSent = false;

    try {
      const customerResult = await sendEmail({
        to: assessment.email,
        subject: "We received your Avanta Living property assessment request",
        text: buildCustomerEmail(assessment),
      });

      customerEmailSent = true;

      console.log(
        "Property assessment acknowledgement sent:",
        customerResult.messageId
      );
    } catch (emailError) {
      console.error(
        "Customer acknowledgement email failed:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message: "Your property assessment request has been submitted successfully.",
      data: {
        notificationSent: true,
        acknowledgementSent: customerEmailSent,
      },
    });
  } catch (error) {
    console.error("Property assessment submission error:", error);

    if (error.message === "reCAPTCHA server configuration is missing.") {
      return sendError(
        res,
        500,
        "CAPTCHA_CONFIGURATION_ERROR",
        "The verification service is not configured."
      );
    }

    if (error.message === "Unable to verify reCAPTCHA.") {
      return sendError(
        res,
        503,
        "CAPTCHA_SERVICE_UNAVAILABLE",
        "Unable to verify your request right now. Please try again."
      );
    }

    if (error.message === "SMTP is not configured.") {
      return sendError(
        res,
        503,
        "EMAIL_CONFIGURATION_ERROR",
        "The email service is currently unavailable."
      );
    }

    return next(error);
  }
}

module.exports = { createPropertyAssessment };