import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("Payments & Transaction Security Suite", async (t) => {
  let user1;
  let user2;
  let testBook;
  let testOrder;

  t.before(async () => {
    user1 = await createRegularUserClient();
    user2 = await createRegularUserClient();
    testBook = await createTestBook({ price: 700, stock: 20 });

    // Create a pending order for user1
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "khalti",
        paymentId: "fake_tx_123456", // Test that fake paymentId does NOT bypass verification
        customerInfo: {
          fullName: "Payment Tester",
          email: user1.email,
          phone: "+977 9811223344",
        },
        shippingAddress: {
          street: "777 Durbar Marg",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });

    assert.equal(orderRes.status, 201);
    testOrder = orderRes.data.data;
  });

  t.after(async () => {
    await closeDB();
  });

  await t.test("1. Fake client-supplied paymentId does NOT mark order as paid", async () => {
    assert.equal(testOrder.paymentStatus, "pending", "Payment status must remain pending");
    assert.equal(testOrder.status, "pending", "Order status must remain pending");
  });

  await t.test("2. Payment verification fails closed on invalid/fake pidx without marking order completed", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    const verifyRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        orderId,
        pidx: "invalid_nonexistent_pidx_xyz",
      },
    });

    assert.ok(verifyRes.status === 400 || verifyRes.status === 502, `Expected error status, got ${verifyRes.status}`);
    assert.equal(verifyRes.data.isSuccess, false);

    // Verify order status in DB
    const orderCheck = await makeAuthRequest(`/api/orders/${orderId}`, {
      cookie: user1.cookie,
    });
    assert.notEqual(orderCheck.data.data.paymentStatus, "completed", "Must NOT be marked completed on failed pidx");
  });

  await t.test("3. Unauthorized user cannot initiate or verify payment for another user's order (403 Forbidden)", async () => {
    const orderId = testOrder.orderId || testOrder._id;

    // User2 tries to initiate payment on user1's order
    const initRes = await makeAuthRequest("/api/payments/initiate", {
      method: "POST",
      cookie: user2.cookie,
      body: {
        purchase_order_id: orderId,
        purchase_order_name: "Test Payment Order",
        amount: 80000,
        return_url: "http://localhost:5173/payment/callback",
        website_url: "http://localhost:5173",
      },
    });
    assert.equal(initRes.status, 403, "Expected 403 when user2 initiates payment for user1");

    // User2 tries to verify payment on user1's order
    const verifyRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user2.cookie,
      body: {
        orderId,
        pidx: "mock_pidx_12345",
      },
    });
    assert.equal(verifyRes.status, 403, "Expected 403 when user2 verifies payment for user1");
  });

  await t.test("4. Successful mock payment verification transitions order to completed/confirmed idempotently", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    const mockPidx = `mock_pidx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Verify mock payment in test environment
    const verifyRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        orderId,
        pidx: mockPidx,
      },
    });

    assert.equal(verifyRes.status, 200, "Mock verification in development/test should succeed with 200");
    assert.equal(verifyRes.data.isSuccess, true);

    // Verify order in database
    const orderCheck = await makeAuthRequest(`/api/orders/${orderId}`, {
      cookie: user1.cookie,
    });
    assert.equal(orderCheck.data.data.paymentStatus, "completed");
    assert.equal(orderCheck.data.data.status, "confirmed");

    // Test Idempotency: duplicate verify call
    const dupRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        orderId,
        pidx: mockPidx,
      },
    });
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.data.data.alreadyVerified, true, "Duplicate payment verification must be idempotent");
  });
});
