# KitabGhar (Book Store App) — Production API Documentation & Architecture Guide

Welcome to the **KitabGhar Production API Documentation**. This document outlines the system architecture, authentication model, business rules, and API endpoints.

---

## 🏛️ Architecture Overview

```
                          ┌────────────────────────┐
                          │   Frontend (React+TS)  │
                          │     Vite + Tailwind    │
                          └───────────┬────────────┘
                                      │ (HTTP/HTTPS with Credentials)
                                      ▼
                          ┌────────────────────────┐
                          │  Express.js API Server │
                          │  - Helmet + CSP        │
                          │  - Request ID Tracing  │
                          │  - Rate Limiters       │
                          │  - JWT + Session Ver.  │
                          └───────────┬────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│   MongoDB Database │     │ Payment Gateways   │     │ Upstream APIs      │
│  - Multi-doc ACID  │     │ - Khalti v2        │     │ - Google Books API │
│  - Compound Index  │     │ - eSewa EPAY v2    │     │ - Open Library     │
│  - Soft Deletions  │     │ - Cash On Delivery │     │ - Circuit Breakers │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

---

## 🔐 Authentication & Session Security

- **Cookie Transport:** HttpOnly, Secure (in production), SameSite=Lax/Strict `token` cookie.
- **Payload Structure:** `{ id, username, email, role: "user" | "admin", sessionVersion: number }`.
- **Session Versioning:** Changing password, deleting account, or triggering `POST /api/auth/logout-all` increments `sessionVersion`, instantly revoking all active JWTs across devices.
- **Fail-Closed RBAC:** `checkAuth` verifies active session; `checkAdmin` verifies administrative privileges.

---

## 📋 Complete API Endpoints Inventory

### 1. Authentication & Profile (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/login` | Public | Login with email/password, issues HttpOnly cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clears auth cookie |
| `POST` | `/api/auth/logout-all` | Authenticated | Global logout across all devices |
| `GET` | `/api/auth/me` | Authenticated | Fetches current user profile |
| `PUT` | `/api/auth/profile` | Authenticated | Updates user profile (name, phone, address, avatar) |
| `POST` | `/api/auth/change-password` | Authenticated | Changes password and invalidates previous sessions |
| `POST` | `/api/auth/change-email` | Authenticated | Initiates email change with verification token |
| `POST` | `/api/auth/verify-new-email` | Authenticated | Confirms email change |
| `DELETE` | `/api/auth/account` | Authenticated | Soft deletes account with password confirmation |

### 2. Catalog & Discovery (`/api/books`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/books` | Public | Search catalog with filters (`search`, `genre`, `author`, `minPrice`, `maxPrice`, `sortBy`, `page`, `limit`) |
| `GET` | `/api/books/suggestions` | Public | Typeahead search suggestions |
| `GET` | `/api/books/genres` | Public | Distinct list of genres |
| `GET` | `/api/books/featured` | Public | Curated featured books |
| `GET` | `/api/books/new-arrivals` | Public | New arrival titles |
| `GET` | `/api/books/homepage-feeds`| Public | Homepage feed categories |
| `GET` | `/api/books/:id` | Public | Single book details and aggregated review ratings |
| `GET` | `/api/books/:id/recommendations` | Public | Related book recommendations |
| `POST` | `/api/books` | Admin | Create book in catalog |
| `PUT` | `/api/books/:id` | Admin | Update book metadata and stock |
| `DELETE` | `/api/books/:id` | Admin | Soft delete book from catalog |

### 3. Server-Side Cart (`/api/cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Authenticated | Get user's active persistent cart |
| `POST` | `/api/cart/items` | Authenticated | Add item or increment quantity |
| `PUT` | `/api/cart/items/:bookId` | Authenticated | Update exact item quantity |
| `DELETE` | `/api/cart/items/:bookId` | Authenticated | Remove item from cart |
| `POST` | `/api/cart/sync` | Authenticated | Merge guest localStorage cart into server cart upon login |
| `DELETE` | `/api/cart` | Authenticated | Clear cart |

