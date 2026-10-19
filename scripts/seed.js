
require("dotenv").config();

const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/database");
const Property = require("../src/models/Property");
const Testimonial = require("../src/models/Testimonial");
const ServiceCard = require("../src/models/ServiceCard");
const { properties, testimonials, serviceCards } = require("../src/data/seedData");

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await connectDatabase();

    console.log("Clearing existing seed collections...");
    await Promise.all([
      Property.deleteMany({}),
      Testimonial.deleteMany({}),
      ServiceCard.deleteMany({})
    ]);

    console.log("Seeding properties...");
    await Property.insertMany(properties);

    console.log("Seeding testimonials...");
    await Testimonial.insertMany(testimonials);

    console.log("Seeding service cards...");
    await ServiceCard.insertMany(serviceCards);

    const [propertyCount, testimonialCount, serviceCardCount] =
      await Promise.all([
        Property.countDocuments(),
        Testimonial.countDocuments(),
        ServiceCard.countDocuments()
      ]);

    console.log("\nDATABASE SEED COMPLETED");
    console.log("Properties:", propertyCount);
    console.log("Testimonials:", testimonialCount);
    console.log("Service cards:", serviceCardCount);
  } catch (error) {
    console.error("\nDATABASE SEED FAILED");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
