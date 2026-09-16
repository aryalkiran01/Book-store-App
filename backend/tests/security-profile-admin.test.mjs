import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  loginUser,
  registerUser,
  closeDB,
} from "./test_helpers.mjs";

test("PHASE 21-25: Admin Audit Trail, Invoices, Tax Engine & Profile Security", async (t) => {
  let user;
  let admin;
  let testBook;

  t.before(async () => {
    user = await createRegularUserClient();
    admin = await createAdminClient();
    testBook = await createTestBook({
      title: "Clean Architecture for Node",
      price: 600,
      stock: 30,
    });
  });

  t.after(async () => {
    await closeDB();
  });

  // ==========================================
  // PHASE 21: Admin Audit Trail
  // ==========================================
  await t.test("1. Admin can fetch audit logs with pagination", async () => {
    const res = await makeAuthRequest("/api/admin/audit-logs?limit=5", {
      method: "GET",
      cookie: admin.cookie,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.pagination);
  });

  await t.test("2. Non-admin cannot fetch audit logs (fail-closed)", async () => {
    const res = await makeAuthRequest("/api/admin/audit-logs", {
      method: "GET",
      cookie: user.cookie,
    });
    assert.strictEqual(res.status, 403);
  });

  await t.test("3. Admin action records an audit log entry", async () => {
    // Quick update stock
    const updateRes = await makeAuthRequest(`/api/admin/inventory/${testBook._id}/stock`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: { stock: testBook.stock + 5 },
    });
    assert.strictEqual(updateRes.status, 200);

    // Fetch audit logs and verify entry
    const auditRes = await makeAuthRequest("/api/admin/audit-logs?action=UPDATE_STOCK&limit=5", {
      method: "GET",
      cookie: admin.cookie,
    });
    assert.strictEqual(auditRes.status, 200);
    assert.strictEqual(auditRes.data.isSuccess, true);
    const logged = auditRes.data.data.find((l) => l.targetId === String(testBook._id));
    assert.ok(logged, "Audit log should contain the UPDATE_STOCK action for the book");
  });

  // ==========================================
  // PHASE 23 & 24: Invoices & Configurable Tax Engine
  // ==========================================
  let orderId;

  await t.test("4. Places an order to generate an invoice", async () => {
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        items: [{ bookId: testBook._id.toString(), quantity: 2, price: testBook.price }],
        shippingAddress: {
          fullName: "Invoice Test User",
          email: "invoice_test@example.com",
          phone: "9800000000",
          street: "123 Bagmati Marg",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
        paymentMethod: "cod",
      },
    });

    assert.strictEqual(orderRes.status, 201);
    orderId = orderRes.data.data._id || orderRes.data.data.id;
    assert.ok(orderId, "Order ID should be created");
  });

  await t.test("5. Retrieves structured JSON invoice with 13% VAT tax breakdown", async () => {
    const res = await makeAuthRequest(`/api/orders/${orderId}/invoice`, {
      method: "GET",
      cookie: user.cookie,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.ok(res.data.data.invoiceNumber.startsWith("INV-"));
    assert.strictEqual(res.data.data.orderId, orderId);
    assert.ok(res.data.data.tax);
    assert.strictEqual(res.data.data.tax.taxRatePercentage, 13);
    assert.strictEqual(res.data.data.tax.currency, "NPR");
    assert.ok(res.data.data.items.length > 0);
  });

  await t.test("6. Retrieves print-ready styled HTML invoice", async () => {
    const res = await makeAuthRequest(`/api/orders/${orderId}/invoice/html`, {
      method: "GET",
      cookie: user.cookie,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get("content-type").includes("text/html"));
  });

  await t.test("7. Prevents unauthorized users from accessing another user's invoice", async () => {
    const otherUser = await createRegularUserClient();
    const res = await makeAuthRequest(`/api/orders/${orderId}/invoice`, {
      method: "GET",
      cookie: otherUser.cookie,
    });
    assert.strictEqual(res.status, 403);
  });

  await t.test("8. Admin can access any user's invoice", async () => {
    const res = await makeAuthRequest(`/api/orders/${orderId}/invoice`, {
      method: "GET",
      cookie: admin.cookie,
    });
    assert.strictEqual(res.status, 200);
  });

  // ==========================================
  // PHASE 25: Account Profile & Security Settings
  // ==========================================
  let freshUserClient;
  const testUsername = `user_${Date.now()}`;
  const testEmail = `${testUsername}@example.com`;
  const testPassword = "Password123!";

  await t.test("9. Registers and logs in a fresh user for profile testing", async () => {
    const regRes = await registerUser({
      username: testUsername,
      email: testEmail,
      password: testPassword,
    });
    assert.strictEqual(regRes.status, 201);

    const loginRes = await loginUser({ email: testEmail, password: testPassword });
    assert.strictEqual(loginRes.status, 200);
    freshUserClient = { cookie: loginRes.setCookie };
  });

  await t.test("10. Updates user profile (phone, address, avatar)", async () => {
    const res = await makeAuthRequest("/api/auth/profile", {
      method: "PUT",
      cookie: freshUserClient.cookie,
      body: {
        phone: "9841000000",
        address: "Kathmandu, New Baneshwor",
        avatar: "https://example.com/avatar.jpg",
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.strictEqual(res.data.data.phone, "9841000000");
    assert.strictEqual(res.data.data.address, "Kathmandu, New Baneshwor");
  });

  await t.test("11. Initiates email change request and verifies new email", async () => {
    const newEmail = `updated_${Date.now()}@example.com`;
    const res = await makeAuthRequest("/api/auth/change-email", {
      method: "POST",
      cookie: freshUserClient.cookie,
      body: { newEmail },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.ok(res.data.verificationToken, "Token should be returned in test mode");

    // Verify email change
    const verifyRes = await makeAuthRequest("/api/auth/verify-new-email", {
      method: "POST",
      cookie: freshUserClient.cookie,
      body: { token: res.data.verificationToken },
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.isSuccess, true);
    assert.strictEqual(verifyRes.data.data.email, newEmail);
    assert.strictEqual(verifyRes.data.data.isEmailVerified, true);
    // Update cookie from verification response
    if (verifyRes.data?.token) {
      freshUserClient.cookie = `token=${verifyRes.data.token}`;
    } else if (verifyRes.setCookie) {
      freshUserClient.cookie = verifyRes.setCookie;
    }
  });

  await t.test("12. Global logout invalidates existing session tokens", async () => {
    const oldCookie = freshUserClient.cookie;
    const logoutRes = await makeAuthRequest("/api/auth/logout-all", {
      method: "POST",
      cookie: oldCookie,
    });
    assert.strictEqual(logoutRes.status, 200);

    // Now attempting to use oldCookie should be rejected with 401
    const meRes = await makeAuthRequest("/api/auth/me", {
      method: "GET",
      cookie: oldCookie,
    });
    assert.strictEqual(meRes.status, 401, "Session must be invalidated after global logout");
  });

  await t.test("13. Deletes account securely with soft-deletion and immediate session kill", async () => {
    const delUser = `del_${Date.now()}`;
    const delEmail = `${delUser}@example.com`;
    const delPass = "DeleteMe123!";

    await registerUser({ username: delUser, email: delEmail, password: delPass });
    const loginRes = await loginUser({ email: delEmail, password: delPass });
    const delCookie = loginRes.setCookie;

    // Delete account
    const delRes = await makeAuthRequest("/api/auth/account", {
      method: "DELETE",
      cookie: delCookie,
      body: { password: delPass },
    });
    assert.strictEqual(delRes.status, 200);

    // Attempting to use delCookie must fail
    const meRes = await makeAuthRequest("/api/auth/me", {
      method: "GET",
      cookie: delCookie,
    });
    assert.strictEqual(meRes.status, 401);

    // Attempting to re-login must fail
    const reLogin = await loginUser({ email: delEmail, password: delPass });
    assert.strictEqual(reLogin.status, 401);
  });
});
