# CHANGELOG — BOOK STORE APPLICATION UPGRADE

All notable changes and security fixes to this project are documented in this file.

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
