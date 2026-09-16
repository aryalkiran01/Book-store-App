import fetch from "node-fetch";
import mongoose from "mongoose";

const BASE_URL = "http://localhost:4000";

async function runAuthSecurityTests() {
  console.log("==================================================");
  console.log("🔒 STARTING AUTHENTICATION SECURITY AUDIT & VERIFICATION");
  console.log("==================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.ok && healthData.isSuccess, "Backend API server is running and healthy");

  // 2. Register a brand new test user
  const timestamp = Date.now();
  const testUserEmail = `secure_user_${timestamp}@example.com`;
  const testUsername = `user_${timestamp}`;
  const testPassword = "StrongPassword123!";

  console.log("\n--- TEST PHASE 1: User Registration ---");
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUsername,
      email: testUserEmail,
      password: testPassword,
    }),
  });
  const registerBody = await registerRes.json();
  console.log("Register Response:", registerBody);
  assert(registerRes.status === 201, "User registration succeeds with 201 Created");
  assert(registerBody.data.role === "user", "Newly registered user role is 'user'");

  // 3. Login with test user
  console.log("\n--- TEST PHASE 2: Login Response & Cookie Security Audit ---");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testUserEmail,
      password: testPassword,
    }),
  });

  const loginBody = await loginRes.json();
  const rawSetCookie = loginRes.headers.raw()["set-cookie"] || [loginRes.headers.get("set-cookie")];

  console.log("Login Status:", loginRes.status);
  console.log("Login JSON Response Body:", JSON.stringify(loginBody, null, 2));
  console.log("Set-Cookie Header:", rawSetCookie);

  // Requirement 1 & 4: Ensure NO JWT or accessToken is in the response body
  assert(loginRes.status === 200, "Login returns 200 OK");
  assert(loginBody.isSuccess === true, "Login response indicates success");
  assert(loginBody.data && loginBody.data.user, "Login response body contains user object");
  assert(loginBody.data.accessToken === undefined, "SECURITY: accessToken is NOT present in login JSON response");
  assert(loginBody.data.token === undefined, "SECURITY: token is NOT present in login JSON response");
  assert(!JSON.stringify(loginBody).includes("eyJ"), "SECURITY: No JWT string token found anywhere in JSON response body");

  // Requirement 2 & 7: Check cookie configuration
  assert(rawSetCookie && rawSetCookie.length > 0, "Set-Cookie header is provided by the server");
  const tokenCookieStr = rawSetCookie.find((c) => c && c.startsWith("token="));
  assert(Boolean(tokenCookieStr), "Cookie name is 'token'");
  assert(tokenCookieStr.toLowerCase().includes("httponly"), "Cookie has httpOnly: true attribute");
  assert(tokenCookieStr.toLowerCase().includes("path=/"), "Cookie has Path=/ attribute");
  assert(tokenCookieStr.toLowerCase().includes("max-age="), "Cookie has Max-Age configured");

  const cookieHeader = tokenCookieStr.split(";")[0];

  // 4. Test /api/auth/me with httpOnly cookie
  console.log("\n--- TEST PHASE 3: /api/auth/me With Cookie ---");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
  });
  const meBody = await meRes.json();
  console.log("Me Response Status:", meRes.status);
  console.log("Me Response Body:", JSON.stringify(meBody, null, 2));

  assert(meRes.status === 200, "/api/auth/me succeeds with 200 OK using httpOnly cookie");
  assert(meBody.data.email === testUserEmail, "Authenticated user profile matches registered user email");
  assert(meBody.data.role === "user", "Authenticated user profile returns user role");

  // 5. Test /api/auth/me without cookie (must fail closed)
  console.log("\n--- TEST PHASE 4: /api/auth/me Without Cookie (Unauthorized) ---");
  const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert(unauthMeRes.status === 401, "/api/auth/me fails closed with 401 Unauthorized when no cookie is sent");

  // 6. Test User Protected Route (e.g., /api/order/my-orders)
  console.log("\n--- TEST PHASE 5: User Protected Route Access ---");
  const myOrdersRes = await fetch(`${BASE_URL}/api/order/my-orders`, {
    headers: { Cookie: cookieHeader },
  });
  const myOrdersBody = await myOrdersRes.json();
  console.log("My Orders Status:", myOrdersRes.status);
  assert(myOrdersRes.status === 200, "Protected user route /api/order/my-orders accessible with session cookie");
  assert(myOrdersBody.isSuccess === true, "Orders response returns success");

  // 7. Test Admin Endpoint with regular user cookie (must reject with 403 Forbidden)
  console.log("\n--- TEST PHASE 6: Role Authorization Enforcement ---");
  const adminAttemptRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: cookieHeader },
  });
  assert(adminAttemptRes.status === 403, "Regular user cookie is forbidden (403) from admin endpoints");

  // 8. Test Admin Flow
  console.log("\n--- TEST PHASE 7: Admin Account Flow ---");
  await mongoose.connect("mongodb://127.0.0.1:27017/book_review_app_db");
  const UserDb = mongoose.model(
    "UserTest",
    new mongoose.Schema({ username: String, email: String, role: String }, { strict: false }),
    "users"
  );
  // Promote test user to admin for admin verification
  await UserDb.updateOne({ email: testUserEmail }, { $set: { role: "admin" } });

  // Re-login to get updated admin token cookie
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testUserEmail,
      password: testPassword,
    }),
  });
  const adminLoginBody = await adminLoginRes.json();
  const adminRawSetCookie = adminLoginRes.headers.raw()["set-cookie"] || [adminLoginRes.headers.get("set-cookie")];
  const adminCookieHeader = adminRawSetCookie.find((c) => c && c.startsWith("token=")).split(";")[0];

  assert(adminLoginBody.data.accessToken === undefined, "Admin login does NOT expose accessToken");
  assert(adminLoginBody.data.user.role === "admin", "Admin login returns admin role in user object");

  // Admin access to admin stats
  const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: adminCookieHeader },
  });
  const adminStatsBody = await adminStatsRes.json();
  assert(adminStatsRes.status === 200, "Admin can access /api/admin/stats successfully with cookie");
  assert(adminStatsBody.isSuccess === true && adminStatsBody.data.metrics !== undefined, "Admin stats metrics returned");

  // 9. Logout
  console.log("\n--- TEST PHASE 8: Logout Cookie Invalidation ---");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: adminCookieHeader },
  });
  const logoutBody = await logoutRes.json();
  const logoutSetCookie = logoutRes.headers.raw()["set-cookie"] || [logoutRes.headers.get("set-cookie")];
  console.log("Logout Status:", logoutRes.status);
  console.log("Logout Body:", logoutBody);
  console.log("Logout Set-Cookie:", logoutSetCookie);

  assert(logoutRes.status === 200, "Logout endpoint returns 200 OK");
  assert(logoutBody.isSuccess === true, "Logout indicates isSuccess: true");
  const clearedCookie = logoutSetCookie.find((c) => c && c.startsWith("token="));
  assert(
    Boolean(clearedCookie) &&
      (clearedCookie.includes("Max-Age=0") ||
        clearedCookie.includes("expires=Thu, 01 Jan 1970") ||
        clearedCookie.startsWith("token=;")),
    "Logout clears token cookie with expired/empty value"
  );

  await mongoose.disconnect();

  console.log("\n==================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} AUTH SECURITY AUDIT TESTS PASSED!`);
  console.log("==================================================");
}

runAuthSecurityTests().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
