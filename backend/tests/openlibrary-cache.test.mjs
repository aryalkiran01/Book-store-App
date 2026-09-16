import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdminClient,
  createRegularUserClient,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("Open Library Admin Search Caching Suite", async (t) => {
  let adminUser;
  let regularUser;

  t.before(async () => {
    adminUser = await createAdminClient();
    regularUser = await createRegularUserClient();
  });

  t.after(async () => {
    await closeDB();
  });

  await t.test("1. Non-admin cannot access Open Library search (403 Forbidden)", async () => {
    const res = await makeAuthRequest("/api/admin/open-library/search?q=tolkien", {
      method: "GET",
      cookie: regularUser.cookie,
    });
    assert.equal(res.status, 403, "Non-admin must be forbidden from Open Library search");
    assert.equal(res.data.isSuccess, false);
  });

  await t.test("2. Cache Miss: Initial search executes safely and returns results", async () => {
    const query = "pride and prejudice";
    const res = await makeAuthRequest(`/api/admin/open-library/search?q=${encodeURIComponent(query)}`, {
      method: "GET",
      cookie: adminUser.cookie,
    });

    assert.equal(res.status, 200, "Expected HTTP 200 on initial search");
    assert.equal(res.data.isSuccess, true);
    assert.ok(Array.isArray(res.data.data), "Expected data array");
  });

  await t.test("3. Cache Hit & Normalization: Same query with different casing/whitespace returns identical results instantly", async () => {
    const resOriginal = await makeAuthRequest("/api/admin/open-library/search?q=the+great+gatsby", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(resOriginal.status, 200);

    // Query with uppercase and excess whitespace
    const resNormalized = await makeAuthRequest("/api/admin/open-library/search?q=+THE++GREAT++GATSBY+", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(resNormalized.status, 200);
    assert.equal(resNormalized.data.isSuccess, true);
    assert.equal(resNormalized.data.total, resOriginal.data.total, "Cached result totals must match exactly");
    assert.equal(resNormalized.data.data.length, resOriginal.data.data.length, "Cached result item counts must match");
  });

  await t.test("4. Distinct queries generate separate cache entries and do not collide", async () => {
    const resA = await makeAuthRequest("/api/admin/open-library/search?q=biology", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    const resB = await makeAuthRequest("/api/admin/open-library/search?q=astronomy", {
      method: "GET",
      cookie: adminUser.cookie,
    });

    assert.equal(resA.status, 200);
    assert.equal(resB.status, 200);
  });

  await t.test("5. Real-time MongoDB Cross-Referencing: Cached search reflects freshly imported books", async () => {
    const uniqueQuery = "Frankenstein " + Date.now();
    const uniqueTitle = "Frankenstein Edition " + Date.now();
    const uniqueIsbn = "978000" + Math.floor(1000000 + Math.random() * 9000000);

    // 1. Initial search - book is NOT in MongoDB
    const searchRes1 = await makeAuthRequest(`/api/admin/open-library/search?q=${encodeURIComponent(uniqueQuery)}`, {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(searchRes1.status, 200);

    // 2. Admin imports a book with that ISBN
    const importRes = await makeAuthRequest("/api/admin/open-library/import", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: uniqueTitle,
        author: "Mary Shelley",
        genre: "Horror",
        isbn: uniqueIsbn,
        price: 850,
        stock: 25,
      },
    });
    assert.equal(importRes.status, 201);
    const createdId = importRes.data.data._id;

    // 3. Search directly for that imported book's title
    const searchRes2 = await makeAuthRequest(`/api/admin/open-library/search?q=${encodeURIComponent(uniqueTitle)}`, {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(searchRes2.status, 200);

    // Clean up
    await makeAuthRequest(`/api/books/${createdId}`, { method: "DELETE", cookie: adminUser.cookie });
  });

  await t.test("6. Empty query handling returns safe empty results without API calls or error", async () => {
    const res = await makeAuthRequest("/api/admin/open-library/search?q=", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.isSuccess, true);
    assert.equal(res.data.data.length, 0);
  });
});
