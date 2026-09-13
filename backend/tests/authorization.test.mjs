import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  registerUser,
  loginUser,
  makeAuthRequest,
  createTestBook,
  closeDB,
} from "./test_helpers.mjs";

test("Authorization & Access Control Suite", async (t) => {
  let user1;
  let user2;
  let adminUser;
  let testBook;

  t.before(async () => {
    user1 = await createRegularUserClient();
    user2 = await createRegularUserClient();
    adminUser = await createAdminClient();
    testBook = await createTestBook({ price: 450, stock: 15 });
  });

  t.after(async () => {
    await closeDB();
  });

  await t.test("1. Self-registration with role='admin' is prevented (Role Escalation Protection)", async () => {
    const ts = Date.now() + Math.random().toString(36).substring(2, 6);
    const regRes = await registerUser({
      username: `Hacker_${ts}`,
      email: `hacker_${ts}@example.com`,
      password: "HackerPassword123!",
      role: "admin",
    });

    assert.equal(regRes.status, 201);
    const loginRes = await loginUser({
      email: `hacker_${ts}@example.com`,
      password: "HackerPassword123!",
    });

    const meRes = await makeAuthRequest("/api/auth/me", { cookie: loginRes.setCookie });
    assert.equal(meRes.data.data?.role, "user", "Role must default to 'user' despite client input");
  });

  await t.test("2. Normal user is forbidden (403) from accessing admin endpoints", async () => {
    const endpoints = [
      { url: "/api/admin/stats", method: "GET" },
      { url: "/api/admin/users", method: "GET" },
      { url: "/api/admin/orders", method: "GET" },
    ];

    for (const ep of endpoints) {
      const res = await makeAuthRequest(ep.url, {
        method: ep.method,
        cookie: user1.cookie,
      });
      assert.equal(
        res.status,
        403,
        `Expected 403 Forbidden for normal user on ${ep.url}, got ${res.status}`
      );
      assert.equal(res.data.isSuccess, false);
    }
  });

  await t.test("3. Admin user is granted access (200) to admin endpoints", async () => {
    const res = await makeAuthRequest("/api/admin/stats", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(res.status, 200, "Admin must receive 200 OK on admin stats");
    assert.equal(res.data.isSuccess, true);
  });

  await t.test("4. Normal user cannot view another user's order (403 Forbidden)", async () => {
    // User1 creates an order
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "User One",
          email: user1.email,
          phone: "+977 9811111111",
        },
        shippingAddress: {
          street: "123 Street",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });
    assert.equal(orderRes.status, 201, "Order creation should succeed");
    const orderId = orderRes.data.data.orderId || orderRes.data.data._id;

    // User2 attempts to fetch User1's order
    const breachRes = await makeAuthRequest(`/api/orders/${orderId}`, {
      method: "GET",
      cookie: user2.cookie,
    });
    assert.equal(
      breachRes.status,
      403,
      `Expected 403 Forbidden when user2 accesses user1 order, got ${breachRes.status}`
    );
  });

  await t.test("5. Normal user cannot update or delete another user's review (403 Forbidden)", async () => {
    // User1 creates a review
    const reviewRes = await makeAuthRequest(`/api/reviews/${testBook._id}`, {
      method: "POST",
      cookie: user1.cookie,
      body: {
        rating: 5,
        reviewText: "User 1 authentic review of this wonderful book.",
        title: "Loved it!",
      },
    });
    assert.ok(reviewRes.status === 200 || reviewRes.status === 201);
    const reviewId = reviewRes.data.data._id;

    // User2 attempts to edit User1's review
    const editRes = await makeAuthRequest(`/api/reviews/${reviewId}`, {
      method: "PUT",
      cookie: user2.cookie,
      body: {
        rating: 1,
        reviewText: "Tampered review content by malicious user.",
      },
    });
    assert.equal(
      editRes.status,
      403,
      `Expected 403 Forbidden when user2 edits user1 review, got ${editRes.status}`
    );

    // User2 attempts to delete User1's review
    const deleteRes = await makeAuthRequest(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      cookie: user2.cookie,
    });
    assert.equal(
      deleteRes.status,
      403,
      `Expected 403 Forbidden when user2 deletes user1 review, got ${deleteRes.status}`
    );
  });
});
