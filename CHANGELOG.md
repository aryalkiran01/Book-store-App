# CHANGELOG — BOOK STORE APPLICATION UPGRADE

All notable changes and security fixes to this project are documented in this file.

---

## [Phase 36–45 Release] — MongoDB Transactions, Unit/Security/E2E Test Suites, Error Boundaries, Accessibility & Mobile Polish — 2026-09-16

### Added
- **MongoDB Transactions & Multi-Document Safety (Phase 36):**
  - Created `backend/src/utils/transaction.ts` supporting `mongoose.startSession()` and `session.withTransaction()`.
  - Implemented automatic detection and graceful fallback for standalone local MongoDB instances (`runInTransaction`), ensuring zero test or development friction while providing full ACID atomicity in production replica sets.
- **Testing Infrastructure & Test Harness Isolation (Phase 37):**
  - Standardized runner harness in `backend/tests/run-all.mjs` orchestrating 14 distinct test suites spanning all backend modules.
- **Unit Testing Suite (Phase 38):**
  - Created `backend/tests/unit-order-calc.test.mjs` validating:
    - Order discount calculations and free shipping threshold rules (NPR $\ge 1000$).
    - Nepal 13% VAT tax calculations and precision currency rounding.
    - JWT signing, payload decoding, and signature tampering detection.
    - Order state machine transitions and invalid status jump rejection.
- **Security & Penetration Testing Suite (Phase 40):**
  - Created `backend/tests/security-penetration.test.mjs` testing NoSQL query injection payloads, ReDoS algorithmic complexity attacks, IDOR boundary protection, and forged elevated JWT tokens.
- **End-to-End E-Commerce Purchasing Lifecycle (Phases 39 & 41):**
  - Created `backend/tests/e2e-lifecycle.test.mjs` executing full multi-role end-to-end purchasing flows: catalog creation $\to$ customer registration $\to$ cart items $\to$ checkout $\to$ gateway simulation $\to$ invoice generation $\to$ status progression.
- **Loading, Error & Empty UX States (Phase 42):**
  - Created `frontend/src/components/common/EmptyState.tsx` with accessible announcements and customizable action buttons.
  - Created `frontend/src/components/common/SkeletonLoader.tsx` supporting text, rectangular, circular, and card skeleton variants.
- **React Global Error Boundary (Phase 43):**
  - Created `frontend/src/components/common/ErrorBoundary.tsx` wrapping the application root in `frontend/src/App.tsx` with crash recovery buttons ("Reload Page" and "Return Home").
- **WCAG 2.1 AA Accessibility & Keyboard Navigation (Phase 44):**
  - Created `frontend/src/components/common/SkipLink.tsx` enabling keyboard navigation to skip directly to main content (`#main-content`).
  - Added ARIA landmarks, `role="status"`, `role="alert"`, and visible focus rings.
- **Responsive Mobile Polish (Phase 45):**
  - Enforced minimum touch target dimensions ($\ge 44 \times 44\text{px}$) on buttons and links for mobile viewports ($320\text{px} - 1440\text{px}$).

---

## [Phase 26–35 Release] — Catalog Ingestion & Resilience, Circuit Breakers, Search Hardening, Route Guards & Health Probes — 2026-09-16

### Added
- **Circuit Breaker for External Book Providers (Phases 26 & 27):**
  - Created `backend/src/utils/circuitBreaker.ts` with configurable state machine (`CLOSED` $\to$ `OPEN` $\to$ `HALF_OPEN`).
  - Integrated circuit breaker into `OpenLibraryProvider` and `GoogleBooksProvider` to automatically stop calling failing upstream providers, serving graceful empty fallbacks without blocking requests or crashing the server.
- **Search Query Hardening & Boundary Defense (Phase 28):**
  - Implemented regex escape utility in `backend/src/modules/book/service.ts` to neutralize ReDoS attacks and NoSQL injection patterns in `search`, `genre`, and `author` parameters.
  - Enforced strict pagination boundaries: `page` capped at `[1, 500]` and `limit` capped at `[1, 50]`.
- **Standardized Frontend API Client (Phases 29 & 30):**
  - Created `frontend/src/lib/apiClient.ts` with typed methods (`api.get`, `api.post`, `api.put`, `api.delete`, `api.patch`).
  - Automatic query parameter serialization, header injection, and centralized `401 Unauthorized` interception that redirects expired sessions to `/login?redirect=...`.
