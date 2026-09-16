import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("Orders & Inventory Integrity Suite", async (t) => {
  let user;
  let testBook;

  t.before(async () => {
    user = await createRegularUserClient();
    testBook = await createTestBook({ price: 600, stock: 10, discountPercentage: 10 });
  });

  t.after(async () => {
    await closeDB();
  });

  await t.test("1. Valid order creation calculates authoritative totals and decrements stock", async () => {
    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 2 }],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "Valid Customer",
          email: user.email,
          phone: "+977 9841234567",
        },
        shippingAddress: {
          street: "101 Thamel Marg",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });

    assert.equal(res.status, 201, "Order creation should return 201");
    assert.equal(res.data.isSuccess, true);
    // 600 - 10% = 540; 2 * 540 = 1080 (subtotal >= 1000 => free shipping)
    assert.equal(res.data.data.subtotal, 1080);
    assert.equal(res.data.data.shippingCost, 0);
    assert.equal(res.data.data.totalAmount, 1080);
  });

  await t.test("2. Client price and total manipulation attempts are strictly ignored", async () => {
    const maliciousPayload = {
      books: [
        {
          bookId: testBook._id.toString(),
          quantity: 1,
          price: 1, // Fake price manipulation attempt
          subtotal: 1,
        },
      ],
      subtotal: 1, // Fake manipulated subtotal
      shippingCost: 0,
      totalAmount: 1, // Fake manipulated total
      discount: 500,
      paymentMethod: "cod",
      customerInfo: {
        fullName: "Hacker User",
        email: user.email,
        phone: "+977 9841234567",
      },
      shippingAddress: {
        street: "101 Street",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
      },
    };

    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: maliciousPayload,
    });

    assert.equal(res.status, 201);
    // 1 book * 540 = 540; shipping = 100; total = 640
    assert.equal(res.data.data.books[0].price, 540, "Price must be calculated from database");
    assert.equal(res.data.data.subtotal, 540);
    assert.equal(res.data.data.shippingCost, 100);
    assert.equal(res.data.data.totalAmount, 640, "Total must not accept client 1 NPR attempt");
  });

  await t.test("3. Order with quantity <= 0 is rejected with 400 Bad Request", async () => {
    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 0 }],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "Valid Customer",
          email: user.email,
          phone: "+977 9841234567",
        },
        shippingAddress: {
          street: "101 Street",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });

    assert.equal(res.status, 400, "Quantity 0 must be rejected");
    assert.equal(res.data.isSuccess, false);
  });

  await t.test("4. Order exceeding available stock is rejected with 400 Bad Request", async () => {
    const limitedBook = await createTestBook({ stock: 2, price: 300 });
    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: limitedBook._id.toString(), quantity: 100 }],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "Valid Customer",
          email: user.email,
          phone: "+977 9841234567",
        },
        shippingAddress: {
          street: "101 Street",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });

    assert.equal(res.status, 400, "Excess quantity must be rejected");
    assert.equal(res.data.isSuccess, false);
  });

  await t.test("5. Multi-item order with out-of-stock item triggers atomic rollback", async () => {
    const inStockBook = await createTestBook({ stock: 5, price: 200 });
    const outOfStockBook = await createTestBook({ stock: 0, price: 200 });

    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [
          { bookId: inStockBook._id.toString(), quantity: 1 },
          { bookId: outOfStockBook._id.toString(), quantity: 1 },
        ],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "Valid Customer",
          email: user.email,
          phone: "+977 9841234567",
        },
        shippingAddress: {
          street: "101 Street",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });

    assert.equal(res.status, 400, "Must fail whole order when one item is out of stock");

    // Check that inStockBook stock was NOT decremented
    const mongoose = (await import("mongoose")).default;
    const BookModel = mongoose.models.Book || mongoose.model("Book");
    const freshBook = await BookModel.findById(inStockBook._id).lean();
    assert.equal(freshBook.stock, 5, "Stock must remain 5 after compensating rollback");
  });

  await t.test("6. High concurrency purchase race conditions are prevented", async () => {
    const flashBook = await createTestBook({ stock: 3, price: 150 });

    // Spawn 10 simultaneous purchase requests
    const promises = Array.from({ length: 10 }).map(() =>
      makeAuthRequest("/api/orders", {
        method: "POST",
        cookie: user.cookie,
        body: {
          books: [{ bookId: flashBook._id.toString(), quantity: 1 }],
          paymentMethod: "cod",
          customerInfo: {
            fullName: "Race Buyer",
            email: user.email,
            phone: "+977 9841234567",
          },
          shippingAddress: {
            street: "101 Street",
            city: "Kathmandu",
            state: "Bagmati",
            postalCode: "44600",
          },
        },
      })
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 201);
    const failures = results.filter((r) => r.status === 400);

    assert.equal(successes.length, 3, "Exactly 3 orders should succeed");
    assert.equal(failures.length, 7, "Exactly 7 orders should fail");

    const mongoose = (await import("mongoose")).default;
    const BookModel = mongoose.models.Book || mongoose.model("Book");
    const finalBook = await BookModel.findById(flashBook._id).lean();
    assert.equal(finalBook.stock, 0, "Final stock must be exactly 0, never negative");
  });

  await t.test("7. Client-supplied paymentStatus, orderStatus, and paymentId are strictly ignored upon creation", async () => {
    const res = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "khalti",
        paymentStatus: "completed", // Malicious spoof
        status: "confirmed", // Malicious spoof
        orderStatus: "confirmed", // Malicious spoof
        paymentId: "fake_prepaid_shortcut_token_999",
        customerInfo: { fullName: "Hacker", email: user.email },
        shippingAddress: { street: "101 Street", city: "Kathmandu" },
      },
    });

    assert.equal(res.status, 201, "Order creation should succeed");
    const order = res.data.data;
    assert.equal(order.paymentStatus, "pending", "Payment status must ALWAYS be 'pending' upon creation");
    assert.equal(order.status, "pending", "Order status must ALWAYS be 'pending' upon creation");
    assert.equal(order.paymentId, "", "paymentId must be empty string upon creation");
  });

  await t.test("8. Cannot initiate or verify payment on a cancelled order", async () => {
    // 1. Create pending order
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "khalti",
        customerInfo: { fullName: "Canceller", email: user.email },
        shippingAddress: { street: "Cancel Street", city: "Kathmandu" },
      },
    });
    const orderId = orderRes.data.data.orderId || orderRes.data.data._id;

    // 2. Cancel the order
    const cancelRes = await makeAuthRequest(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      cookie: user.cookie,
      body: { reason: "Changed my mind" },
    });
    assert.equal(cancelRes.status, 200);

    // 3. Attempt to initiate Khalti payment on cancelled order
    const initRes = await makeAuthRequest("/api/payments/initiate", {
      method: "POST",
      cookie: user.cookie,
      body: {
        purchase_order_id: orderId,
        purchase_order_name: "Cancelled Order Payment Attempt",
        amount: 54000,
        return_url: "http://localhost:5173/payment/callback",
        website_url: "http://localhost:5173",
      },
    });
    assert.equal(initRes.status, 400, "Initiating payment on cancelled order must fail with 400 Bad Request");
    assert.match(initRes.data.message, /cancelled/i);

    // 4. Attempt to verify payment on cancelled order
    const verifyRes = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user.cookie,
      body: {
        orderId,
        pidx: `mock_pidx_${Date.now()}_cancelled_test`,
      },
    });
    assert.equal(verifyRes.status, 400, "Verifying payment on cancelled order must fail with 400 Bad Request");
    assert.match(verifyRes.data.message, /cancelled/i);
  });

  await t.test("9. Concurrent purchase for final available copy (stock=1): exactly one succeeds", async () => {
    const user2 = await createRegularUserClient();
    const scarceBook = await createTestBook({ stock: 1, price: 500 });

    // Both users fire concurrent purchase requests for quantity 1
    const [resA, resB] = await Promise.all([
      makeAuthRequest("/api/orders", {
        method: "POST",
        cookie: user.cookie,
        body: {
          books: [{ bookId: scarceBook._id.toString(), quantity: 1 }],
          paymentMethod: "cod",
          customerInfo: { fullName: "User A", email: user.email },
          shippingAddress: { street: "Street A", city: "Kathmandu" },
        },
      }),
      makeAuthRequest("/api/orders", {
        method: "POST",
        cookie: user2.cookie,
        body: {
          books: [{ bookId: scarceBook._id.toString(), quantity: 1 }],
          paymentMethod: "cod",
          customerInfo: { fullName: "User B", email: user2.email },
          shippingAddress: { street: "Street B", city: "Kathmandu" },
        },
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(
      statuses,
      [201, 400],
      "Exactly one request must succeed (201) and one must fail (400) on final copy"
    );

    const mongoose = (await import("mongoose")).default;
    const BookModel = mongoose.models.Book || mongoose.model("Book");
    const freshBook = await BookModel.findById(scarceBook._id).lean();
    assert.equal(freshBook.stock, 0, "Final stock must be exactly 0");
  });

  await t.test("10. Payment verification and duplicate callback do NOT double-deduct inventory", async () => {
    const singleBook = await createTestBook({ stock: 10, price: 500 });

    // 1. Create order (stock is 10, reservedStock becomes 1)
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: singleBook._id.toString(), quantity: 1 }],
        paymentMethod: "khalti",
        customerInfo: { fullName: "Stock Tester", email: user.email },
        shippingAddress: { street: "123 Street", city: "Kathmandu" },
      },
    });
    assert.equal(orderRes.status, 201);
    const orderId = orderRes.data.data.orderId || orderRes.data.data._id;

    const mongoose = (await import("mongoose")).default;
    const BookModel = mongoose.models.Book || mongoose.model("Book");
    let checkBook = await BookModel.findById(singleBook._id).lean();
    assert.equal(checkBook.reservedStock, 1, "Reserved stock must be 1 after online checkout");

    // 2. Verify payment (first callback commits stock: stock becomes 9, reservedStock becomes 0)
    const mockPidx = `mock_pidx_${Date.now()}_stock_test`;
    const verify1 = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user.cookie,
      body: { orderId, pidx: mockPidx },
    });
    assert.equal(verify1.status, 200);

    checkBook = await BookModel.findById(singleBook._id).lean();
    assert.equal(checkBook.stock, 9, "Stock must be 9 after payment verification");
    assert.equal(checkBook.reservedStock, 0, "Reserved stock must be 0 after commitment");

    // 3. Duplicate callback / verification replay
    const verify2 = await makeAuthRequest("/api/payments/verify", {
      method: "POST",
      cookie: user.cookie,
      body: { orderId, pidx: mockPidx },
    });
    assert.equal(verify2.status, 200);
    assert.equal(verify2.data.data.alreadyVerified, true);

    checkBook = await BookModel.findById(singleBook._id).lean();
    assert.equal(checkBook.stock, 9, "Stock must remain 9 after duplicate verification");
  });
});
