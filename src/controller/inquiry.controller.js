const { sendEmail } = require("../config/email");
const Inquiry = require("../models/Inquiry");
const Property = require("../models/Property");

function sendError(res, status, code, message, fields) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  });
}

function parseOptionalDate(value, field, errors) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors[field] = "Use the YYYY-MM-DD date format.";
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    errors[field] = "Enter a valid date.";
    return null;
  }

  return date;
}

async function sendInquiryEmails({
  inquiryId,
  companyEmail,
  guestEmail,
  propertyTitle,
  propertyId,
  guest,
  checkin,
  checkout,
  guests,
  marketingOptIn,
}) {
  const guestName = `${guest.firstName} ${guest.lastName}`;

  const dateText =
    checkin && checkout
      ? `Check-in: ${checkin.toISOString().slice(0, 10)}\nCheck-out: ${checkout.toISOString().slice(0, 10)}`
      : "Dates: Not specified";

  const companyText = [
    "A new property inquiry has been received.",
    "",
    `Inquiry ID: ${inquiryId}`,
    `Property ID: ${propertyId}`,
    `Property: ${propertyTitle}`,
    `Guest: ${guestName}`,
    `Email: ${guest.email}`,
    `Phone: ${guest.dialCode} ${guest.phone}`,
    `Address: ${guest.address}, ${guest.city}, ${guest.state} ${guest.zip}, ${guest.country}`,
    dateText,
    `Guests: ${guests}`,
    `Message: ${guest.message || "No message provided"}`,
    `Marketing opt-in: ${marketingOptIn ? "Yes" : "No"}`,
  ].join("\n");

  const guestText = [
    `Hi ${guest.firstName},`,
    "",
    "Thank you for contacting Avanta Living.",
    "We've received your inquiry and our team will review it and get back to you.",
    "",
    `Property: ${propertyTitle}`,
    `Property ID: ${propertyId}`,
    dateText,
    "",
    "This is an inquiry acknowledgement, not a booking confirmation. Your dates have not been reserved.",
    "",
    "Kind regards,",
    "Avanta Living",
  ].join("\n");

  const emailResults = await Promise.allSettled([
    sendEmail({
      to: companyEmail,
      subject: `New property inquiry — ${propertyTitle}`,
      text: companyText,
    }),
    sendEmail({
      to: guestEmail,
      subject: "We've received your Avanta Living inquiry",
      text: guestText,
    }),
  ]);

  const allEmailsSent = emailResults.every(
    (result) => result.status === "fulfilled"
  );

  const emailStatus = allEmailsSent ? "sent" : "failed";

  if (!allEmailsSent) {
    console.error(
      "Inquiry email delivery failed:",
      emailResults
        .map((result) =>
          result.status === "rejected"
            ? result.reason?.message || "Unknown email error"
            : null
        )
        .filter(Boolean)
    );
  }

  await Inquiry.findByIdAndUpdate(inquiryId, { emailStatus });

  console.log(`Inquiry ${inquiryId}: email status ${emailStatus}`);
}

