# Avanta Living Backend Progress

## Project
- Backend: Node.js, Express, MongoDB, Mongoose
- Language: JavaScript (CommonJS)
- API base path: /api
- Development port: 5000
- Frontend: React + Vite at http://localhost:5173
- Currency: AUD
- Business timezone: Australia/Sydney

## Confirmed decisions
- MongoDB Atlas free tier
- Stripe Checkout, full payment, test mode
- Per-property nightly pricing, cleaning fee, minimum nights
- Internal calendar first; external calendar/API integration pending
- Instant booking after successful payment
- Admin API and React admin UI
- Cloudinary for property images
- Nodemailer with company SMTP/Gmail
- Preserve numeric-like property IDs
- Separate Book Now and Send Inquiry flows

## Phase 0 — Architecture
Status: Decisions confirmed; external API and pricing details pending.

## Phase 1 — Backend scaffold
Status: Implementation prepared; checkpoint tests pending.

- [x] Install dependencies
- [x] Configure environment variables
- [x] Verify Express server startup
- [x] Verify GET /api/health
- [x] Verify 404 and error responses
- [x] Configure MongoDB Atlas
- [x] Verify database connectivity
- [x] Verify Git ignores secrets

## Phase 1 decisions
- CommonJS module system.
- API listens on port 5000 by default.
- Health endpoint reports the current database connection state.
- The server may start without a database URI during initial setup.
- If a configured database connection fails, startup stops.
- CORS allows the configured frontend origin.
- External calendar synchronization will be decided after receiving provider documentation.

## Open items
- External calendar API documentation and credentials.
- Existing booking platforms and synchronization requirements.
- Approved property rates, taxes, and additional fees.
- Final cancellation and refund rules.
- SMTP configuration and verified sender.
- Production hosting and domain.


## Phase 3 — Public APIs

Status: Complete after final API tests pass.

Implemented:
- GET /api/health
- GET /api/properties
- GET /api/properties/:id
- GET /api/testimonials
- GET /api/services

Property listing features:
- Pagination
- Guest-capacity filtering
- Bedroom filtering
- Featured filtering
- Sorting
- Placeholder listings excluded from public results

Property details:
- Existing string property IDs preserved
- Inactive and placeholder listings return 404
- Missing property returns a structured error

Testimonials:
- Published, non-placeholder testimonials only

Services:
- Published service cards only

Validation:
- [x] Health endpoint
- [x] Property listing
- [x] Property details
- [x] Testimonials
- [x] Services
- [x] Unknown property returns 404
- [x] Invalid pagination returns 400

Next: Phase 4 — Frontend Integration
