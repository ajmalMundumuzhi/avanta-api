
const { calculateQuote } = require("./src/utils/pricing");

const testProperty = {
  propertyId: "TEST-SEASONAL",
  guests: 4,
  isActive: true,
  isPlaceholder: false,
  pricingConfigured: true,

  pricing: {
    nightlyRate: 200,
    cleaningFee: 100,
    minNights: 1,
    currency: "AUD",

    // Saturday = 6, Sunday = 0
    weekendRates: [
      { dayOfWeek: 6, nightlyRate: 250 },
      { dayOfWeek: 0, nightlyRate: 250 },
    ],

    seasonalRates: [
      {
        name: "Summer Test",
        startDate: new Date("2026-11-14T00:00:00.000Z"),
        endDate: new Date("2026-11-15T00:00:00.000Z"),
        nightlyRate: 300,
      },
    ],

    additionalFees: [
      {
        name: "Extra Service",
        amount: 50,
        calculation: "fixed_per_booking",
        taxable: true,
      },
    ],

    taxes: [
      {
        name: "Test Tax",
        rate: 10,
        appliesTo: [
          "accommodation",
          "cleaning",
          "additional_fees",
        ],
      },
    ],
  },
};

try {
  const quote = calculateQuote(
    testProperty,
    new Date("2026-11-13T00:00:00.000Z"),
    new Date("2026-11-16T00:00:00.000Z"),
    2
  );

  console.log("PRICING TEST RESULT:");
  console.log(JSON.stringify(quote, null, 2));
} catch (error) {
  console.error("Pricing test failed:", error.message);
  process.exitCode = 1;
}