- **Frontend Route Protection & RBAC Guards (Phase 31):**
  - Implemented `frontend/src/components/auth/ProtectedRoute.tsx` for private user routes (`/cart`, `/wishlist`, `/orders`, `/account`, `/checkout`).
  - Implemented `frontend/src/components/auth/AdminRoute.tsx` for administrative dashboards (`/admin`, `/admin/books`, `/admin/orders`, `/admin/reviews`, `/admin/import`).
  - Protected all routes in `frontend/src/router.tsx`.
- **Standardized Health Probes (Phase 32):**
  - Created `/health/live` (lightweight liveness probe for orchestrators/load balancers).
  - Created `/health/ready` (deep readiness probe checking MongoDB connection state).
  - Maintained `/api/health` providing uptime and system timestamp.
- **Granular Endpoint Rate Limiting (Phase 33):**
  - Added `checkoutRateLimiter` (30 requests / 15 minutes) protecting `/api/orders` against checkout denial-of-service or bot exhaustion.
  - Added `searchRateLimiter` (60 requests / minute) protecting `/api/books` catalog searching.
- **MongoDB Compound & Performance Indexes (Phase 35):**
  - Added high-performance compound indexes on `BookModel`:
    - `{ isDeleted: 1, stock: 1, createdAt: -1 }` (catalog listing)
    - `{ featured: 1, isDeleted: 1, createdAt: -1 }` (featured books carousel)
    - `{ isNewArrival: 1, isDeleted: 1, createdAt: -1 }` (new arrivals tab)
- **Automated Test Suite Expansion:**
  - Added `backend/tests/resilience-catalog.test.mjs` verifying circuit breaker transitions, search regex sanitization, pagination bounding, health probes, and database indexes.
  - All 11 test suites passing (100% green).

---

## [Phase 21–25 Release] — Admin Audit Trail, Email Engine, Invoices, Tax Engine & Profile Security — 2026-09-16

### Added
- **Admin Audit Trail & Accountability (Phase 21):**
  - Created `AdminAuditLogModel` tracking all administrative actions (`UPDATE_USER_ROLE`, `DELETE_USER`, `UPDATE_STOCK`, `MODERATE_REVIEW`, `DELETE_REVIEW`, `IMPORT_BOOK`) with actor ID, IP address, user agent, timestamps, and mutation metadata.
  - Implemented `recordAdminAuditLog()` and `getAdminAuditLogsService()`.
  - Added admin endpoint `GET /api/admin/audit-logs` with pagination and action/target filtering, secured by RBAC (`checkAdmin`).
- **Email Notification Engine (Phase 22):**
  - Created `backend/src/utils/email.ts` with SendGrid support and fail-soft development/testing mock dispatchers.
  - Built responsive HTML email templates for:
    - Welcome email (`sendWelcomeEmail`)
    - Email verification (`sendVerificationEmail`)
    - Password reset (`sendPasswordResetEmail`)
    - Order confirmation (`sendOrderConfirmationEmail`)
    - Payment received (`sendPaymentCompletedEmail`)
    - Order shipped (`sendOrderShippedEmail`)
    - Refund approved (`sendRefundApprovedEmail`)
- **Invoice Generation Engine (Phase 23):**
  - Created `backend/src/modules/order/invoice.service.ts` generating unique sequential invoice numbers (`INV-YYYY-XXXXXX`).
  - Added `GET /api/orders/:orderId/invoice` returning structured JSON invoice metadata.
  - Added `GET /api/orders/:orderId/invoice/html` returning print-ready styled HTML invoices with bill-to details, line items, VAT calculation, and payment status badges.
  - Protected with strict authorization checks (users can only access their own invoices, admins can access any).