### 4. Wishlist (`/api/wishlist`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/wishlist` | Authenticated | Get user's saved wishlist |
| `POST` | `/api/wishlist/toggle/:bookId` | Authenticated | Toggle book in wishlist |
| `DELETE` | `/api/wishlist/:bookId` | Authenticated | Remove book from wishlist |
| `POST` | `/api/wishlist/sync` | Authenticated | Merge guest wishlist |

### 5. Orders & Invoices (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Authenticated | Create order with 15-minute stock reservation |
| `GET` | `/api/orders` | Authenticated | List current user's order history |
| `GET` | `/api/orders/:id` | Authenticated | Order details (Owner / Admin) |
| `PATCH` | `/api/orders/:id/cancel` | Authenticated | Cancel pending order and release reserved stock |
| `POST` | `/api/orders/:id/refund` | Authenticated | Request order refund |
| `GET` | `/api/orders/:id/invoice` | Authenticated | Structured JSON invoice with 13% VAT |
| `GET` | `/api/orders/:id/invoice/html` | Authenticated | Styled printable HTML invoice |
| `PATCH` | `/api/orders/:id/status` | Admin | Advance order status through state machine |

### 6. Payments & Webhooks (`/api/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/payments/initiate` | Authenticated | Initiate Khalti v2 e-payment session |
| `POST` | `/api/payments/verify` | Authenticated | Verify Khalti transaction with idempotency guard |
| `POST` | `/api/payments/esewa/initiate` | Authenticated | Generate authoritative eSewa HMAC-SHA256 signature |
| `POST` | `/api/payments/esewa/verify` | Authenticated | Verify eSewa EPAY v2 transaction |
| `POST` | `/api/payments/demo` | Dev/Test | Simulated payment verification (blocked in production) |
| `GET` | `/api/payments/refunds` | Admin | List customer refund requests |
| `POST` | `/api/payments/refunds/:id/process` | Admin | Process/approve refund and restock inventory |

### 7. Coupons & Promotions (`/api/coupons`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/coupons/validate` | Authenticated | Validate coupon code against subtotal |
| `GET` | `/api/coupons` | Admin | List all promotional coupons |
| `POST` | `/api/coupons` | Admin | Create new percentage or fixed discount coupon |
| `PUT` | `/api/coupons/:id` | Admin | Update coupon rules |
| `DELETE` | `/api/coupons/:id` | Admin | Deactivate coupon |

### 8. Customer Support (`/api/support`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/support` | Public/Auth | Submit support ticket |
| `GET` | `/api/support/admin` | Admin | List support tickets with status filter |
| `PATCH` | `/api/support/admin/:id/status` | Admin | Update ticket resolution status |

### 9. Admin Analytics & Operations (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/analytics` | Admin | High-level KPIs, revenue, stock alerts & charts |
| `GET` | `/api/admin/audit-logs` | Admin | Comprehensive administrative audit trail |
| `GET` | `/api/admin/users` | Admin | User list and role management |
| `PATCH` | `/api/admin/users/:id/role` | Admin | Update user role (`user` $\leftrightarrow$ `admin`) |
| `GET` | `/api/admin/openlibrary/search` | Admin | Search external Open Library works |
| `POST` | `/api/admin/openlibrary/import` | Admin | Import external book with custom NPR pricing |

### 10. Health & Readiness Probes
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health/live` | Public | Shallow liveness ping for load balancers |
| `GET` | `/health/ready` | Public | Deep readiness check validating MongoDB connection |
| `GET` | `/api/health` | Public | System uptime and status metadata |

---

## 🧪 Automated Test Suite Runbook

To run all 15 automated test suites:
```bash
cd backend
npm test
```
To run frontend type checking and production build:
```bash
cd frontend
npm run build
```
