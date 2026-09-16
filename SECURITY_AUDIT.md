# SECURITY AUDIT REPORT — BOOK STORE / BOOK REVIEW APPLICATION
**Audit Date:** 2026-09-16  
**Audited Target:** Book Store & Book Review App (Frontend & Backend)  
**Security Standard:** OWASP Top 10, ASVS Level 2, Production Hardening Guidelines  
**Execution Phase:** PHASE 0 — COMPLETE SECURITY AUDIT

---

## 1. Executive Summary

A comprehensive threat modeling and security posture evaluation was conducted. Several critical and high-severity security issues were identified across authentication, secret management, authorization, payment processing, CSRF protection, and data integrity.

### Threat Matrix Overview
- **P0 Critical:** 3 issues (Hardcoded JWT fallbacks, eSewa secret fallbacks, Docker Compose credentials)
- **P1 High:** 5 issues (Stateless JWT token role reliance without DB active check, Missing CSRF defense on state-changing cookie requests, Hard deletion of financial & order data, Lack of payment transaction idempotency locks, Auto-persistence of untrusted external catalog data)
- **P2 Medium:** 6 issues (Missing password reset crypto flow, Missing account lock/disable immediate revocation, Lack of admin audit log, Information disclosure in `/api/health`, Unvalidated client-side cart totals, Missing server-side address validation)
- **P3 Low:** 4 issues (ESLint any-casts in auth handlers, Missing granular rate limiters on payment endpoints, Missing security.txt, Missing Content-Security-Policy header configuration)

---

## 2. Vulnerability Breakdown & Findings

### SEC-01: Hardcoded Secrets & Insecure Fallback Values (Severity: P0 - Critical)
- **Locations:**
  - `backend/src/utils/config.ts` (Lines 10–11, Line 26)
  - `docker-compose.yml` (Line 29, Line 32)
- **Vulnerability:**
  - `JWT_SECRET` defaults to `"supersecretjwtkey_bookreviewapp_2025_secure"` if not provided in environment variables.
  - `ESEWA_SECRET_KEY` defaults to `"8gBm/:&EnhH.1/q"`.
  - `docker-compose.yml` embeds default fallback strings `${JWT_SECRET:-production_secure_random_jwt_secret_key_2026}` and `${KHALTI_API_KEY:-test_secret_key_...}`.
- **Risk:**
  - If deployed to production without an `.env` file or with empty variables, the server boots silently with well-known cryptographic keys. Attackers can forge valid admin JWT tokens or tamper with eSewa HMAC-SHA256 signatures to confirm unpaid orders.
- **Remediation:**
  - Enforce mandatory environment variable checks at startup in `backend/src/utils/config.ts`.
  - Throw a fatal startup error if `JWT_SECRET` is missing, shorter than 32 characters, or set to a known placeholder.
  - Remove all default secret fallbacks from `docker-compose.yml` and code files.

---

### SEC-02: Stateless JWT Role Trust & Lack of Active Session Invalidation (Severity: P1 - High)
- **Locations:**
  - `backend/src/utils/auth.ts` (Lines 24–41)
  - `backend/src/modules/auth/middleware.ts` (Lines 22–86)
- **Vulnerability:**
  - `checkAuth` middleware verifies the JWT signature and directly assigns `req.user = { id: payload.id, role: payload.role }`.
  - The database is not queried to confirm if the user still exists, has been suspended/banned, or had their role changed.
  - There is no `sessionVersion` or `tokenVersion` field in the user model.
- **Risk:**
  - A user whose account is disabled or demoted retains admin privileges until the 7-day token expiration.
  - Password change or logout on one device fails to terminate sessions active on other devices.
- **Remediation:**
  - Introduce `sessionVersion: { type: Number, default: 1 }` and `isActive: { type: Boolean, default: true }` in `UserModel`.
  - Include `tokenVersion` in JWT claims.
  - Verify against the live user record or cache in `checkAuth` to ensure instant revocation.

---

### SEC-03: Missing CSRF Protection on State-Changing Cookie Requests (Severity: P1 - High)
- **Locations:**
  - `backend/src/main.ts`
  - `backend/src/modules/auth/controller.ts` (Line 74: `res.cookie("token", ...)`)
- **Vulnerability:**
  - Authentication tokens are delivered via `httpOnly` cookies.
  - State-changing endpoints (`POST /api/order`, `POST /api/payments/*`, `DELETE /api/books/*`, `PATCH /api/admin/*`) lack Anti-CSRF token verification (`csurf` or double-submit cookie pattern) and rely solely on CORS origin matching.
- **Risk:**
  - Cross-site request forgery is possible from browser contexts where CORS headers are misconfigured or through sub-domain takeover / browser vulnerabilities.
- **Remediation:**
  - Implement double-submit CSRF cookie protection or custom header checks (`X-Requested-With` / `X-CSRF-Token`) for all mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Restrict cookie `SameSite` attribute dynamically (`Strict` or `Lax` for production).

---

### SEC-04: Lack of Payment State Machine & Distributed Idempotency (Severity: P1 - High)
- **Locations:**
  - `backend/src/modules/payment/service.ts`
  - `backend/src/modules/order/service.ts`