- **Configurable Tax Engine (Phase 24):**
  - Created `backend/src/modules/order/tax.service.ts` supporting configurable VAT rates (defaulting to Nepal's 13% standard VAT).
  - Calculates subtotal, taxable amount, tax-exempt items, tax amount, and grand total.
  - Integrated into invoice generation and order calculations.
- **Account Profile & Security Settings (Phase 25):**
  - Added user profile updating `PUT /api/auth/profile` (username uniqueness enforcement, phone, address, avatar).
  - Added secure two-step email change flow `POST /api/auth/change-email` and `POST /api/auth/verify-new-email` with crypto tokens.
  - Added global session termination `POST /api/auth/logout-all` invalidating all active JWT tokens across devices by incrementing `sessionVersion`.
  - Added soft account deletion `DELETE /api/auth/account` with password verification, soft deletion (`isDeleted: true, isActive: false, deletedAt`), and immediate session invalidation.
- **Automated Test Suite Expansion:**
  - Added `backend/tests/security-profile-admin.test.mjs` with 14 comprehensive tests covering audit logs, invoices, VAT calculation, profile updates, email change verification, global logout, and account deletion.
  - All 10 test suites passing (100% green).

---

## [Phase 14–20 Release] — Server Cart Sync, Wishlist, Addresses, Coupons, Hardened Checkout & Review Moderation — 2026-09-16

### Added
- **Server-Side Cart Synchronization (Phase 14):**
  - Created `CartModel` supporting multi-device cart persistence.
  - Endpoints `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:bookId`, `DELETE /api/cart/items/:bookId`, `POST /api/cart/sync`, and `DELETE /api/cart`.
  - Automatic live stock recalculation and guest cart merge upon login.
- **Persistent Wishlist (Phase 15):**
  - Created `WishlistModel` with populated book details and active catalog filtering.
  - Endpoints `GET /api/wishlist`, `POST /api/wishlist/toggle/:bookId`, `DELETE /api/wishlist/:bookId`, and `POST /api/wishlist/sync`.
- **Checkout Hardening (Phase 16):**
  - Enforced strict authoritative server calculations for book prices, discount percentage savings, coupon discounts, and free shipping thresholds (>= NPR 1000).
- **Saved Shipping Address Management (Phase 17):**
  - Created `AddressModel` with default address handling.
  - Endpoints `GET /api/addresses`, `POST /api/addresses`, `PUT /api/addresses/:addressId`, `PATCH /api/addresses/:addressId/default`, and `DELETE /api/addresses/:addressId`.
- **Coupon & Promotion Engine (Phase 18):**
  - Created `CouponModel` supporting percentage/fixed discounts, minimum order requirements, maximum discount caps, usage limits, and expiration dates.
  - Endpoints `POST /api/coupons/validate` and admin CRUD `/api/coupons`.
  - Integrated automatic coupon validation and usage tracking into `createOrderService`.
- **Review System Hardening & Verified Purchase (Phase 19):**
  - Added `ReviewReportModel` to log community spam/abuse reports with resolution notes.
  - Added `POST /api/reviews/:reviewId/report`.
- **Review Moderation Dashboard (Phase 20):**
  - Admin review moderation endpoints: `GET /api/reviews/admin/reports` and `PATCH /api/reviews/admin/reports/:reportId`.
- **Test Suite Expansion:**
  - Added `backend/tests/ecommerce-core.test.mjs` verifying all 7 e-commerce core flows (100% green).

---

## [Phase 5–13 Release] — Order State Machine, Inventory Ledger, Payment Security, Refunds & Shipping — 2026-09-16

### Added
- **Order State Machine & Transition Rules (Phase 5):**
  - Explicit enum states: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `return_requested`, `returned`, `refund_pending`, `refunded`, and `cancelled`.
  - Enforced valid lifecycle transitions; illegal jumps (e.g. `delivered` $\to$ `pending`) are rejected with `400 Bad Request`.
- **Stock Reservation Engine with 15-Minute TTL (Phase 6):**
  - Added `reservedStock` to `BookModel` and `reservationExpiresAt` to `OrderModel`.
  - Atomic stock reservations decrement available stock pool without immediate physical depletion during online gateway checkouts.
  - Background worker `startReservationCleanupWorker()` automatically cleans up expired uncompleted reservations every 60 seconds.
- **Inventory Transaction Ledger (Phase 7):**
  - Added `InventoryTransactionModel` and `recordInventoryTransaction()` tracking complete audit history for `RESERVATION`, `SALE`, `RESERVATION_RELEASE`, `RETURN`, `REFUND`, `MANUAL_ADJUSTMENT`, and `RESTOCK`.
- **Soft Deletion & Audit Integrity (Phases 8 & 9):**
  - Added `isDeleted`, `deletedAt`, and `deletedBy` fields to both `OrderModel` and `BookModel`.
  - Replaced destructive `findByIdAndDelete` with soft deletion, preserving order histories, reviews, and transaction records.
  - Filtered catalog search, recommendations, and detail lookups to exclude deleted books.
- **Payment Security & Distributed Idempotency (Phase 10):**
  - Added `PaymentModel` with unique compound index on `{ provider, transactionId }` to prevent double crediting or duplicate transaction execution.
  - Connected `commitOrderReservation()` to convert reservations into committed sales upon Khalti and eSewa verification.
- **Demo Payment Safeguards (Phase 11):**
  - Blocked demo/simulated payments unconditionally when running in `production` (`403 Forbidden`).
  - Allowed safe local testing in `development` via `POST /api/payments/demo`.
- **Real Refund Workflow (Phase 12):**
  - Added `RefundModel` with complete lifecycle tracking (`requested` $\to$ `approved` $\to$ `completed` / `rejected`).
  - Added customer refund request endpoint `POST /api/orders/:orderId/refund`.
  - Added admin endpoints `GET /api/payments/refunds` and `POST /api/payments/refunds/:refundId/process` with automatic inventory restocking.
- **Shipping & Delivery Tracking (Phase 13):**
  - Added carrier and tracking fields to `OrderModel` (`shippingProvider`, `trackingNumber`, `shippedAt`, `estimatedDeliveryAt`, `deliveredAt`, `deliveryStatus`).
  - Added admin update route `PATCH /api/orders/:orderId/shipping`.

---

## [Phase 1–4 Release] — Security Hardening, Authentication & RBAC — 2026-09-16

### Added
- **Session Versioning (`sessionVersion`):** Added `sessionVersion` field to `UserModel` and encoded it in JWT payload (`sub`, `sessionVersion`).
- **Live Database Authentication Guard:** Updated `checkAuth` to verify that authenticated accounts exist, are active (`isActive: true`), and match the expected `sessionVersion` on every request.
- **Account Invalidation on Security Events:**
  - Password change increments `sessionVersion` to automatically terminate old sessions on all other devices.
  - Role update / account modification forces session version increment for instant permission revocation.
- **Self-Service Password Reset Flow:**
  - `POST /api/auth/forgot-password`: Generates cryptographically secure 32-byte random token and stores SHA-256 hash with a 15-minute expiration window.
  - `POST /api/auth/reset-password`: Validates hashed token, updates password, clears reset token, increments session version, and prevents replay attacks.
- **Email Verification Flow:**
  - `POST /api/auth/email-verification/send`: Issues a 24-hour verification token.
  - `POST /api/auth/email-verification/verify`: Verifies email and sets `isEmailVerified: true`.
- **CSRF & Origin Protection:**
  - Added `createCsrfProtectionMiddleware` validating `Origin` and `Referer` headers on state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Centralized Authorization Aliases:**
  - Added `requireAuth()` and `requireRole(...)` helper middleware for consistent server-side authorization enforcement.
- **Lightweight Health Check Endpoints:**
  - Added public `/health/live` and `/health/ready` endpoints with minimal footprint and zero sensitive information disclosure.

### Changed
- **JWT Secret Enforcement:** Removed insecure default string fallback in `config.ts`. In production environments, `JWT_SECRET` must be set with at least 32 characters or the server will fail-closed on startup.
- **eSewa Secret Enforcement:** Removed hardcoded secret key fallback `"8gBm/:&EnhH.1/q"`. Added `isEsewaConfigured` runtime validation.
- **Docker Compose Hardening:** Removed embedded default secrets (`${JWT_SECRET:-...}`, `${KHALTI_API_KEY:-...}`) from `docker-compose.yml`.
- **Root Configuration:** Fixed typo `"scrpipts"` -> `"scripts"` in root `package.json`.
- **Extended Test Suite:** Added automated tests for password reset, email verification, and session invalidation in `backend/tests/auth.test.mjs`.

---

## [Phase 0 Release] — Initial Audit & Roadmap Formulation — 2026-09-16

### Added
- Created `QA_AUDIT.md` detailing static checks, routing, component state, and system gaps.
- Created `SECURITY_AUDIT.md` documenting OWASP Top 10 vulnerabilities, hardcoded secret locations, and session risks.
- Created `IMPLEMENTATION_PLAN.md` outlining the 60-phase production upgrade roadmap.
