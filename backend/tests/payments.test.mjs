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
  // KHALTI TESTS
  // -------------------------------------------------------------

  await t.test("1. Fake client-supplied paymentId does NOT mark order as paid", async () => {
    assert.equal(testOrder.paymentStatus, "pending", "Payment status must remain pending");
    assert.equal(testOrder.status, "pending", "Order status must remain pending");
  });

  await t.test("2. Khalti verification fails closed on invalid/fake pidx without marking order completed", async () => {
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
  // ESEWA TESTS
  // -------------------------------------------------------------

  await t.test("4. eSewa: Initiation generates authoritative HMAC-SHA256 signature and form parameters", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    const initRes = await makeAuthRequest("/api/payments/esewa/initiate", {
      method: "POST",
      cookie: user1.cookie,
      body: { orderId },
    });

    assert.equal(initRes.status, 201, "Expected 201 on eSewa initiation");
    assert.equal(initRes.data.isSuccess, true);
    assert.ok(initRes.data.data.formData, "Form data must be present");
    assert.equal(initRes.data.data.formData.total_amount, "800");
    assert.equal(initRes.data.data.formData.product_code, esewaProductCode);

    // Verify HMAC signature calculation
    const expectedSig = generateEsewaSignature(800, orderId, esewaProductCode, esewaSecretKey);
    assert.equal(initRes.data.data.formData.signature, expectedSig, "eSewa HMAC signature must match");
  });

  await t.test("5. eSewa: Verification fails closed on tampered signature or tampered amount", async () => {
    const orderId = testOrder.orderId || testOrder._id;

    // Tampered amount (1 NPR instead of 800)
    const tamperedPayload = {
      transaction_code: "ESEWA_TXN_FAKE",
      status: "COMPLETE",
      total_amount: "1",
      transaction_uuid: orderId,
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

    // Verify order in database was not marked completed
    const orderCheck = await makeAuthRequest(`/api/orders/${orderId}`, {
      cookie: user1.cookie,
    });
    assert.notEqual(orderCheck.data.data.paymentStatus, "completed");
  });

  await t.test("6. eSewa: Unauthorized user cannot verify another user's eSewa payment (403 Forbidden)", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    const validSignature = generateEsewaSignature(800, orderId, esewaProductCode, esewaSecretKey);

    const validPayload = {
      transaction_code: `ESEWA_TXN_${Date.now()}`,
      status: "COMPLETE",
      total_amount: "800",
      transaction_uuid: orderId,
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

  await t.test("7. eSewa: Successful verification marks order completed and confirmed with idempotency", async () => {
    const orderId = testOrder.orderId || testOrder._id;
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

  await t.test("8. eSewa: Official response format with response signed_field_names is verified successfully", async () => {
    // Create another pending order for user1 with fresh book
    const freshBook = await createTestBook({ price: 700, stock: 20 });
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user1.cookie,
      body: {
        books: [{ bookId: freshBook._id.toString(), quantity: 1 }],
        paymentMethod: "esewa",
        customerInfo: {
          fullName: "Payment Tester 2",
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
    const newOrder = orderRes.data.data;
    const newOrderId = newOrder.orderId || newOrder._id;

    const txnCode = `ESEWA_TXN_${Date.now()}`;
    const signedFieldNames = "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
    const msg = `transaction_code=${txnCode},status=COMPLETE,total_amount=800,transaction_uuid=${newOrderId},product_code=${esewaProductCode},signed_field_names=${signedFieldNames}`;
    const sig = crypto.createHmac("sha256", esewaSecretKey).update(msg).digest("base64");

    const payload = {
      transaction_code: txnCode,
      status: "COMPLETE",
      total_amount: "800",
      transaction_uuid: newOrderId,
      product_code: esewaProductCode,
      signed_field_names: signedFieldNames,
      signature: sig,
    };
    const encodedData = Buffer.from(JSON.stringify(payload)).toString("base64");

    const verifyRes = await makeAuthRequest("/api/payments/esewa/verify", {
      method: "POST",
      cookie: user1.cookie,
      body: { data: encodedData },
    });

    assert.equal(verifyRes.status, 200, "Official response signature format must return 200");
    assert.equal(verifyRes.data.isSuccess, true);
    assert.equal(verifyRes.data.data.order.paymentStatus, "completed");
  });
});

