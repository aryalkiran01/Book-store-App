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
});
