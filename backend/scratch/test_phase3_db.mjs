// Phase 3 Database & Backend Calculations Verification Suite
const BACKEND_URL = "http://localhost:4000";

async function runTests() {
  console.log("=== PHASE 3 DATABASE + BACKEND CORRECTION VERIFICATION ===");
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  try {
    // 1. Setup Admin & User tokens
    console.log("\n--- 1. Authenticating test users ---");
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookstore.com", password: "admin123" }),
    });
    const adminToken = (await loginRes.json()).data?.accessToken;
    assert(!!adminToken, "Admin logged in successfully");

    const readerEmail = `buyer_${Date.now()}@example.com`;
    const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `buyer_${Date.now()}`.substring(0, 15),
        email: readerEmail,
        password: "Password123!",
      }),
    });
    const buyerLoginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: readerEmail, password: "Password123!" }),
    });
    const buyerData = (await buyerLoginRes.json()).data;
    const buyerToken = buyerData?.accessToken;
    const buyerId = buyerData?.user?.id;
    assert(!!buyerToken, "Buyer registered and logged in");

    // 2. Test Paginated & Filtered Book Queries
    console.log("\n--- 2. Paginated Book Queries & Filters ---");
    const booksPage1Res = await fetch(`${BACKEND_URL}/api/books?page=1&limit=3&sortBy=price-asc`);
    const booksPage1 = await booksPage1Res.json();
    assert(booksPage1Res.status === 200, "Paginated books fetched (status 200)");
    assert(booksPage1.data.length <= 3, `Limit 3 respected (got ${booksPage1.data.length} books)`);
    assert(!!booksPage1.pagination, "Pagination metadata included in response");
    assert(booksPage1.pagination.page === 1, "Page number matches requested page");

    // Test sort by price-asc
    if (booksPage1.data.length >= 2) {
      assert(
        booksPage1.data[0].price <= booksPage1.data[1].price,
        `Sorted by price-asc verified (${booksPage1.data[0].price} <= ${booksPage1.data[1].price})`
      );
    }

    // 3. Test Authoritative Price & Order Total Calculation
    console.log("\n--- 3. Authoritative Order Calculations ---");
    const allBooksRes = await fetch(`${BACKEND_URL}/api/books?limit=10`);
    const allBooks = (await allBooksRes.json()).data;
    const testBook = allBooks[0];
    const originalStock = testBook.stock || 25;
    const expectedUnitPrice = testBook.discountPercentage
      ? Number((testBook.price * (1 - testBook.discountPercentage / 100)).toFixed(2))
      : testBook.price;
    const orderQty = 2;
    const expectedTotal = Number((expectedUnitPrice * orderQty).toFixed(2));

    // Client maliciously attempts to send price: $1, totalAmount: $1
    const orderRes = await fetch(`${BACKEND_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        userId: buyerId,
        books: [
          {
            bookId: testBook._id,
            quantity: orderQty,
            price: 1.0, // Fake price injected by client
          },
        ],
        totalAmount: 1.0, // Fake total injected by client
      }),
    });
    const orderData = await orderRes.json();
    assert(orderRes.status === 201, "Order placed successfully (status 201)");
    assert(
      orderData.data?.totalAmount === expectedTotal,
      `Authoritative total amount enforced: expected ${expectedTotal}, got ${orderData.data?.totalAmount}`
    );
    const createdOrderId = orderData.data?.orderId || orderData.data?._id;

    // 4. Test Stock Reduction
    console.log("\n--- 4. Inventory Stock Verification ---");
    const bookAfterOrderRes = await fetch(`${BACKEND_URL}/api/books/${testBook._id}`);
    const bookAfterOrder = (await bookAfterOrderRes.json()).data.result || (await bookAfterOrderRes.json()).data;
    assert(
      bookAfterOrder.stock === originalStock - orderQty,
      `Inventory stock reduced correctly from ${originalStock} to ${bookAfterOrder.stock}`
    );

    // 5. Test Negative Stock / Insufficient Stock Prevention
    console.log("\n--- 5. Negative Stock / Excess Quantity Prevention ---");
    const excessOrderRes = await fetch(`${BACKEND_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        userId: buyerId,
        books: [
          {
            bookId: testBook._id,
            quantity: 999999, // Way more than stock
          },
        ],
      }),
    });
    assert(
      excessOrderRes.status === 400,
      `Excessive order rejected with HTTP 400 (got ${excessOrderRes.status})`
    );

    // 6. Test Stock Restoral on Order Cancellation
    console.log("\n--- 6. Stock Restoral on Order Cancellation ---");
    const cancelRes = await fetch(`${BACKEND_URL}/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
    assert(cancelRes.status === 200, "Order cancelled by admin");

    const bookAfterCancelRes = await fetch(`${BACKEND_URL}/api/books/${testBook._id}`);
    const bookAfterCancel = (await bookAfterCancelRes.json()).data.result;
    assert(
      bookAfterCancel.stock === originalStock,
      `Stock restored back to original ${originalStock} after cancellation (current: ${bookAfterCancel.stock})`
    );

    // 7. Test Review Rating Aggregation
    console.log("\n--- 7. Automated Rating Aggregation on Books ---");
    const reviewRes = await fetch(`${BACKEND_URL}/api/reviews/addReview/${testBook._id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        rating: 4,
        reviewText: "Great book for building strong financial principles!",
      }),
    });
    assert(reviewRes.status === 201, "Review added successfully");

    const bookWithRatingRes = await fetch(`${BACKEND_URL}/api/books/${testBook._id}`);
    const bookWithRating = (await bookWithRatingRes.json()).data.result;
    assert(
      bookWithRating.totalReviews >= 1,
      `totalReviews updated dynamically (got ${bookWithRating.totalReviews})`
    );
    assert(
      bookWithRating.averageRating > 0,
      `averageRating updated dynamically (got ${bookWithRating.averageRating})`
    );

    console.log(`\n======================================================`);
    console.log(`PHASE 3 RESULTS: ${passed} / ${total} tests passed.`);
    console.log(`======================================================`);
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

runTests();
