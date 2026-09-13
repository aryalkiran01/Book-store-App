import test from "node:test";
import assert from "node:assert/strict";
import { registerUser, loginUser, makeAuthRequest } from "./test_helpers.mjs";

test("Authentication Suite", async (t) => {
  const ts = Date.now() + Math.random().toString(36).substring(2, 6);
  const testUser = {
    username: `AuthUser_${ts}`,
    email: `auth_${ts}@example.com`,
    password: "StrongPassword123!",
  };

  await t.test("1. Registration with valid payload succeeds with 201 Created", async () => {
    const res = await registerUser(testUser);
    assert.equal(res.status, 201, "Expected HTTP 201 on registration");
    assert.equal(res.data.isSuccess, true, "Expected isSuccess: true");
    assert.ok(res.data.data, "Expected user object in data");
    assert.equal(res.data.data.email, testUser.email);
    assert.equal(res.data.data.password, undefined, "Password must not be returned");
  });

  await t.test("2. Duplicate email registration is rejected", async () => {
    const res = await registerUser(testUser);
    assert.ok(res.status === 400 || res.status === 409, `Expected 400 or 409 for duplicate registration, got ${res.status}`);
    assert.equal(res.data.isSuccess, false);
  });

  await t.test("3. Login with invalid password fails with 401/400 and does not set auth cookie", async () => {
    const res = await loginUser({ email: testUser.email, password: "WrongPassword!" });
    assert.ok(res.status === 400 || res.status === 401, `Expected 400/401 on bad credentials, got ${res.status}`);
    assert.equal(res.data.isSuccess, false);
    assert.ok(!res.setCookie || !res.setCookie.includes("accessToken"), "No valid auth cookie should be set");
  });

  await t.test("4. Login with valid credentials succeeds and issues httpOnly cookie without JWT leak in body", async () => {
    const res = await loginUser(testUser);
    assert.equal(res.status, 200, "Expected HTTP 200 on valid login");
    assert.equal(res.data.isSuccess, true);
    assert.ok(res.setCookie.includes("token="), "Must set auth token cookie");
    assert.ok(res.setCookie.toLowerCase().includes("httponly"), "Auth cookie must be httpOnly");
    assert.equal(res.data.data?.accessToken, undefined, "Access token must not be exposed in JSON response");
    assert.equal(res.data.data?.token, undefined, "Token must not be exposed in JSON response");
  });

  let authCookie = "";
  await t.test("5. Protected route /api/auth/me returns profile when authenticated", async () => {
    const loginRes = await loginUser(testUser);
    authCookie = loginRes.setCookie;

    const meRes = await makeAuthRequest("/api/auth/me", { cookie: authCookie });
    assert.equal(meRes.status, 200, "Expected HTTP 200 on /me with valid cookie");
    assert.equal(meRes.data.isSuccess, true);
    assert.equal(meRes.data.data?.email, testUser.email);
  });

  await t.test("6. Protected route /api/auth/me rejects unauthenticated requests with 401", async () => {
    const meRes = await makeAuthRequest("/api/auth/me", { cookie: "" });
    assert.equal(meRes.status, 401, "Expected HTTP 401 without cookie");
    assert.equal(meRes.data.isSuccess, false);
  });

  await t.test("7. Logout clears authentication and subsequent /me returns 401", async () => {
    const logoutRes = await makeAuthRequest("/api/auth/logout", {
      method: "POST",
      cookie: authCookie,
    });
    assert.equal(logoutRes.status, 200, "Expected HTTP 200 on logout");
    const clearCookieHeader = logoutRes.headers.get("set-cookie") || "";

    const checkMe = await makeAuthRequest("/api/auth/me", { cookie: clearCookieHeader });
    assert.equal(checkMe.status, 401, "Expected HTTP 401 after logout");
  });
});