- **Vulnerability:**
  - Khalti and eSewa callbacks mutate `OrderModel` directly without a dedicated `Payment` collection tracking transaction state transitions, gateway timestamps, raw payload hashes, or distributed locks.
  - Concurrent verification requests can race to execute order fulfillment logic and inventory changes.
- **Risk:**
  - Race conditions during gateway webhook/redirect replay can cause inconsistent order statuses, double stock decrements, or erroneous refund triggers.
- **Remediation:**
  - Create a unified `Payment` collection with unique index on `{ provider, transactionId }` and `{ orderId, status }`.
  - Ensure payment status transitions are strictly idempotent: `PENDING -> PROCESSING -> COMPLETED / FAILED`.

---

### SEC-05: Non-Destructive Soft-Delete & Order Record Preservation (Severity: P1 - High)
- **Locations:**
  - `backend/src/modules/order/service.ts` (Line 597: `findByIdAndDelete`)
  - `backend/src/modules/book/service.ts` (Line 141: `findByIdAndDelete`)
  - `backend/src/modules/admin/service.ts` (Line 227: `findByIdAndDelete`)
- **Vulnerability:**
  - Orders, books, and user accounts are hard-deleted directly from MongoDB.
- **Risk:**
  - Destruction of financial audit trails, broken relational references in review and order subdocuments, and inability to reconcile historic revenue.
- **Remediation:**
  - Replace all hard deletes with soft delete semantics (`isDeleted: true`, `deletedAt: Date`, `deletedBy: ObjectId`).
  - Preserve immutable snapshot schemas for order items and shipping addresses.

---

### SEC-06: Verified Purchase Spoofing in Review System (Severity: P2 - Medium)
- **Locations:**
  - `backend/src/modules/review/service.ts` (Line 161)
- **Vulnerability:**
  - `isVerifiedPurchase` is evaluated with `OrderModel.exists({ userId, status: { $ne: "cancelled" }, "books.bookId": bookId })`.
  - An unpaid order (`paymentStatus: "pending"`, `status: "pending"`) or unfulfilled COD order is incorrectly counted as a verified purchase.
- **Risk:**
  - Malicious users can place fake pending orders and immediately post "Verified Purchase" 5-star or 1-star reviews.
- **Remediation:**
  - Enforce verified purchase criteria strictly: Order must have `paymentStatus === "completed"` OR `status === "delivered"`.

---

### SEC-07: Incomplete Password Reset & Account Recovery Flows (Severity: P2 - Medium)
- **Locations:**
  - `backend/src/modules/auth/`
- **Vulnerability:**
  - The application provides no self-service password reset mechanism.
- **Risk:**
  - Users locked out of accounts require manual database intervention, creating security and operational bottlenecks.
- **Remediation:**
  - Implement `/api/auth/forgot-password` and `/api/auth/reset-password` utilizing crypto-secure 32-byte hexadecimal tokens, SHA-256 hash storage, 15-minute expiration, and rate limiting.

---

### SEC-08: Verbose Health Check Information Disclosure (Severity: P2 - Medium)
- **Locations:**
  - `backend/src/main.ts` (Lines 119–139)
- **Vulnerability:**
  - `/api/health` exposes Node.js `process.memoryUsage().heapUsed`, database connectivity details, and uptime to unauthenticated clients.
- **Risk:**
  - Information leakage assisting attackers in memory exhaustion or fingerprinting backend infrastructure.
- **Remediation:**
  - Separate into a public lightweight `/health/live` returning `{ status: "ok" }` and an authorized `/health/ready` for internal monitoring.

---

### SEC-09: Dependency Vulnerabilities (Severity: P2 - Medium)
- **Locations:**
  - `backend/package.json` (`@vercel/node`, `undici`)
  - `frontend/package.json` (`vite`, `react-router`, `esbuild`)
- **Vulnerability:**
  - 21 backend CVEs (primarily undici HTTP request smuggling / websocket memory DoS in transitive packages).
  - 4 frontend CVEs (Vite path traversal on Windows alternate paths, React Router open redirect).
- **Remediation:**
  - Upgrade dependencies during maintenance phases (`npm audit fix`).

---

## 3. Security Hardening Checklist by Phase

| Phase | Security Domain | Target Controls |
|---|---|---|
| **Phase 1** | Secret Management | Eliminate fallback secrets in code & Docker; fail startup on invalid `JWT_SECRET`. |
| **Phase 2** | Auth & Sessions | Add `sessionVersion`, `isActive`, password reset crypto tokens, email verification. |
| **Phase 3** | CSRF & Cookies | Enforce SameSite cookie policies, Origin/Referer validation, and anti-CSRF headers. |
| **Phase 4** | RBAC & IDOR | Server-side role validation middleware, strict ownership assertions on all resources. |
| **Phase 10** | Payment Security | Server-to-server gateway verification, HMAC verification, payment idempotency lock. |
| **Phase 11** | Demo Payment Safety | Production fail-closed guard preventing demo payments in production environments. |
| **Phase 21** | Admin Audit Trail | Create `AdminAuditLog` model recording every privileged administrative operation. |
| **Phase 33** | Rate Limiting | Granular rate limiters on auth, checkout, payments, reviews, and search. |
| **Phase 34** | Input Validation | Zod schema validation on body, query, and params across every API endpoint. |
| **Phase 52** | Security Headers | Helmet hardening with production Content-Security-Policy and HSTS. |
