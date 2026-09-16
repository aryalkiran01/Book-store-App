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

  await t.test("8. Password change invalidates previous session tokens on other devices", async () => {
    const user = {
      username: `PwUser_${Date.now()}`,
      email: `pw_${Date.now()}@example.com`,
      password: "InitialPassword123!",
    };
    await registerUser(user);

    // Device 1 login
    const loginDevice1 = await loginUser(user);
    const cookieDevice1 = loginDevice1.setCookie;

    // Verify Device 1 works
    const me1 = await makeAuthRequest("/api/auth/me", { cookie: cookieDevice1 });
    assert.equal(me1.status, 200);

    // Change password from Device 1
    const newPassword = "NewStrongPassword456!";
    const changeRes = await makeAuthRequest("/api/auth/change-password", {
      method: "POST",
      cookie: cookieDevice1,
      body: { oldPassword: user.password, newPassword },
    });
    assert.equal(changeRes.status, 200);

    // Subsequent request with the OLD token (simulating Device 2 with old token) must be rejected
    const oldSessionCheck = await makeAuthRequest("/api/auth/me", { cookie: cookieDevice1 });
    // Old session token has old sessionVersion so it fails with 401
    assert.equal(oldSessionCheck.status, 401, "Old session token must be invalidated after password change");
  });

  await t.test("9. Forgot password and reset password flow successfully updates credentials", async () => {
    const user = {
      username: `ForgotUser_${Date.now()}`,
      email: `forgot_${Date.now()}@example.com`,
      password: "OriginalPassword123!",
    };
    await registerUser(user);

    // Request forgot password
    const forgotRes = await makeAuthRequest("/api/auth/forgot-password", {
      method: "POST",
      body: { email: user.email },
    });
    assert.equal(forgotRes.status, 200);
    assert.equal(forgotRes.data.isSuccess, true);
    assert.ok(forgotRes.data.data?.resetToken, "Expected resetToken in test environment response");

    const resetToken = forgotRes.data.data.resetToken;
    const resetPassword = "BrandNewPassword789!";

    // Reset password with valid token
    const resetRes = await makeAuthRequest("/api/auth/reset-password", {
      method: "POST",
      body: { token: resetToken, newPassword: resetPassword },
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.data.isSuccess, true);

    // Replay attack: Reusing same token must fail
    const replayRes = await makeAuthRequest("/api/auth/reset-password", {
      method: "POST",
      body: { token: resetToken, newPassword: "AnotherPassword123!" },
    });
    assert.equal(replayRes.status, 400, "Reset token must be single-use and fail on replay");

    // Verify login with new password succeeds
    const newLogin = await loginUser({ email: user.email, password: resetPassword });
    assert.equal(newLogin.status, 200, "Login with new password must succeed");
  });

  await t.test("10. Email verification flow verifies account", async () => {
    const user = {
      username: `VerifyUser_${Date.now()}`,
      email: `verify_${Date.now()}@example.com`,
      password: "Password123!",
    };
    await registerUser(user);
    const loginRes = await loginUser(user);

    // Send email verification
    const sendRes = await makeAuthRequest("/api/auth/email-verification/send", {
      method: "POST",
      cookie: loginRes.setCookie,
    });
    assert.equal(sendRes.status, 200);
    const token = sendRes.data.data?.verificationToken;
    assert.ok(token, "Expected verification token in test environment");

    // Verify email with token
    const verifyRes = await makeAuthRequest("/api/auth/email-verification/verify", {
      method: "POST",
      body: { token },
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.data.isSuccess, true);
    assert.equal(verifyRes.data.data?.isEmailVerified, true);
  });
});
