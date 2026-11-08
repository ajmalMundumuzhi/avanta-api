const {
  AUTH_URL,
  API_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  GRANT_TYPE,
  SCOPE,
} = require("../config/guesty");

const GuestyToken = require("../models/GuestyToken");

const TOKEN_KEY = "booking_engine";
const DEFAULT_AUTH_COOLDOWN = 60 * 60 * 1000; // 1 hour
const AUTH_FAILURE_COOLDOWN = 15 * 60 * 1000; // 15 minutes
const REQUEST_TIMEOUT = 15000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const LISTINGS_TTL = 10 * 60 * 1000; // 10 minutes

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

let tokenRequest = null;
let authBlockedUntil = 0;

let listingsCache = {
  data: null,
  expiresAt: 0,
};

class GuestyApiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "GuestyApiError";
    this.statusCode = statusCode;
  }
}

function getRetryDelay(retryAfter) {
  if (!retryAfter) return DEFAULT_AUTH_COOLDOWN;

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryDate = Date.parse(retryAfter);

  if (!Number.isNaN(retryDate)) {
    return Math.max(retryDate - Date.now(), 0);
  }

  return DEFAULT_AUTH_COOLDOWN;
}

async function readResponse(response) {
  const rawBody = await response.text();

  let data = {};

  try {
    data = JSON.parse(rawBody);
  } catch {
    data = {};
  }

  return { rawBody, data };
}

// ---------- Persistence (survives server restarts) ----------

async function loadPersistedState() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) return;

  try {
    const doc = await GuestyToken.findOne({ key: TOKEN_KEY }).lean();

    if (!doc) return;

    tokenCache = {
      accessToken: doc.accessToken || null,
      expiresAt: doc.expiresAt || 0,
    };

    authBlockedUntil = doc.blockedUntil || 0;
  } catch (error) {
    console.error("[Guesty] Could not load saved token:", error.message);
  }
}

async function savePersistedState(fields) {
  try {
    await GuestyToken.updateOne(
      { key: TOKEN_KEY },
      { $set: fields },
      { upsert: true }
    );
  } catch (error) {
    console.error("[Guesty] Could not save token:", error.message);
  }
}

// ---------- Authentication ----------

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new GuestyApiError(
      "Guesty API credentials are not configured.",
      500
    );
  }

  await loadPersistedState();

  if (
    tokenCache.accessToken &&
    Date.now() < tokenCache.expiresAt
  ) {
    return tokenCache.accessToken;
  }

  if (Date.now() < authBlockedUntil) {
    const remainingSeconds = Math.ceil(
      (authBlockedUntil - Date.now()) / 1000
    );

    throw new GuestyApiError(
      `Guesty authentication is temporarily paused. Try again in ${remainingSeconds} seconds.`,
      429
    );
  }

  if (tokenRequest) {
    return tokenRequest;
  }

  tokenRequest = (async () => {
    const body = new URLSearchParams({
      grant_type: GRANT_TYPE,
      scope: SCOPE,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    let response;

    try {
      response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    } catch (error) {
      console.error("[Guesty Connection Error]", {
        message: error.message,
        cause:
          error.cause?.code ||
          error.cause?.message ||
          String(error.cause),
      });

      throw new GuestyApiError(
        "Unable to connect to Guesty authentication."
      );
    }

    const { rawBody, data } = await readResponse(response);

    if (response.status === 429) {
      const retryDelay = getRetryDelay(
        response.headers.get("retry-after")
      );

      authBlockedUntil = Date.now() + retryDelay;

      await savePersistedState({ blockedUntil: authBlockedUntil });

      console.error("[Guesty Rate Limit]", {
        status: response.status,
        retryAfterSeconds: Math.ceil(retryDelay / 1000),
        responseBody: rawBody,
      });

      throw new GuestyApiError(
        "Guesty authentication rate limit reached.",
        429
      );
    }

    if (!response.ok || !data.access_token) {
      console.error("[Guesty Authentication Error]", {
        status: response.status,
        responseBody: rawBody,
      });

      // Bad credentials: pause so repeated failures don't eat the daily limit
      if (response.status === 400 || response.status === 401) {
        authBlockedUntil = Date.now() + AUTH_FAILURE_COOLDOWN;
        await savePersistedState({ blockedUntil: authBlockedUntil });
      }

      throw new GuestyApiError(
        "Guesty authentication failed.",
        502
      );
    }

    const expiresIn = Number(data.expires_in) || 86400;

    tokenCache = {
      accessToken: data.access_token,
      expiresAt:
        Date.now() + Math.max(expiresIn - 300, 60) * 1000,
    };

    authBlockedUntil = 0;

    await savePersistedState({
      accessToken: tokenCache.accessToken,
      expiresAt: tokenCache.expiresAt,
      blockedUntil: 0,
    });

    console.log("[Guesty] Authentication successful.");

    return tokenCache.accessToken;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

// ---------- API requests ----------

async function guestyRequest(endpoint, options = {}) {
  const token = await getAccessToken();

  const url = new URL(
    `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`
  );

  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  let response;

  try {
    response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(options.body
        ? { body: JSON.stringify(options.body) }
        : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch (error) {
    console.error("[Guesty API Connection Error]", {
      message: error.message,
      cause:
        error.cause?.code ||
        error.cause?.message ||
        String(error.cause),
      url: `${url.origin}${url.pathname}`,
    });

    throw new GuestyApiError(
      "Unable to connect to Guesty API."
    );
  }

  const { rawBody, data } = await readResponse(response);

  if (!response.ok) {
    console.error("[Guesty API Error]", {
      status: response.status,
      responseBody: rawBody,
    });

    throw new GuestyApiError(
      response.status === 429
        ? "Guesty API rate limit reached."
        : "Guesty API request failed.",
      response.status
    );
  }

  return data;
}

// ---------- Listings ----------

function getNextCursor(data) {
  return (
    data?.pagination?.cursor ||
    data?.pagination?.nextCursor ||
    data?.cursor ||
    null
  );
}

async function getListings({ limit = PAGE_LIMIT, cursor } = {}) {
  return guestyRequest("/listings", {
    query: {
      limit: Math.min(Number(limit) || PAGE_LIMIT, PAGE_LIMIT),
      cursor,
    },
  });
}

async function getAllListings() {
  const allListings = [];
  let cursor = undefined;
  let pagesFetched = 0;

  while (pagesFetched < MAX_PAGES) {
    const data = await getListings({
      limit: PAGE_LIMIT,
      cursor,
    });

    const listings = Array.isArray(data.results)
      ? data.results
      : [];

    allListings.push(...listings);
    pagesFetched += 1;

    // Fewer results than requested means this was the last page
    if (listings.length < PAGE_LIMIT) {
      break;
    }

    const nextCursor = getNextCursor(data);

    if (!nextCursor || listings.length === 0) {
      break;
    }

    cursor = nextCursor;
  }

  return {
    results: allListings,
    totalFetched: allListings.length,
    pagesFetched,
  };
}

async function getAllListingsCached() {
  if (listingsCache.data && Date.now() < listingsCache.expiresAt) {
    return listingsCache.data;
  }

  const data = await getAllListings();

  listingsCache = {
    data,
    expiresAt: Date.now() + LISTINGS_TTL,
  };

  return data;
}

async function getListingById(id) {
  return guestyRequest(`/listings/${encodeURIComponent(id)}`);
}

module.exports = {
  getAccessToken,
  getListings,
  getAllListings,
  getAllListingsCached,
  getListingById,
  guestyRequest,
  GuestyApiError,
};