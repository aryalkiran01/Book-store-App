// Security Verification Test Suite for Phase 2
const BACKEND_URL = "http://localhost:4000";

async function runTests() {
  console.log("=== PHASE 2 SECURITY VERIFICATION ===");
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
    // 1. Test Admin Login
    console.log("\n--- 1. Authentication: Admin Login ---");
    const adminLoginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookstore.com", password: "admin123" }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, "Admin login returns status 200");
    assert(adminLoginData.data?.user?.role === "admin", "Admin role is returned correctly");
    assert(!!adminLoginData.data?.accessToken, "JWT Access Token is returned");
    const adminToken = adminLoginData.data?.accessToken;

    // 2. Test User Registration
    console.log("\n--- 2. Authentication: User Registration & Role Tamper Prevention ---");
    const testUsername = `sec_user_${Date.now()}`;
    const testEmail = `sec_user_${Date.now()}@example.com`;
    const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: "Password123!",
        role: "admin", // Malicious attempt to self-escalate role
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, "User registered successfully");
    assert(regData.data?.role === "user", "Role self-escalation prevented (assigned 'user')");

    // 3. Test Regular User Login
    console.log("\n--- 3. Authentication: Regular User Login ---");
    const userLoginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "Password123!" }),
    });
    const userLoginData = await userLoginRes.json();
    assert(userLoginRes.status === 200, "User login returns status 200");
    const userToken = userLoginData.data?.accessToken;
    const userId = userLoginData.data?.user?.id;

    // 4. Test Role Protection: Regular User attempting Admin Book Creation
    console.log("\n--- 4. Authorization: Admin Endpoint Protection ---");
    const bookCreateRes = await fetch(`${BACKEND_URL}/api/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        title: "Malicious Book",
        author: "Hacker",
        price: 99,
        genre: "Tech",
        description: "Attempted book",
      }),
    });
    assert(
      bookCreateRes.status === 403,
      `Regular user cannot create books (HTTP 403, got ${bookCreateRes.status})`
    );

    // 5. Test Role Protection: Regular User attempting to change their own role
    console.log("\n--- 5. Authorization: Privilege Escalation Protection ---");
    const roleEscalateRes = await fetch(`${BACKEND_URL}/api/auth/updateRole`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        userId: userId,
        userRole: "admin",
      }),
    });
    assert(
      roleEscalateRes.status === 403,
      `Regular user cannot call updateRole (HTTP 403, got ${roleEscalateRes.status})`
    );

    // 6. Test Review Authorization: Cannot modify another user's review
    console.log("\n--- 6. Authorization: Review Ownership Protection ---");
    // Get books
    const booksRes = await fetch(`${BACKEND_URL}/api/books`);
    const booksData = await booksRes.json();
    const targetBook = booksData.data?.[0];
    assert(!!targetBook, "Retrieved book from catalog");

    // Add review as User 1
    const addReviewRes = await fetch(`${BACKEND_URL}/api/reviews/addReview/${targetBook._id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        reviewText: "Legitimate user review",
      }),
    });
    const reviewData = await addReviewRes.json();
    assert(addReviewRes.status === 201, "User 1 created a review");
    const createdReviewId = reviewData.data?._id;

    // Register User 2
    const user2Email = `user2_${Date.now()}@example.com`;
    const reg2Res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `user2_${Date.now()}`,
        email: user2Email,
        password: "Password123!",
      }),
    });
    const user2LoginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user2Email, password: "Password123!" }),
    });
    const user2Token = (await user2LoginRes.json()).data?.accessToken;

    // User 2 attempts to edit User 1's review
    const editReviewRes = await fetch(`${BACKEND_URL}/api/reviews/updateReview/${createdReviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        rating: 1,
        reviewText: "Vandalized by user 2",
      }),
    });
    assert(
      editReviewRes.status === 403,
      `User 2 cannot edit User 1's review (HTTP 403, got ${editReviewRes.status})`
    );

    // User 2 attempts to delete User 1's review
    const delReviewRes = await fetch(`${BACKEND_URL}/api/reviews/deleteReview/${createdReviewId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });
    assert(
      delReviewRes.status === 403,
      `User 2 cannot delete User 1's review (HTTP 403, got ${delReviewRes.status})`
    );

    // 7. Test Order Privacy: Cannot access another user's order list
    console.log("\n--- 7. Authorization: Order Privacy Protection ---");
    const orderAccessRes = await fetch(`${BACKEND_URL}/api/orders/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });
    assert(
      orderAccessRes.status === 403,
      `User 2 cannot view User 1's orders (HTTP 403, got ${orderAccessRes.status})`
    );

    // 8. Test NoSQL Injection Defense & Invalid ID Handling
    console.log("\n--- 8. Input Security: NoSQL Injection & Bad ObjectId Defense ---");
    const invalidIdRes = await fetch(`${BACKEND_URL}/api/books/invalid-id-payload' OR 1=1--`);
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400,
      `Invalid ObjectId format rejected safely (HTTP 400, got ${invalidIdRes.status})`
    );
    assert(
      !invalidIdData.stack && !JSON.stringify(invalidIdData).includes("MongooseError"),
      "Internal database error/stack trace not leaked to client"
    );

    // 9. Test Password Change Functionality
    console.log("\n--- 9. Authentication: Password Change Security ---");
    const badPassChangeRes = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        oldPassword: "WrongPassword!",
        newPassword: "NewSecurePassword123!",
      }),
    });
    assert(badPassChangeRes.status === 400, "Password change rejected with incorrect current password");

    const goodPassChangeRes = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        oldPassword: "Password123!",
        newPassword: "NewSecurePassword123!",
      }),
    });
    assert(goodPassChangeRes.status === 200, "Password successfully changed with valid current password");

    // 10. Test Security Headers
    console.log("\n--- 10. API Security: Security Headers ---");
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    assert(
      healthRes.headers.get("x-content-type-options") === "nosniff",
      "Helmet X-Content-Type-Options: nosniff header present"
    );

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} / ${total} tests passed.`);
    console.log(`========================================`);

  } catch (err) {
    console.error("Test execution error:", err);
  }
}

runTests();
