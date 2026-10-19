import pypandoc

content = """# Avanta Living — Backend & Frontend Progress

**Project:** Avanta Living accommodation booking website  
**Frontend:** `D:\\IDEs\\cozy-escapes\\cozy-escapes`  
**Backend:** `D:\\IDEs\\cozy-escapes\\api`  
**Current phase:** Phase 4 — Frontend Integration  
**Overall status:** Phases 0–4 completed; Phase 5 is next.

> Update this file at each phase checkpoint. Do not mark a task complete until it has been implemented and tested.

## Phase 0 — Requirements and Decisions

**Status: COMPLETE**

- [x] Confirm MongoDB Atlas as the database.
- [x] Confirm Stripe Checkout in test mode for full payment.
- [x] Define pricing model: nightly rate, cleaning fee, minimum nights, and optional seasonal/weekend rates, taxes, and additional fees.
- [x] Decide to build an internal availability calendar first.
- [x] Defer external calendar/API integration until the client supplies provider documentation and credentials.
- [x] Decide on instant booking after verified payment.
- [x] Plan an admin API and React admin UI.
- [x] Choose Cloudinary for property images.
- [x] Choose Nodemailer/company SMTP for email.
- [x] Confirm timezone `Australia/Sydney` and currency `AUD`.
- [x] Preserve public property IDs as strings, including numeric-like IDs such as `441841`.
- [x] Define separate Book Now and Send Inquiry flows.
- [x] Define the frontend API response contract: success uses `{ data }`; errors use `{ error: { code, message, fields? } }`.

### Outstanding client information

- Actual property rates and pricing rules.
- External calendar/booking-platform API documentation and credentials.
- Final cancellation wording for bookings made fewer than 7 days before arrival.
- Confirmation of how cancellation refunds apply to fees and taxes.
- Real property descriptions, images, and guest testimonials where placeholders remain.

## Phase 1 — Backend Scaffold and Core Setup

**Status: COMPLETE**

- [x] Create the backend project under `api`.
- [x] Set up Express and Mongoose.
- [x] Add environment configuration and `.env.example`.
- [x] Add CORS, Helmet, JSON parsing, and global rate limiting.
- [x] Add central error handling and a 404 handler.
- [x] Add `GET /api/health`.
- [x] Connect to MongoDB Atlas.
- [x] Confirm the backend server starts successfully.

## Phase 2 — Models and Seed Data

**Status: COMPLETE**

- [x] Create the Property model.
- [x] Create the Inquiry model.
- [x] Create the Booking model.
- [x] Create the BlockedDate model.
- [x] Create the Testimonial model.
- [x] Create the ServiceCard model.
- [x] Create the OwnerLead model.
- [x] Create the AdminUser model.
- [x] Add indexes and schema validation.
- [x] Create seed data for 12 properties, testimonials, and service cards.
- [x] Mark sample properties and testimonials as placeholders where appropriate.
- [x] Run the seed script successfully.

**Caution:** The seed script clears existing Property, Testimonial, and ServiceCard documents before reseeding. Do not rerun it against data that must be preserved.

## Phase 3 — Public Read APIs

**Status: COMPLETE — user-tested**

- [x] `GET /api/properties` — listing results and pagination/filter support.
- [x] `GET /api/properties/:id` — fetch a property by its stable public ID.
- [x] `GET /api/testimonials` — published, non-placeholder testimonials only.
- [x] `GET /api/services` — published service cards.
- [x] `GET /api/health` — health endpoint.
- [x] Verify the public API responses in testing.

## Phase 4 — Frontend Integration

**Status: COMPLETE — user-tested**

### Property data

- [x] Connect `src/hooks/useProperties.js` to `GET /api/properties`.
- [x] Normalize backend property fields for existing frontend components.
- [x] Connect property detail loading to `GET /api/properties/:id`.
- [x] Add property detail loading and error states through `usePropertyState`.
- [x] Run `npm run build` successfully.
- [x] Verify property `441841` returns `200 OK`.
- [x] Verify `/accommodations` requests `GET /api/properties`; browser showed `304 Not Modified`, which is a valid cache response.

### Testimonials and services

- [x] Connect `src/components/home/Testimonials.jsx` to `GET /api/testimonials`.
- [x] Keep testimonials empty when the API returns `{ "data": [] }`; do not display placeholder reviews as genuine.
- [x] Connect `src/components/home/ServicesFaq.jsx` to `GET /api/services`.
- [x] Verify the services endpoint returns three service cards.
- [x] Run `npm run build` successfully after component changes.

### Notes and remaining polish

- The property detail page supplements API data with local `src/data/propertyDetails.js` content where available, including the 29-image gallery and description for property `441841`.
- The accommodation listing endpoint's `304 Not Modified` response is valid; it indicates the browser can reuse a cached response.
- Existing build warnings remain to investigate later:
  - `/src/style.css` does not exist at build time.
  - Tailwind CSS optimizer warning for `--animate-fade-up: fade-up 0.5s ease both;`.
- Real testimonials are not available in the public API yet because current seeded testimonial records are placeholders or unpublished.
- The client has not yet supplied all production property data and pricing.

## Phase 5 — Inquiries, Email Notifications, and Contact

**Status: NOT STARTED**

Planned tasks:

- [ ] Inspect the current frontend inquiry implementation before editing.
- [ ] Replace the frontend inquiry stub with a real API request.
- [ ] Validate and sanitize inquiry payloads on the backend.
- [ ] Save inquiries in MongoDB.
- [ ] Email the company at `Hello.avantaliving@gmail.com`.
- [ ] Send a guest acknowledgement email.
- [ ] Track email delivery status without losing the saved inquiry if email delivery fails.
- [ ] Inspect and integrate the contact form, once its frontend implementation is identified.
- [ ] Add/verify rate limiting and spam protections for public form endpoints.
- [ ] Test successful submissions, validation errors, and email failures.

**Inquiry rules:** Dates are optional for inquiries. An inquiry does not reserve or hold dates. Booking dates will be required in the separate booking flow.

## Phase 6 — Availability and Pricing

**Status: NOT STARTED**

- [ ] Implement server-side availability checks.
- [ ] Implement quote calculation using configured nightly rates, cleaning fee, minimum nights, and supported additional charges.
- [ ] Respect the `Australia/Sydney` timezone and `AUD` currency.
- [ ] Support blocked dates and internal calendar entries.
- [ ] Avoid double bookings and design safe handling for concurrent booking attempts.
- [ ] Do not make properties bookable until pricing is configured.
- [ ] Confirm unresolved pricing and cancellation rules with the client.
- [ ] Plan an adapter for external calendars; implement external sync only after provider documentation and credentials arrive.

## Phase 7 — Booking and Payments

**Status: NOT STARTED**

- [ ] Create booking quotes server-side; never trust client-supplied totals.
- [ ] Create Stripe Checkout sessions in test mode.
- [ ] Implement verified Stripe webhooks.
- [ ] Make webhook processing idempotent.
- [ ] Confirm a booking only after verified payment success.
- [ ] Implement temporary booking holds and expiry.
- [ ] Prevent overlapping confirmed bookings and handle concurrency safely.
- [ ] Implement cancellation/refund rules after client confirmation.
- [ ] Test success, cancellation, failure, webhook retries, and expiry.

## Phase 8 — Admin Authentication, API, and UI

**Status: NOT STARTED**

- [ ] Implement secure admin login/logout/current-user endpoints.
- [ ] Verify password hashing and role checks.
- [ ] Build property management APIs and admin UI.
- [ ] Manage images through Cloudinary.
- [ ] Manage pricing, availability, blocked dates, bookings, inquiries, testimonials, service cards, and relevant settings.
- [ ] Validate admin inputs and protect admin routes.
- [ ] Test authorization and CRUD operations.

## Phase 9 — Hardening, Testing, and Deployment

**Status: NOT STARTED**

- [ ] Review environment variables and production secrets.
- [ ] Confirm production CORS origins and security headers.
- [ ] Review rate limits, input validation, spam controls, and error responses.
- [ ] Add/verify structured logging and production-safe errors.
- [ ] Verify database indexes and query pagination.
- [ ] Test critical guest and admin workflows end to end.
- [ ] Resolve or document frontend CSS build warnings.
- [ ] Choose hosting and deployment configuration with the project owner.
- [ ] Configure production environment variables and payment webhook URLs.
- [ ] Run final smoke tests after deployment.

## Current next action

Start **Phase 5** by inspecting these frontend files without changing them yet:

```cmd
cd /d D:\\IDEs\\cozy-escapes\\cozy-escapes
type src\\services\\api.js
type src\\components\\booking\\Reservation.jsx
```

Review the current implementation before editing. Work in small checkpoints, run the relevant tests, and update this file when each phase changes status.
"""

output_path = "/mnt/data/PROGRESS.md"
pypandoc.convert_text(content, "md", format="md", outputfile=output_path, extra_args=["--standalone"])
print(f"Created: {output_path}")
