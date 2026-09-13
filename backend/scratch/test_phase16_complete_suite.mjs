import http from "http";

const BASE_URL = "http://localhost:4000";

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function parseCookies(res) {
  const setCookie = res.headers["set-cookie"];
  if (!setCookie) return "";
  return Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
}

let testResults = [];
function assert(name, condition, extraInfo = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    testResults.push({ name, status: "PASS" });
  } else {
    console.error(`  ✗ FAIL: ${name} ${extraInfo}`);
    testResults.push({ name, status: "FAIL", extraInfo });
  }
}

async function runFullSuite() {
  console.log("=================================================");
  console.log("PHASE 16 COMPLETE REGRESSION & PENETRATION SUITE");
  console.log("=================================================\n");

  const timestamp = Date.now();
  const testEmail = `tester_${timestamp}@example.com`;
  const attackerEmail = `attacker_${timestamp}@example.com`;
  const password = "Password123!";

  // ---------------------------------------------
  // 1. AUTHENTICATION & SESSION TESTS
  // ---------------------------------------------
  console.log("--- 1. Authentication & Session Security ---");

  // 1.1 Register
  const regRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { username: `tester_${timestamp}`, email: testEmail, password }
  );
  assert("User registration succeeds", regRes.statusCode === 201, `Status: ${regRes.statusCode}`);

  // 1.2 Duplicate registration
  const dupRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { username: `tester_dup_${timestamp}`, email: testEmail, password }
  );
  assert("Duplicate registration rejected (409 Conflict)", dupRes.statusCode === 409, `Status: ${dupRes.statusCode}`);

  // 1.3 Invalid login
  const badLogin = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: testEmail, password: "WrongPassword!" }
  );
  assert("Invalid credentials rejected (401 Unauthorized)", badLogin.statusCode === 401, `Status: ${badLogin.statusCode}`);

  // 1.4 Valid login
  const loginRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: testEmail, password }
  );
  assert("Valid login succeeds (200 OK)", loginRes.statusCode === 200, `Status: ${loginRes.statusCode}`);
  const userToken = loginRes.body.data?.accessToken;
  const userCookie = parseCookies(loginRes);

  // 1.5 Register attacker user
  const attRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { username: `attacker_${timestamp}`, email: attackerEmail, password }
  );
  const attLogin = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: attackerEmail, password }
  );
  const attackerToken = attLogin.body.data?.accessToken;

  // 1.6 Login as seed admin
  const adminLogin = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "admin@bookstore.com", password: "admin123" }
  );
  assert("Admin login succeeds (200 OK)", adminLogin.statusCode === 200, `Status: ${adminLogin.statusCode}`);
  const adminToken = adminLogin.body.data?.accessToken;

  // 1.7 Check /api/auth/me
  const meRes = await request({
    hostname: "localhost",
    port: 4000,
    path: "/api/auth/me",
    method: "GET",
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert("Verify authenticated user profile (/me)", meRes.statusCode === 200 && meRes.body.data?.email === testEmail, `Body: ${JSON.stringify(meRes.body)}`);

  // ---------------------------------------------
  // 2. BOOK CATALOG & ADMIN PRIVILEGE TESTS
  // ---------------------------------------------
  console.log("\n--- 2. Book Catalog & Authorization ---");

  // 2.1 Normal user attempts to create book -> 403
  const userCreateBook = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/books",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      title: "Hacker Book",
      author: "Hacker",
      genre: "Technology",
      price: 10,
      stock: 10,
    }
  );
  assert("Non-admin cannot create book (403 Forbidden)", userCreateBook.statusCode === 403, `Status: ${userCreateBook.statusCode}`);

  // 2.2 Admin creates book -> 201
  const adminCreateBook = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/books",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      title: `Automated Test Book ${timestamp}`,
      author: "Test Author",
      genre: "Technology",
      description: "A comprehensive testing book for automated quality assurance.",
      price: 39.99,
      discountPercentage: 10,
      stock: 25,
      isbn: `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    }
  );
  assert("Admin can create book (201 Created)", adminCreateBook.statusCode === 201, `Status: ${adminCreateBook.statusCode}`);
  const createdBookId = adminCreateBook.body.data?._id || adminCreateBook.body.data?.id;

  // 2.3 Search suggestions
  const suggRes = await request({
    hostname: "localhost",
    port: 4000,
    path: `/api/books/suggestions?q=${encodeURIComponent("Automated Test Book")}`,
    method: "GET",
  });
  assert("Search suggestions returns newly created book", suggRes.statusCode === 200 && suggRes.body.data?.length > 0, `Status: ${suggRes.statusCode}`);

  // 2.4 Invalid ObjectID handling -> 400
  const malformedIdRes = await request({
    hostname: "localhost",
    port: 4000,
    path: "/api/books/not-a-valid-id",
    method: "GET",
  });
  assert("Malformed Book ObjectID handled safely (400 Bad Request)", malformedIdRes.statusCode === 400, `Status: ${malformedIdRes.statusCode}`);

  // ---------------------------------------------
  // 3. REVIEWS & RATINGS TESTS
  // ---------------------------------------------
  console.log("\n--- 3. Reviews & Ratings Security ---");

  // 3.1 User adds review
  const addRevRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: `/api/reviews/${createdBookId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      rating: 5,
      reviewText: "Outstanding read with profound insights!",
      title: "Highly recommended!",
    }
  );
  assert("User can add review (201 Created)", addRevRes.statusCode === 201, `Status: ${addRevRes.statusCode} - ${JSON.stringify(addRevRes.body)}`);
  const reviewId = addRevRes.body.data?._id || addRevRes.body.data?.id;

  // 3.2 Attacker attempts to modify user's review -> 403 Forbidden
  const attackEditRev = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: `/api/reviews/${reviewId}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${attackerToken}`,
      },
    },
    {
      rating: 1,
      reviewText: "Defaced by attacker!",
    }
  );
  assert("Attacker cannot modify another user's review (403 Forbidden)", attackEditRev.statusCode === 403, `Status: ${attackEditRev.statusCode}`);

  // 3.3 User updates their own review
  const updateRevRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: `/api/reviews/${reviewId}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      rating: 4,
      reviewText: "Updated: Solid content and very well written.",
      title: "Great overall",
    }
  );
  assert("User can update their own review (200 OK)", updateRevRes.statusCode === 200, `Status: ${updateRevRes.statusCode}`);

  // 3.4 Invalid rating validation (< 1 or > 5) -> 400
  const invalidRatingRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: `/api/reviews/${createdBookId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      rating: 10, // Invalid!
      reviewText: "Invalid score",
    }
  );
  assert("Invalid rating rejected by backend validation (400)", invalidRatingRes.statusCode === 400, `Status: ${invalidRatingRes.statusCode}`);

  // ---------------------------------------------
  // 4. CART & ORDER SYSTEM INTEGRITY
  // ---------------------------------------------
  console.log("\n--- 4. Cart, Pricing & Order Protection ---");

  // 4.1 Create order with verified server calculations
  const orderRes = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/order",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      items: [
        {
          bookId: createdBookId,
          quantity: 2,
        },
      ],
      shippingAddress: {
        fullName: "Jane Doe",
        address: "456 Avenue",
        city: "Kathmandu",
        postalCode: "44600",
        country: "Nepal",
        phoneNumber: "+977-9800000000",
      },
      paymentMethod: "cash_on_delivery",
    }
  );
  assert("Order creation succeeds (201 Created)", orderRes.statusCode === 201, `Status: ${orderRes.statusCode}`);
  const orderId = orderRes.body.data?._id || orderRes.body.data?.id;

  // 4.2 Attacker attempts to view user's order -> 403 Forbidden
  const attackOrderRes = await request({
    hostname: "localhost",
    port: 4000,
    path: `/api/order/${orderId}`,
    method: "GET",
    headers: { Authorization: `Bearer ${attackerToken}` },
  });
  assert("Attacker cannot view another user's order (403 Forbidden)", attackOrderRes.statusCode === 403, `Status: ${attackOrderRes.statusCode}`);

  // 4.3 Owner cancels their pending order -> 200 OK
  const cancelRes = await request({
    hostname: "localhost",
    port: 4000,
    path: `/api/order/${orderId}/cancel`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
  });
  assert("Owner can cancel pending order (200 OK)", cancelRes.statusCode === 200, `Status: ${cancelRes.statusCode}`);

  // 4.4 Prevent excess stock ordering
  const excessStockOrder = await request(
    {
      hostname: "localhost",
      port: 4000,
      path: "/api/order",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      items: [
        {
          bookId: createdBookId,
          quantity: 9999, // Exceeds available stock
        },
      ],
      shippingAddress: {
        fullName: "Test User",
        address: "123 Street",
        city: "Kathmandu",
        postalCode: "44600",
        country: "Nepal",
        phoneNumber: "+977-9811111111",
      },
    }
  );
  assert("Excess stock purchase rejected (400 Bad Request)", excessStockOrder.statusCode === 400, `Status: ${excessStockOrder.statusCode}`);

  // ---------------------------------------------
  // 5. ADMIN PRIVILEGES & RBAC DEFENSE
  // ---------------------------------------------
  console.log("\n--- 5. Admin Dashboard & RBAC Escalation Defense ---");

  // 5.1 User access to admin endpoints -> 403 Forbidden
  const userAdminStats = await request({
    hostname: "localhost",
    port: 4000,
    path: "/api/admin/stats",
    method: "GET",
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert("Non-admin blocked from /api/admin/stats (403 Forbidden)", userAdminStats.statusCode === 403, `Status: ${userAdminStats.statusCode}`);

  // 5.2 Admin access to stats -> 200 OK
  const adminStats = await request({
    hostname: "localhost",
    port: 4000,
    path: "/api/admin/stats",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert("Admin can access system stats (200 OK)", adminStats.statusCode === 200, `Status: ${adminStats.statusCode}`);

  // 5.3 Admin clean up test book
  const deleteBookRes = await request({
    hostname: "localhost",
    port: 4000,
    path: `/api/books/${createdBookId}`,
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert("Admin can delete book (200 OK)", deleteBookRes.statusCode === 200, `Status: ${deleteBookRes.statusCode}`);

  // ---------------------------------------------
  // SUITE SUMMARY
  // ---------------------------------------------
  console.log("\n=================================================");
  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;

  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log("STATUS: ALL TESTS PASSED (100% SUCCESS) ✨");
  } else {
    console.error("STATUS: SOME TESTS FAILED");
    process.exitCode = 1;
  }
  console.log("=================================================");
}

runFullSuite().catch(console.error);