async function createInquiry(req, res, next) {
  try {
    const body = req.body || {};
    const guest = body.guest;
    const errors = {};

    if (
      typeof body.propertyId !== "string" ||
      !body.propertyId.trim() ||
      body.propertyId.length > 100
    ) {
      errors.propertyId = "A valid property ID is required.";
    }

    if (!guest || typeof guest !== "object" || Array.isArray(guest)) {
      errors.guest = "Guest details are required.";
    }

    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "city",
      "zip",
      "country",
    ];

    if (guest && typeof guest === "object" && !Array.isArray(guest)) {
      for (const field of requiredFields) {
        if (
          typeof guest[field] !== "string" ||
          !guest[field].trim()
        ) {
          errors[field] = `${field} is required.`;
        }
      }

      if (
        typeof guest.email === "string" &&
        guest.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())
      ) {
        errors.email = "Enter a valid email address.";
      }

      const maxLengths = {
        firstName: 100,
        lastName: 100,
        email: 254,
        phone: 30,
        address: 200,
        address2: 200,
        city: 100,
        zip: 20,
        state: 100,
        country: 100,
        message: 3000,
        dialCode: 10,
      };

      for (const [field, max] of Object.entries(maxLengths)) {
        if (
          guest[field] !== undefined &&
          (typeof guest[field] !== "string" ||
            guest[field].length > max)
        ) {
          errors[field] =
            `${field} must be a string with at most ${max} characters.`;
        }
      }
    }

    const checkin = parseOptionalDate(body.checkin, "checkin", errors);
    const checkout = parseOptionalDate(body.checkout, "checkout", errors);

    if (Boolean(body.checkin) !== Boolean(body.checkout)) {
      errors.dates =
        "Provide both check-in and check-out dates, or neither.";
    }

    if (checkin && checkout && checkout <= checkin) {
      errors.checkout = "Check-out must be after check-in.";
    }

    const guests = Number(body.guests);

    if (!Number.isInteger(guests) || guests < 1 || guests > 100) {
      errors.guests =
        "Guest count must be a whole number between 1 and 100.";
    }

    if (
      body.marketing !== undefined &&
      typeof body.marketing !== "boolean"
    ) {
      errors.marketing = "Marketing consent must be true or false.";
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

    const property = await Property.findOne({
      propertyId: body.propertyId.trim(),
      isActive: true,
      isPlaceholder: false,
    });

    if (!property) {
      return sendError(
        res,
        404,
        "PROPERTY_NOT_FOUND",
        "This property is unavailable or could not be found."
      );
    }

    if (guests > property.guests) {
      return sendError(
        res,
        400,
        "GUEST_LIMIT_EXCEEDED",
        `This property accommodates up to ${property.guests} guests.`,
        { guests: "Guest count exceeds this property's capacity." }
      );
    }

    const inquiry = await Inquiry.create({
      property: property._id,
      propertyId: property.propertyId,
      guest: {
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        email: guest.email.trim().toLowerCase(),
        dialCode: guest.dialCode?.trim() || "+61",
        phone: guest.phone.trim(),
        address: guest.address.trim(),
        address2: guest.address2?.trim() || "",
        city: guest.city.trim(),
        zip: guest.zip.trim(),
        state: guest.state?.trim() || "",
        country: guest.country.trim(),
        message: guest.message?.trim() || "",
      },
      checkin,
      checkout,
      guests,
      marketingOptIn: body.marketing === true,
      status: "new",
      ip: req.ip || null,
      userAgent: req.get("user-agent")?.slice(0, 500) || null,
      emailStatus: "pending",
    });

    const companyEmail =
      process.env.CONTACT_EMAIL || "Hello.avantaliving@gmail.com";

    // Respond immediately after the inquiry is saved.
    res.status(201).json({
      data: {
        id: inquiry._id,
        propertyId: inquiry.propertyId,
        status: inquiry.status,
        emailStatus: inquiry.emailStatus,
        createdAt: inquiry.createdAt,
      },
    });

    // Send notifications after the response. SMTP delays won't keep
    // the customer's submit button waiting for the emails.
    setImmediate(() => {
      sendInquiryEmails({
        inquiryId: inquiry._id,
        companyEmail,
        guestEmail: inquiry.guest.email,
        propertyTitle: property.title,
        propertyId: inquiry.propertyId,
        guest: inquiry.guest,
        checkin: inquiry.checkin,
        checkout: inquiry.checkout,
        guests: inquiry.guests,
        marketingOptIn: inquiry.marketingOptIn,
      }).catch((error) => {
        console.error(
          `Failed to process emails for inquiry ${inquiry._id}:`,
          error
        );

        Inquiry.findByIdAndUpdate(inquiry._id, {
          emailStatus: "failed",
        }).catch((updateError) => {
          console.error(
            "Failed to update inquiry email status:",
            updateError
          );
        });
      });
    });
  } catch (error) {
    if (res.headersSent) {
      return next(error);
    }

    return next(error);
  }
}

module.exports = { createInquiry };