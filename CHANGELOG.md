# CHANGELOG — BOOK STORE APPLICATION UPGRADE

All notable changes and security fixes to this project are documented in this file.

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
