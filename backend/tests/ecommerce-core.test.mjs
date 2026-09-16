import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("E-commerce Core Suite (Cart, Wishlist, Addresses, Coupons, Reviews)", async (t) => {
  let user;
  let admin;
  let testBook;

  t.before(async () => {
    user = await createRegularUserClient();
    admin = await createAdminClient();
    testBook = await createTestBook({
      price: 500,
      stock: 50,
    });
  });

  t.after(async () => {
    await closeDB();
  });

  // 1. Cart Operations
  await t.test("1. User can add item to cart and fetch authoritative subtotal and shipping", async () => {
    const addRes = await makeAuthRequest("/api/cart/items", {
      method: "POST",
      cookie: user.cookie,
      body: { bookId: testBook._id.toString(), quantity: 2 },
    });
    assert.strictEqual(addRes.status, 200);
    assert.strictEqual(addRes.data.data.totalQuantity, 2);
    assert.strictEqual(addRes.data.data.subtotal, 1000);
    assert.strictEqual(addRes.data.data.shipping, 0); // Free shipping at NPR 1000
    assert.strictEqual(addRes.data.data.grandTotal, 1000);
  });

  await t.test("2. User can update quantity in cart and clear cart", async () => {
    const updateRes = await makeAuthRequest(`/api/cart/items/${testBook._id}`, {
      method: "PUT",
      cookie: user.cookie,
      body: { quantity: 1 },
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.data.totalQuantity, 1);
    assert.strictEqual(updateRes.data.data.subtotal, 500);
    assert.strictEqual(updateRes.data.data.shipping, 100); // Standard shipping under NPR 1000
    assert.strictEqual(updateRes.data.data.grandTotal, 600);

    const clearRes = await makeAuthRequest("/api/cart", {
      method: "DELETE",
      cookie: user.cookie,
    });
    assert.strictEqual(clearRes.status, 200);
    assert.strictEqual(clearRes.data.data.totalQuantity, 0);
  });

  // 2. Wishlist Operations
  await t.test("3. User can toggle book in wishlist", async () => {
    const toggleRes = await makeAuthRequest(`/api/wishlist/toggle/${testBook._id}`, {
      method: "POST",
      cookie: user.cookie,
    });
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.data.data.isAdded, true);

    const getRes = await makeAuthRequest("/api/wishlist", {
      method: "GET",
      cookie: user.cookie,
    });
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.data.totalItems, 1);
  });

  // 3. Address Management
  await t.test("4. User can create saved address and set default", async () => {
    const addrRes = await makeAuthRequest("/api/addresses", {
      method: "POST",
      cookie: user.cookie,
      body: {
        fullName: "Kiran Aryal",
        phone: "9800000000",
        street: "Putalisadak 12",
        city: "Kathmandu",
        province: "Bagmati Province",
      },
    });
    assert.strictEqual(addrRes.status, 201);
    assert.strictEqual(addrRes.data.data.isDefault, true);

    const listRes = await makeAuthRequest("/api/addresses", {
      method: "GET",
      cookie: user.cookie,
    });
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.data.data.length, 1);
  });

  // 4. Coupon & Promotion Engine
  const testCouponCode = "SAVE20_" + Date.now();

  await t.test("5. Admin can create coupon and user can validate it", async () => {
    const couponRes = await makeAuthRequest("/api/coupons", {
      method: "POST",
      cookie: admin.cookie,
      body: {
        code: testCouponCode,
        description: "20% Discount",
        discountType: "percentage",
        discountValue: 20,
        minOrderAmount: 400,
      },
    });
    assert.strictEqual(couponRes.status, 201);

    const validateRes = await makeAuthRequest("/api/coupons/validate", {
      method: "POST",
      cookie: user.cookie,
      body: {
        code: testCouponCode,
        subtotal: 1000,
      },
    });
    assert.strictEqual(validateRes.status, 200);
    assert.strictEqual(validateRes.data.data.discountAmount, 200);
    assert.strictEqual(validateRes.data.data.discountedSubtotal, 800);
  });

  await t.test("6. Order checkout with coupon deducts coupon discount authoritatively", async () => {
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 2 }], // 2 * 500 = 1000 subtotal (free shipping)
        couponCode: testCouponCode, // 20% = 200 discount -> 1000 - 200 = 800
        paymentMethod: "cod",
      },
    });
    assert.strictEqual(orderRes.status, 201);
    assert.strictEqual(orderRes.data.data.subtotal, 1000);
    assert.strictEqual(orderRes.data.data.couponCode, testCouponCode);
    assert.strictEqual(orderRes.data.data.couponDiscount, 200);
    assert.strictEqual(orderRes.data.data.totalAmount, 800);
  });

  // 5. Review Reporting & Admin Reports Dashboard
  await t.test("7. User can report a review and admin can inspect report dashboard", async () => {
    // Create review
    const reviewRes = await makeAuthRequest(`/api/reviews/${testBook._id}`, {
      method: "POST",
      cookie: user.cookie,
      body: {
        rating: 5,
        reviewText: "Great e-commerce book review test!",
      },
    });
    assert.strictEqual(reviewRes.status, 201);
    const reviewId = reviewRes.data.data._id;

    // Report review
    const reportRes = await makeAuthRequest(`/api/reviews/${reviewId}/report`, {
      method: "POST",
      cookie: user.cookie,
      body: {
        reason: "Suspected spam review",
      },
    });
    assert.strictEqual(reportRes.status, 200);

    // Admin views reports
    const adminReportsRes = await makeAuthRequest("/api/reviews/admin/reports", {
      method: "GET",
      cookie: admin.cookie,
    });
    assert.strictEqual(adminReportsRes.status, 200);
    assert.ok(adminReportsRes.data.data.length >= 1);
  });
});
