import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_URL,
  createAdminClient,
  createRegularUserClient,
  createTestBook,
  makeAuthRequest,
} from "./test_helpers.mjs";

test("PHASES 46–55: Support Tickets, Recommendations, Request IDs & Observability", async (t) => {
  const admin = await createAdminClient();
  const customer = await createRegularUserClient();

  let testBook1;
  let testBook2;
  let supportTicketId;

  // 1. Recommendations API
  await t.test("1. Recommendations API returns related books by genre or author", async () => {
    testBook1 = await createTestBook({ title: "Rec Source Book", genre: "Philosophy", price: 500 });
    testBook2 = await createTestBook({ title: "Rec Target Book", genre: "Philosophy", price: 600 });

    const res = await fetch(`${BASE_URL}/api/books/${testBook1._id}/recommendations`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.isSuccess, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  // 2. Request ID Tracking
  await t.test("2. X-Request-Id header is generated and propagated on HTTP responses", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const requestId = res.headers.get("x-request-id");
    assert.ok(requestId, "Response should have X-Request-Id header");
    assert.ok(requestId.length > 10);
  });

  // 3. Customer submits support ticket
  await t.test("3. Customer can submit a support ticket", async () => {
    const res = await makeAuthRequest("/api/support", {
      method: "POST",
      cookie: customer.cookie,
      body: {
        name: "Test Customer",
        email: customer.email,
        subject: "Order Delivery Inquiry",
        message: "When will my order arrive? I placed it yesterday.",
        priority: "medium",
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.isSuccess, true);
    supportTicketId = res.data.data._id;
    assert.ok(supportTicketId);
    assert.strictEqual(res.data.data.status, "open");
  });

  // 4. Admin inspects support tickets
  await t.test("4. Admin can list support tickets", async () => {
    const res = await makeAuthRequest("/api/support/admin", {
      cookie: admin.cookie,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.ok(Array.isArray(res.data.data));
    const found = res.data.data.find((t) => t._id.toString() === supportTicketId.toString());
    assert.ok(found, "Newly created support ticket should appear in admin list");
  });

  // 5. Admin updates support ticket status
  await t.test("5. Admin can update support ticket status and admin notes", async () => {
    const res = await makeAuthRequest(`/api/support/admin/${supportTicketId}/status`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: {
        status: "resolved",
        adminNotes: "Tracking number provided to customer.",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.strictEqual(res.data.data.status, "resolved");
    assert.strictEqual(res.data.data.adminNotes, "Tracking number provided to customer.");
  });

  // 6. Non-admin cannot access admin support tickets
  await t.test("6. Non-admin cannot access admin support dashboard (403 Forbidden)", async () => {
    const res = await makeAuthRequest("/api/support/admin", {
      cookie: customer.cookie,
    });

    assert.strictEqual(res.status, 403);
  });
});
