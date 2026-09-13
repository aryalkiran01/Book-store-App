import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("Admin Capabilities & Operations Suite", async (t) => {
  let user;
  let adminUser;
  let testBook;
  let createdBookId;
  let testOrder;

  t.before(async () => {
    user = await createRegularUserClient();
    adminUser = await createAdminClient();
    testBook = await createTestBook({ price: 350, stock: 8 });

    // User creates an order
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "Order Admin Customer",
          email: user.email,
          phone: "+977 9812345678",
        },
        shippingAddress: {
          street: "888 Admin Way",
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

  await t.test("1. Admin can access platform analytics & KPI statistics", async () => {
    const res = await makeAuthRequest("/api/admin/stats", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.isSuccess, true);
    assert.ok(res.data.data.metrics, "Metrics must be present");
  });

  await t.test("2. Admin can create a new book in the catalog", async () => {
    const ts = Date.now();
    const res = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: `Admin Created Masterpiece ${ts}`,
        author: "Acclaimed Author",
        description: "An exceptional new arrival created via admin suite.",
        genre: "Non-Fiction",
        price: 850,
        stock: 25,
        discountPercentage: 5,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
      },
    });

    assert.equal(res.status, 201, "Expected 201 on book creation");
    assert.equal(res.data.isSuccess, true);
    assert.ok(res.data.data._id);
    createdBookId = res.data.data._id;
  });

  await t.test("3. Non-admin cannot create a new book in the catalog (403 Forbidden)", async () => {
    const res = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: user.cookie,
      body: {
        title: "Unauthorized Book Creation",
        author: "Nobody",
        description: "Should fail.",
        genre: "Fiction",
        price: 100,
        stock: 1,
      },
    });

    assert.equal(res.status, 403, "Non-admin must be forbidden from creating books");
  });

  await t.test("4. Admin can update book details and inventory stock", async () => {
    const res = await makeAuthRequest(`/api/books/${createdBookId}`, {
      method: "PUT",
      cookie: adminUser.cookie,
      body: {
        price: 900,
        stock: 30,
        discountPercentage: 10,
      },
    });

    assert.equal(res.status, 200, "Expected 200 on book update");
    assert.equal(res.data.isSuccess, true);
    assert.equal(res.data.data.price, 900);
    assert.equal(res.data.data.stock, 30);
  });

  await t.test("5. Admin can list all orders across users", async () => {
    const res = await makeAuthRequest("/api/admin/orders", {
      method: "GET",
      cookie: adminUser.cookie,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.isSuccess, true);
    assert.ok(Array.isArray(res.data.data.orders || res.data.data));
  });

  await t.test("6. Admin can update order status following valid lifecycle (pending -> confirmed -> processing)", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    
    // Step 1: Confirm order
    const confirmRes = await makeAuthRequest(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      cookie: adminUser.cookie,
      body: {
        status: "confirmed",
        note: "Order confirmed by sales team",
      },
    });

    assert.equal(confirmRes.status, 200, "Admin should successfully confirm order");
    assert.equal(confirmRes.data.isSuccess, true);
    assert.equal(confirmRes.data.data.status, "confirmed");

    // Step 2: Processing order
    const processRes = await makeAuthRequest(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      cookie: adminUser.cookie,
      body: {
        status: "processing",
        note: "Order packaged by warehouse staff",
      },
    });

    assert.equal(processRes.status, 200, "Admin should successfully transition to processing");
    assert.equal(processRes.data.isSuccess, true);
    assert.equal(processRes.data.data.status, "processing");
  });

  await t.test("7. Admin can delete a book from the catalog", async () => {
    const res = await makeAuthRequest(`/api/books/${createdBookId}`, {
      method: "DELETE",
      cookie: adminUser.cookie,
    });

    assert.equal(res.status, 200, "Expected 200 on book deletion");
    assert.equal(res.data.isSuccess, true);

    // Verify book is no longer in catalog
    const fetchRes = await makeAuthRequest(`/api/books/${createdBookId}`);
    assert.equal(fetchRes.status, 404, "Deleted book should return 404");
  });
});
