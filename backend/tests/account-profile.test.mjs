import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  loginUser,
  registerUser,
  closeDB,
} from "./test_helpers.mjs";

test("COMPLETE MY ACCOUNT & PROFILE SYSTEM SUITE", async (t) => {
  let userA;
  let userB;
  let admin;
  let testBook;

  t.before(async () => {
    userA = await createRegularUserClient();
    userB = await createRegularUserClient();
    admin = await createAdminClient();
    testBook = await createTestBook({
      title: "The Great Gatsby",
      price: 450,
      stock: 20,
    });
  });

  t.after(async () => {
    await closeDB();
  });

  // ==========================================
  // 1. Profile Retrieval & Account Summary
  // ==========================================
  await t.test("1. Authenticated user can view full account summary with statistics & completion", async () => {
    const res = await makeAuthRequest("/api/auth/me", {
      method: "GET",
      cookie: userA.cookie,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.ok(res.data.data);

    const profile = res.data.data;
    assert.strictEqual(profile.email.toLowerCase(), userA.email.toLowerCase());
    assert.strictEqual(profile.username, userA.username);
    assert.ok("location" in profile);
    assert.ok("statistics" in profile);
    assert.ok("completion" in profile);
    assert.ok(typeof profile.completion.percentage === "number");

    assert.ok(Array.isArray(profile.completion.steps));

    // Ensure secrets are never exposed
    assert.strictEqual(profile.password, undefined);
    assert.strictEqual(profile.passwordResetTokenHash, undefined);
    assert.strictEqual(profile.emailVerificationTokenHash, undefined);
    assert.strictEqual(profile.pendingEmailVerificationTokenHash, undefined);
    assert.strictEqual(profile.sessionVersion, undefined);
  });

  await t.test("2. Unauthenticated user cannot view profile", async () => {
    const res = await makeAuthRequest("/api/auth/me", {
      method: "GET",
    });
    assert.strictEqual(res.status, 401);
  });

  // ==========================================
  // 2. Profile Update & Whitelist Validation
  // ==========================================
  await t.test("3. User can update valid profile fields (names, phone, location, bio)", async () => {
    const res = await makeAuthRequest("/api/auth/profile", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        firstName: "Kiran",
        lastName: "Aryal",
        displayName: "Kiran Aryal",
        phone: "+977 9801234567",
        bio: "Avid reader and tech enthusiast from Nepal.",
        location: {
          city: "Kathmandu",
          district: "Kathmandu",
          province: "Bagmati",
          country: "Nepal",
        },
        address: "New Baneshwor, Ward 10",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    const updated = res.data.data;
    assert.strictEqual(updated.firstName, "Kiran");
    assert.strictEqual(updated.lastName, "Aryal");
    assert.strictEqual(updated.displayName, "Kiran Aryal");
    assert.strictEqual(updated.phone, "+977 9801234567");
    assert.strictEqual(updated.bio, "Avid reader and tech enthusiast from Nepal.");
    assert.strictEqual(updated.location.city, "Kathmandu");
    assert.strictEqual(updated.location.province, "Bagmati");
    assert.strictEqual(updated.address, "New Baneshwor, Ward 10");
  });

  // ==========================================
  // 3. Username Management & Availability
  // ==========================================
  await t.test("4. Check username availability endpoint works correctly", async () => {
    const availRes = await makeAuthRequest("/api/auth/username-availability?username=brand_new_user_123", {
      method: "GET",
    });
    assert.strictEqual(availRes.status, 200);
    assert.strictEqual(availRes.data.data.available, true);

    const takenRes = await makeAuthRequest(`/api/auth/username-availability?username=${userB.username}`, {
      method: "GET",
    });
    assert.strictEqual(takenRes.status, 200);
    assert.strictEqual(takenRes.data.data.available, false);
  });

  await t.test("5. Prevent duplicate username updates", async () => {
    const res = await makeAuthRequest("/api/auth/profile", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        username: userB.username,
      },
    });

    assert.strictEqual(res.status, 409); // Conflict
  });

  await t.test("6. Reject invalid username format", async () => {
    const res = await makeAuthRequest("/api/auth/profile", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        username: "ab", // Too short (min 3)
      },
    });

    assert.strictEqual(res.status, 400);
  });

  // ==========================================
  // 4. IDOR & Privilege Escalation Protection
  // ==========================================
  await t.test("7. Customer cannot escalate role or verify own email via profile update", async () => {
    const res = await makeAuthRequest("/api/auth/profile", {
      method: "PATCH",
      cookie: userA.cookie,
      body: {
        role: "admin",
        isEmailVerified: true,
        isAdmin: true,
        isActive: false,
      },
    });

    assert.strictEqual(res.status, 200);
    // User profile should remain role: "user"
    assert.strictEqual(res.data.data.role, "user");
  });

  // ==========================================
  // 5. Avatar Management
  // ==========================================
  await t.test("8. User can remove avatar", async () => {
    const res = await makeAuthRequest("/api/auth/avatar", {
      method: "DELETE",
      cookie: userA.cookie,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.strictEqual(res.data.data.avatar, "");
  });

  // ==========================================
  // 6. Admin User View Security
  // ==========================================
  await t.test("9. Admin can view users list with rich profile info but no secrets", async () => {
    const res = await makeAuthRequest("/api/admin/users?limit=5", {
      method: "GET",
      cookie: admin.cookie,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isSuccess, true);
    assert.ok(Array.isArray(res.data.data));

    const found = res.data.data.find((u) => u.email.toLowerCase() === userA.email.toLowerCase());
    assert.ok(found, "User A should be in admin list");
    assert.strictEqual(found.firstName, "Kiran");
    assert.strictEqual(found.phone, "+977 9801234567");
    assert.strictEqual(found.password, undefined);
    assert.strictEqual(found.passwordResetTokenHash, undefined);
  });
});

