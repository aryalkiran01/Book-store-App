# QA AUDIT REPORT — BOOK STORE / BOOK REVIEW APPLICATION
**Audit Date:** 2026-09-16  
**Auditor:** Senior Full-Stack & QA Architect  
**Audit Scope:** Full Repository (Frontend, Backend, Database, Infrastructure, External Integrations, Static Checks)  
**Execution Phase:** PHASE 0 — COMPLETE REPOSITORY AUDIT

---

## 1. Executive Summary

A comprehensive, ground-up audit was performed across the entire repository. The application is a full-stack e-commerce book review and purchasing platform built with **React (TypeScript, Tailwind CSS, Vite, TanStack Query, Zustand)** on the frontend and **Node.js (Express, TypeScript, Mongoose, Zod)** on the backend, supporting MongoDB, eSewa v2, Khalti ePayment v2, Google Books API, and Open Library.

### Overall Assessment
- **Architecture Foundation:** Solid modular architecture with clear separation of routes, controllers, services, and models.
- **Frontend Health:** Functional UI with rich features, but contains **55 ESLint issues** (48 errors, 7 warnings), unhandled route protection for private/admin views, missing error boundaries, and unstandardized API clients mixing raw `fetch` calls.
- **Backend Health:** Type checks pass cleanly (`tsc --noEmit`), but critical gaps exist in inventory reservation lifecycles, soft-deletion handling, session invalidation, and transactional consistency.
- **Security & Integrity:** Identified insecure fallback secrets, stateless JWT role trust without active status validation, missing CSRF token mechanisms, and lack of inventory transaction ledgers.

---

## 2. Static Check Results

| Check Target | Tool / Command | Result | Findings |
|---|---|---|---|
| Backend TypeScript | `npx tsc --noEmit` | **PASS (0 errors)** | No compilation errors in backend code. |
| Frontend TypeScript | `npx tsc -b` | **PASS (0 errors)** | Frontend types build cleanly. |
| Frontend ESLint | `npx eslint .` | **FAIL (55 issues)** | 48 errors (`@typescript-eslint/no-explicit-any`, `prefer-const`, `no-unused-vars`), 7 warnings (`react-hooks/exhaustive-deps`, `react-refresh/only-export-components`). |
| Backend Dependencies | `npm audit` | **21 vulnerabilities** | 2 Critical, 11 High, 7 Moderate, 1 Low (primarily in transitive `undici` / `@vercel/node`). |
| Frontend Dependencies | `npm audit` | **4 vulnerabilities** | 1 High, 3 Moderate (`vite`, `react-router`, `esbuild`). |
| Root package.json | Schema validation | **FAIL (1 typo)** | `"scrpipts"` instead of `"scripts"`. |

---

## 3. Frontend Audit Findings

### 3.1 Routing & Route Protection (`frontend/src/router.tsx`)
- **Missing Protected Route Guards:** Routes `/dashboard`, `/admin`, `/checkout`, `/payment`, `/orders`, `/orders/:orderId`, and `/profile` are exposed directly without frontend auth guards (`ProtectedRoute` / `AdminRoute`). An unauthenticated visitor can enter the route and encounter unhandled client errors or blank states before the backend rejects the request.
- **Missing Auth Pages:** Missing dedicated routes for `/forgot-password`, `/reset-password`, and `/verify-email`.
- **Case Sensitivity Duplication:** Redundant aliases (`/checkout` and `/Checkout`, `/books` and `/catalog`, `/orders` and `/my-orders`) are in the router.

### 3.2 State Management & Client Storage (`frontend/src/store/`, `frontend/src/utils/cartStorage.ts`)
- **Guest-Only Cart/Wishlist Persistence:** Cart and wishlist are stored solely in `localStorage`. There is no backend synchronization, merging upon login, or real-time server-side stock and price revalidation during session transitions.
- **Zustand Auth Store:** Stores user state in memory without proactive session expiration checking or automatic token refresh handling.

### 3.3 API Layer & Error Normalization (`frontend/src/api/`)
- **Non-Standardized HTTP Client:** Mixes raw `fetch` calls across `api/auth/fetch.ts`, `api/book/fetch.ts`, `api/order/fetch.ts`, and `api/payment/fetch.ts` without a unified Axios client, request timeouts, correlation IDs, or centralized 401 interceptor logic to handle expired sessions uniformly.
- **Any Type Castings:** Multiple API endpoints use `any` response signatures causing downstream type safety gaps.

### 3.4 Component & UX Review
- **Error Boundaries:** No global or sectional `ErrorBoundary` wrapping the catalog, checkout, or admin routes. A render error in one component crashes the whole React tree.
- **Loading / Empty States:** Book catalog and orders have good basic skeleton loaders, but lack retry triggers on network failure.
- **Accessibility (a11y):** Form inputs in checkout and modal dialogues lack strict ARIA labels, focus traps, and keyboard escape listeners.
- **Responsive Overflow:** Admin dashboard tables and checkout comparison views have potential horizontal scrollbar clipping on screens < 390px.

