
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateOnlyUTC(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function calculateQuote(property, checkin, checkout, guests) {
  const pricing = property.pricing || {};

  if (
    property.pricingConfigured !== true ||
    property.isActive !== true ||
    property.isPlaceholder === true
  ) {
    throw new Error("This property is not configured for booking.");
  }

  if (
    !Number.isFinite(pricing.nightlyRate) ||
    pricing.nightlyRate <= 0
  ) {
    throw new Error("A valid nightly rate has not been configured.");
  }

  if (
    !Number.isFinite(pricing.cleaningFee) ||
    pricing.cleaningFee < 0
  ) {
    throw new Error("The cleaning fee configuration is invalid.");
  }

  if (
    !Number.isInteger(pricing.minNights) ||
    pricing.minNights < 1
  ) {
    throw new Error("The minimum-night configuration is invalid.");
  }

  if (!Number.isInteger(guests) || guests < 1 || guests > property.guests) {
    throw new Error("The guest count is invalid for this property.");
  }

  const start = dateOnlyUTC(checkin);
  const end = dateOnlyUTC(checkout);
  const nights = Math.round((end - start) / 86400000);

  if (nights < 1) {
    throw new Error("Check-out must be after check-in.");
  }

  if (nights < pricing.minNights) {
    throw new Error(
      `This property requires a minimum stay of ${pricing.minNights} nights.`
    );
  }

  const nightlyPrices = [];
  let accommodationSubtotal = 0;

  for (let i = 0; i < nights; i += 1) {
    const night = addDays(start, i);
    const nextDay = addDays(night, 1);

    const seasonalRate = (pricing.seasonalRates || [])
      .filter((rate) => {
        const seasonStart = dateOnlyUTC(new Date(rate.startDate));
        const seasonEnd = dateOnlyUTC(new Date(rate.endDate));

        return overlaps(night, nextDay, seasonStart, seasonEnd);
      })
      .sort((a, b) => {
        return (
          dateOnlyUTC(new Date(b.startDate)) -
          dateOnlyUTC(new Date(a.startDate))
        );
      })[0];

    const weekendRate = (pricing.weekendRates || []).find(
      (rate) => rate.dayOfWeek === night.getUTCDay()
    );

    let amount = pricing.nightlyRate;
    let rule = "base";

    // Explicit precedence: seasonal rate overrides weekend rate.
    if (seasonalRate) {
      amount = seasonalRate.nightlyRate;
      rule = `seasonal:${seasonalRate.name}`;
    } else if (weekendRate) {
      amount = weekendRate.nightlyRate;
      rule = "weekend";
    }

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("A nightly rate configuration is invalid.");
    }

    amount = roundMoney(amount);
    accommodationSubtotal += amount;

    nightlyPrices.push({
      date: night,
      amount,
      rule,
    });
  }

  accommodationSubtotal = roundMoney(accommodationSubtotal);

  const cleaningFee = roundMoney(pricing.cleaningFee);
  const additionalFees = [];
  let additionalFeeTotal = 0;

  for (const fee of pricing.additionalFees || []) {
    let amount;

    switch (fee.calculation) {
      case "fixed_per_booking":
        amount = fee.amount;
        break;
      case "per_night":
        amount = fee.amount * nights;
        break;
      case "per_guest_per_night":
        amount = fee.amount * guests * nights;
        break;
      default:
        throw new Error(
          `Unsupported fee calculation for "${fee.name}".`
        );
    }

    amount = roundMoney(amount);

    additionalFees.push({
      name: fee.name,
      amount,
    });

    additionalFeeTotal += amount;
  }

  additionalFeeTotal = roundMoney(additionalFeeTotal);

  const taxBases = {
    accommodation: accommodationSubtotal,
    cleaning: cleaningFee,
    additional_fees: roundMoney(
      (pricing.additionalFees || []).reduce((sum, fee) => {
        if (fee.taxable !== true) return sum;

        switch (fee.calculation) {
          case "fixed_per_booking":
            return sum + fee.amount;
          case "per_night":
            return sum + fee.amount * nights;
          case "per_guest_per_night":
            return sum + fee.amount * guests * nights;
          default:
            return sum;
        }
      }, 0)
    ),
  };

  const taxes = (pricing.taxes || []).map((tax) => {
    const taxableBase = (tax.appliesTo || []).reduce(
      (sum, category) => sum + (taxBases[category] || 0),
      0
    );

    return {
      name: tax.name,
      amount: roundMoney(taxableBase * (tax.rate / 100)),
    };
  });

  const taxTotal = roundMoney(
    taxes.reduce((sum, tax) => sum + tax.amount, 0)
  );

  const total = roundMoney(
    accommodationSubtotal +
      cleaningFee +
      additionalFeeTotal +
      taxTotal
  );

  return {
    nights,
    priceBreakdown: {
      nightlyPrices,
      accommodationSubtotal,
      cleaningFee,
      additionalFees,
      taxes,
      discount: 0,
      total,
      currency: pricing.currency || "AUD",
      pricingVersion: "1",
    },
  };
}

module.exports = { calculateQuote };