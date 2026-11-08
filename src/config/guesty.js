const AUTH_URL =
  process.env.GUESTY_AUTH_URL ||
  "https://booking.guesty.com/oauth2/token";

const API_BASE_URL =
  process.env.GUESTY_API_BASE_URL ||
  "https://booking.guesty.com/api";

const CLIENT_ID = process.env.GUESTY_CLIENT_ID;
const CLIENT_SECRET = process.env.GUESTY_CLIENT_SECRET;

const GRANT_TYPE =
  process.env.GUESTY_GRANT_TYPE || "client_credentials";

const SCOPE =
  process.env.GUESTY_SCOPE || "booking_engine:api";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn("Guesty API credentials are not configured.");
}

module.exports = {
  AUTH_URL,
  API_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  GRANT_TYPE,
  SCOPE,
};