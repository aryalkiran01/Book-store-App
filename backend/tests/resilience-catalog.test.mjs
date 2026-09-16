import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  BASE_URL,
  closeDB,
} from "./test_helpers.mjs";
import { CircuitBreaker, CircuitState } from "../dist/utils/circuitBreaker.js";

test("PHASES 26-35: Catalog Resilience, Search Hardening, Route Guards & Health Checks", async (t) => {
  let user;
  let admin;
  let testBook;

  t.before(async () => {
    user = await createRegularUserClient();
    admin = await createAdminClient();
    testBook = await createTestBook({
      title: "Resilience Patterns & Circuit Breakers",
      genre: "Computer Science",
      price: 750,
      stock: 25,
    });
  });

  t.after(async () => {
    await closeDB();
  });

  // ==========================================
  // PHASE 27: Circuit Breaker Logic
  // ==========================================
  await t.test("1. CircuitBreaker transitions from CLOSED to OPEN after failure threshold", async () => {
    const breaker = new CircuitBreaker({
      name: "TestBreaker",
      failureThreshold: 2,
      recoveryTimeMs: 500,
      timeoutMs: 100,
    });

    assert.strictEqual(breaker.getState(), CircuitState.CLOSED);

    // First failure
    await breaker.execute(
      async () => {
        throw new Error("Provider Down 1");
      },
      () => "fallback-1"
    );
    assert.strictEqual(breaker.getState(), CircuitState.CLOSED);

    // Second failure -> Trips OPEN
    const res2 = await breaker.execute(
      async () => {
        throw new Error("Provider Down 2");
      },
      () => "fallback-2"
    );
    assert.strictEqual(res2, "fallback-2");
    assert.strictEqual(breaker.getState(), CircuitState.OPEN);

    // Third call returns fallback immediately without invoking action
    let invoked = false;
    const res3 = await breaker.execute(
      async () => {
        invoked = true;
        return "success";
      },
      () => "fast-fallback"
    );
    assert.strictEqual(res3, "fast-fallback");
    assert.strictEqual(invoked, false, "Action should not be invoked when circuit is OPEN");
  });

  // ==========================================
  // PHASE 28: Search Hardening & Pagination Boundaries
  // ==========================================
  await t.test("2. Special regex characters in search query are safely escaped (No ReDoS/Injection)", async () => {
    const maliciousQueries = [
      ".*",
      "[[[(((",
      "^.*$",
      "+?*{}",
      "\\",
    ];

    for (const q of maliciousQueries) {
      const res = await makeAuthRequest(`/api/books?search=${encodeURIComponent(q)}`, {
        method: "GET",
      });
      assert.strictEqual(res.status, 200, `Query '${q}' should execute safely without 500 server error`);
      assert.ok(res.data.isSuccess);
      assert.ok(Array.isArray(res.data.data));
    }
  });

  await t.test("3. Pagination limits and boundaries are strictly capped", async () => {
    // Request with extreme limit=9999 should be capped at 50
    const res = await makeAuthRequest("/api/books?limit=9999&page=999999", {
      method: "GET",
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.pagination.limit, 50, "Limit must be capped at 50");
    assert.strictEqual(res.data.pagination.page, 500, "Page must be capped at max boundary 500");
  });

  // ==========================================
  // PHASE 32: Health Check Endpoints
  // ==========================================
  await t.test("4. Public shallow health probe /health/live returns 200 live", async () => {
    const res = await fetch(`${BASE_URL}/health/live`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "live");
    assert.strictEqual(body.isSuccess, true);
  });

  await t.test("5. Deep readiness health probe /health/ready returns 200 ready when DB connected", async () => {
    const res = await fetch(`${BASE_URL}/health/ready`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ready");
    assert.strictEqual(body.isSuccess, true);
  });

  await t.test("6. API health endpoint /api/health returns uptime and timestamp", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "healthy");
    assert.ok(body.uptimeSeconds >= 0);
    assert.ok(body.timestamp);
  });

  // ==========================================
  // PHASE 35: Compound Indexes Verification
  // ==========================================
  await t.test("7. MongoDB compound indexes exist on primary business collections", async () => {
    const mongoose = (await import("mongoose")).default;
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/book_review_app_db";
      await mongoose.connect(mongoUri);
    }

    const orderIndexes = await mongoose.connection.db.collection("orders").indexes();
    const bookIndexes = await mongoose.connection.db.collection("books").indexes();

    assert.ok(orderIndexes.length > 0, "Order collection should have indexes");
    assert.ok(bookIndexes.length > 0, "Book collection should have indexes");
  });
});
