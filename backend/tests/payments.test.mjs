import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  createRegularUserClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

function generateEsewaSignature(totalAmount, transactionUuid, productCode, secretKey) {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

test("Payments & Transaction Security Suite (eSewa & Khalti)", async (t) => {
  let user1;
  let user2;
  let testBook;
  let testOrder;
  const esewaSecretKey = "8gBm/:&EnhH.1/q";
  const esewaProductCode = "EPAYTEST";

  t.before(async () => {
    user1 = await createRegularUserClient();
    user2 = await createRegularUserClient();
    testBook = await createTestBook({ price: 700, stock: 20 });

    // Create a pending order for user1 (700 subtotal + 100 shipping = 800 NPR)
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

  // -------------------------------------------------------------
  // 1. ORDER CREATION & CLIENT-SUPPLIED PAYMENT ID INTEGRITY
  // -------------------------------------------------------------

  await t.test("1. Fake client-supplied paymentId does NOT mark order as paid", async () => {
    assert.equal(testOrder.paymentStatus, "pending", "Payment status must remain pending");
    assert.equal(testOrder.status, "pending", "Order status must remain pending");
  });

  // -------------------------------------------------------------
  // 2. FAKE PIDX / INVALID PROVIDER LOOKUP (FAIL CLOSED)
  // -------------------------------------------------------------

  await t.test("2. Provider verification failure & fake pidx fails closed (400 Bad Request, paymentStatus 'failed')", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    const verifyRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        orderId,
        pidx: "invalid_nonexistent_pidx_xyz",
      },
    });

    assert.ok(
      verifyRes.status === 400 || verifyRes.status === 502,
      `Expected error status, got ${verifyRes.status}`
    );
    assert.equal(verifyRes.data.isSuccess, false);

    // Verify order status in DB: MUST fail closed
    const orderCheck = await makeAuthRequest(`/api/orders/${orderId}`, {
      cookie: user1.cookie,
    });
    assert.equal(orderCheck.data.data.paymentStatus, "failed", "Payment status must be marked 'failed'");
    assert.notEqual(orderCheck.data.data.status, "confirmed", "Order must NOT be marked confirmed on failed verification");
  });

  // -------------------------------------------------------------
  // 3. PAYMENT OWNERSHIP ENFORCEMENT
  // -------------------------------------------------------------

  await t.test("3. Khalti: Unauthorized user cannot initiate or verify payment for another user's order (403 Forbidden)", async () => {
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

  // -------------------------------------------------------------
  // 4. DEMO / MOCK SHORTCUT IN PRODUCTION (FAIL CLOSED RULE)
  // -------------------------------------------------------------

  await t.test("4. Demo shortcut in production is strictly forbidden and fails closed", async () => {
    // Create fresh pending order for user1
    const prodBook = await createTestBook({ price: 700, stock: 20 });
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: prodBook._id.toString(), quantity: 1 }],
        paymentMethod: "khalti",
        customerInfo: { fullName: "Prod Tester", email: user1.email },
        shippingAddress: { street: "123 Street", city: "Kathmandu" },
      },
    });
    const prodOrderId = orderRes.data.data.orderId || orderRes.data.data._id;

    // Temporarily set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const mockVerifyRes = await makeAuthRequest("/api/payments/verify", {
        method: "POST",
        cookie: user1.cookie,
        headers: {
          "x-test-simulate-production": "true",
        },
        body: {
          orderId: prodOrderId,
          pidx: "mock_pidx_production_attack_test",
        },
      });

      assert.equal(mockVerifyRes.status, 400, "Mock pidx in production must be rejected with 400 Bad Request");
      assert.equal(mockVerifyRes.data.isSuccess, false);

      const orderCheck = await makeAuthRequest(`/api/orders/${prodOrderId}`, {
        cookie: user1.cookie,
      });
      assert.equal(orderCheck.data.data.paymentStatus, "failed", "Order paymentStatus must be 'failed'");
      assert.notEqual(orderCheck.data.data.status, "confirmed", "Order must NOT be confirmed in production on mock shortcut");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // -------------------------------------------------------------
  // 5. DEMO SHORTCUT IN DEVELOPMENT
  // -------------------------------------------------------------

  await t.test("5. Demo shortcut in development successfully verifies and confirms order", async () => {
    // Create fresh pending order for user1
    const devBook = await createTestBook({ price: 700, stock: 20 });
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: devBook._id.toString(), quantity: 1 }],
        paymentMethod: "khalti",
        customerInfo: { fullName: "Dev Tester", email: user1.email },
        shippingAddress: { street: "123 Street", city: "Kathmandu" },
      },
    });
    const devOrderId = orderRes.data.data.orderId || orderRes.data.data._id;

    // In dev environment
    const mockPidx = `mock_pidx_${Date.now()}_test`;
    const devVerifyRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        orderId: devOrderId,
        pidx: mockPidx,
      },
    });

    assert.equal(devVerifyRes.status, 200, "Mock pidx in development succeeds with 200");
    assert.equal(devVerifyRes.data.isSuccess, true);
    assert.equal(devVerifyRes.data.data.order.paymentStatus, "completed");
    assert.equal(devVerifyRes.data.data.order.status, "confirmed");

    // -------------------------------------------------------------
    // 6. DUPLICATE VERIFICATION (IDEMPOTENCY) FOR KHALTI
    // -------------------------------------------------------------
    const dupRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        orderId: devOrderId,
        pidx: mockPidx,
      },
    });
    assert.equal(dupRes.status, 200, "Duplicate verification must return 200 OK");
    assert.equal(dupRes.data.data.alreadyVerified, true, "Must return alreadyVerified: true on replay");
  });

  // -------------------------------------------------------------
  // 7. ESEWA INITIATION & SIGNATURE GENERATION
  // -------------------------------------------------------------

  await t.test("7. eSewa: Initiation generates authoritative HMAC-SHA256 signature and form parameters", async () => {
    const esewaOrderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "esewa",
        customerInfo: { fullName: "eSewa User", email: user1.email },
        shippingAddress: { street: "456 Avenue", city: "Kathmandu" },
      },
    });
    const esewaOrderId = esewaOrderRes.data.data.orderId || esewaOrderRes.data.data._id;

    const initRes = await makeAuthRequest("/api/payments/esewa/initiate", {
      method: "POST",
      cookie: user1.cookie,
      body: { orderId: esewaOrderId },
    });

    assert.equal(initRes.status, 201, "Expected 201 on eSewa initiation");
    assert.equal(initRes.data.isSuccess, true);
    assert.ok(initRes.data.data.formData, "Form data must be present");
    assert.equal(initRes.data.data.formData.total_amount, "800");
    assert.equal(initRes.data.data.formData.product_code, esewaProductCode);

    // Verify HMAC signature calculation
    const expectedSig = generateEsewaSignature(800, esewaOrderId, esewaProductCode, esewaSecretKey);
    assert.equal(initRes.data.data.formData.signature, expectedSig, "eSewa HMAC signature must match");
  });

  // -------------------------------------------------------------
  // 8. ESEWA FAKE TRANSACTION / TAMPERED SIGNATURE (FAIL CLOSED)
  // -------------------------------------------------------------

  await t.test("8. eSewa: Fake transaction or tampered amount fails closed with 400 Bad Request", async () => {
    const fakeOrderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "esewa",
        customerInfo: { fullName: "Fake Tx Tester", email: user1.email },
        shippingAddress: { street: "Tamper Lane", city: "Kathmandu" },
      },
    });
    const fakeOrderId = fakeOrderRes.data.data.orderId || fakeOrderRes.data.data._id;

    // Tampered amount (1 NPR instead of 800)
    const tamperedPayload = {
      transaction_code: "ESEWA_TXN_FAKE",
      status: "COMPLETE",
      total_amount: "1",
      transaction_uuid: fakeOrderId,
      product_code: esewaProductCode,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: "invalid_tampered_signature==",
    };
    const encodedData = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64");

    const verifyRes = await makeAuthRequest("/api/payments/esewa/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: { data: encodedData },
    });

    assert.equal(verifyRes.status, 400, "Tampered eSewa verification must be rejected with 400");
    assert.equal(verifyRes.data.isSuccess, false);

    // Verify order in database was marked failed, not completed
    const orderCheck = await makeAuthRequest(`/api/orders/${fakeOrderId}`, {
      cookie: user1.cookie,
    });
    assert.equal(orderCheck.data.data.paymentStatus, "failed");
    assert.notEqual(orderCheck.data.data.status, "confirmed");
  });

  // -------------------------------------------------------------
  // 9. ESEWA OWNERSHIP VERIFICATION
  // -------------------------------------------------------------

  await t.test("9. eSewa: Unauthorized user cannot verify another user's eSewa payment (403 Forbidden)", async () => {
    const freshBook = await createTestBook({ price: 700, stock: 20 });
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: freshBook._id.toString(), quantity: 1 }],
        paymentMethod: "esewa",
        customerInfo: { fullName: "User1 Owner", email: user1.email },
        shippingAddress: { street: "User1 Street", city: "Kathmandu" },
      },
    });
    const targetOrderId = orderRes.data.data.orderId || orderRes.data.data._id;
    const validSignature = generateEsewaSignature(800, targetOrderId, esewaProductCode, esewaSecretKey);

    const validPayload = {
      transaction_code: `ESEWA_TXN_${Date.now()}`,
      status: "COMPLETE",
      total_amount: "800",
      transaction_uuid: targetOrderId,
      product_code: esewaProductCode,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: validSignature,
    };
    const encodedData = Buffer.from(JSON.stringify(validPayload)).toString("base64");

    // User2 attempts to verify user1's order
    const verifyRes = await makeAuthRequest("/api/payments/esewa/verify", {
      method: "POST",
      cookie: user2.cookie,
      body: { data: encodedData },
    });

    assert.equal(verifyRes.status, 403, "User2 must receive 403 Forbidden on user1's eSewa payment");
  });

  // -------------------------------------------------------------
  // 10. ESEWA SUCCESSFUL PAYMENT & DUPLICATE VERIFICATION
  // -------------------------------------------------------------

  await t.test("10. eSewa: Successful genuine verification marks order completed and confirmed with idempotency", async () => {
    const freshBook = await createTestBook({ price: 700, stock: 20 });
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: freshBook._id.toString(), quantity: 1 }],
        paymentMethod: "esewa",
        customerInfo: { fullName: "Genuine Buyer", email: user1.email },
        shippingAddress: { street: "Genuine Street", city: "Kathmandu" },
      },
    });
    const orderId = orderRes.data.data.orderId || orderRes.data.data._id;
    const txnCode = `ESEWA_TXN_${Date.now()}`;
    const validSignature = generateEsewaSignature(800, orderId, esewaProductCode, esewaSecretKey);

    const validPayload = {
      transaction_code: txnCode,
      status: "COMPLETE",
      total_amount: "800",
      transaction_uuid: orderId,
      product_code: esewaProductCode,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: validSignature,
    };
    const encodedData = Buffer.from(JSON.stringify(validPayload)).toString("base64");

    // User1 verifies their valid payment
    const verifyRes = await makeAuthRequest("/api/payments/esewa/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: { data: encodedData },
    });

    assert.equal(verifyRes.status, 200, "Valid eSewa verification should return 200");
    assert.equal(verifyRes.data.isSuccess, true);

    // Verify order in database
    const orderCheck = await makeAuthRequest(`/api/orders/${orderId}`, {
      cookie: user1.cookie,
    });
    assert.equal(orderCheck.data.data.paymentStatus, "completed");
    assert.equal(orderCheck.data.data.paymentMethod, "esewa");
    assert.equal(orderCheck.data.data.status, "confirmed");

    // Duplicate replay check (Idempotency)
    const dupRes = await makeAuthRequest("/api/payments/esewa/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: { data: encodedData },
    });
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.data.data.alreadyVerified, true, "Duplicate eSewa verification must be idempotent");
  });
});