---

## 4. Backend Audit Findings

### 4.1 Authentication & Session Management (`backend/src/modules/auth/`, `backend/src/utils/auth.ts`)
- **Stateless JWT Claims Trust:** `checkAuth` middleware extracts `role` and `id` directly from the decoded JWT payload without checking MongoDB to verify if the user exists, is active/disabled, or if their `sessionVersion` / password was modified after token issuance.
- **Missing Account Security Endpoints:** No implementation for password reset tokens (`/forgot-password`, `/reset-password`) or email verification tokens.
- **No Session Invalidation:** Password change does not invalidate outstanding JWT tokens issued to other devices.

### 4.2 Authorization & Access Control (`backend/src/modules/`)
- **RBAC Audit:** Admin routes under `/api/admin` enforce `checkAdmin`, but role changes and user deletions lack granular audit logging.
- **IDOR Check:** Order endpoints (`getOrderByIdService`, `cancelOrderService`) enforce ownership verification (`order.userId === requestingUserId || role === 'admin'`). However, review updates and deletions verify ownership only at the controller/service level without unified middleware policy abstractions.

### 4.3 Order & Inventory Lifecycle (`backend/src/modules/order/`, `backend/src/modules/book/`)
- **Immediate Stock Decrement vs. Reservation:** Orders decrement physical stock immediately upon order placement (`createOrderService`) rather than holding a temporary stock reservation (`reservedStock` / `availableStock`) with an automatic TTL release worker for abandoned online payments.
- **Hard Deletes:** `deleteOrderService` executes `findByIdAndDelete`, obliterating historical transactional and accounting records.
- **Lack of Inventory Ledger:** Stock changes do not record an immutable transaction log (`InventoryTransaction`) tracking sale, reservation, release, manual adjustment, damage, or restock events.
- **State Machine Transitions:** Current status transitions are defined in `VALID_STATUS_TRANSITIONS`, but lack explicit payment state machine coupling and refund workflow stages.

### 4.4 Payment Integrations (`backend/src/modules/payment/`)
- **Payment Records Model:** eSewa payments have no dedicated collection records; only a sparse `KhaltiPaymentModel` exists.
- **Idempotency:** Payment verification sets `paymentStatus = "completed"` but lacks strict distributed idempotency locks to guard against concurrent callback replays.
- **Refund Processing:** Refund is simulated purely as an order status string change without real gateway refund integration, tracking ID, or ledger accounting.

### 4.5 External Catalog & Search (`backend/src/modules/book/`)
- **Auto-Catalog Ingestion:** External search automatically persists third-party Google Books / Open Library results into the core sellable book collection with default stock = 20, conflating discovery results with official merchant inventory.
- **Soft Delete Missing:** `deleteBookService` deletes books permanently (`findByIdAndDelete`), breaking foreign-key references in historical orders and existing reviews.

---

## 5. Infrastructure & Security Audit Summary

| Component | Current State | Risk / Gap | Required Remediation |
|---|---|---|---|
| JWT Secret | Fallback to default string in `config.ts` | **P0 Critical** | Require strong `JWT_SECRET` in environment; fail startup if absent. |
| eSewa Secret | Hardcoded fallback `"8gBm/:&EnhH.1/q"` in `config.ts` | **P0 Critical** | Remove hardcoded secret; enforce environment variable. |
| Docker Compose | Hardcoded secrets in `docker-compose.yml` | **P0 Critical** | Strip default fallback values from compose file. |
| CSRF Protection | Cookie-based auth without CSRF token | **P1 High** | Implement CSRF token validation and strict Origin checking. |
| Demo Payment | Allowed unless explicitly production | **P1 High** | Strictly guard demo payment paths with environment flags. |
| Admin Audit Log | Non-existent | **P2 Medium** | Implement `AdminAuditLog` collection and middleware. |
| Health Endpoints | `/api/health` exposes memory, uptime, DB status | **P3 Low** | Split into lightweight `/health/live` and authorized `/health/ready`. |

---

## 6. QA Audit Conclusion & Recommendations

The application has a very strong core with comprehensive features already partially implemented (Khalti, eSewa, review aggregation, admin analytics, book discovery). However, it requires systematic phase-by-phase hardening:
1. **Phases 1–4:** Eliminate all hardcoded credentials, enforce session validity and server-side RBAC.
2. **Phases 5–13:** Implement robust order state machines, inventory reservation with TTL, transaction ledgers, soft-deletes, and real payment verification idempotency.
3. **Phases 14–25:** Implement server-side cart/wishlist sync, saved addresses, coupon validation, review reporting models, and admin audit logging.
4. **Phases 26–36:** Decouple external discovery from merchant catalog, harden search, standardize the frontend API client, and add database indexes.
5. **Phases 37–60:** Complete test suites (Unit, Integration, Security, E2E), accessibility, responsive polish, and production observability.
