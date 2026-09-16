import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_URL,
  createAdminClient,
  createRegularUserClient,
  createTestBook,
  makeAuthRequest,
} from "./test_helpers.mjs";

test("PHASES 39 & 41: End-to-End E-Commerce Purchasing Lifecycle Suite", async (t) => {
  const admin = await createAdminClient();
  const customer = await createRegularUserClient();

  let testBook;
  let testOrderId;

  // 1. Admin creates book
  await t.test("1. Admin creates a catalog book for lifecycle testing", async () => {
    testBook = await createTestBook({ price: 600, stock: 25 });
    assert.ok(testBook._id);
  });

  // 2. Customer adds book to server cart
  await t.test("2. Customer adds book to server cart and checks totals", async () => {
    const res = await makeAuthRequest("/api/cart/items", {
      method: "POST",
      cookie: customer.cookie,
      body: {
        bookId: testBook._id.toString(),
        quantity: 2,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.subtotal, 1200); // 600 * 2 = 1200
    assert.strictEqual(res.data.data.shipping, 0); // Free shipping >= 1000
  });

  // 3. Customer checks out order
  await t.test("3. Customer checks out cart and creates order", async () => {
    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: customer.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 2 }],
        shippingAddress: {
          fullName: "E2E Customer",
          street: "123 Test St",
          city: "Kathmandu",
          province: "Bagmati",
          postalCode: "44600",
        },
        paymentMethod: "khalti",
      },
    });
    assert.strictEqual(res.status, 201);
    testOrderId = res.data.data._id || res.data.data.orderId;
    assert.ok(testOrderId);
    assert.strictEqual(res.data.data.subtotal, 1200);
  });

  // 4. Customer verifies payment via simulated development gateway
  await t.test("4. Customer simulates payment verification", async () => {
    const res = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: customer.cookie,
      body: {
        orderId: testOrderId,
        pidx: `mock_pidx_${Date.now()}_e2e`,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.order.paymentStatus, "completed");
    assert.strictEqual(res.data.data.order.status, "confirmed");
  });

  // 5. Customer fetches invoice
  await t.test("5. Customer retrieves generated invoice", async () => {
    const res = await makeAuthRequest(`/api/orders/${testOrderId}/invoice`, {
      cookie: customer.cookie,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.invoiceNumber.startsWith("INV-"));
  });

  // 6. Admin advances order status through valid lifecycle
  await t.test("6. Admin transitions order from confirmed to processing", async () => {
    const res = await makeAuthRequest(`/api/orders/${testOrderId}/status`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: {
        status: "processing",
        note: "Packaged for shipping",
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, "processing");
  });
});
