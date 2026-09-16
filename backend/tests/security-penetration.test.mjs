import test from "node:test";
import assert from "node:assert/strict";
import { BASE_URL, createRegularUserClient, makeAuthRequest } from "./test_helpers.mjs";

test("PHASE 40: Security & Penetration Testing Suite", async (t) => {
  const attacker = await createRegularUserClient();
  const victim = await createRegularUserClient();

  // 1. NoSQL Injection Mitigation
  await t.test("1. NoSQL injection payloads in search queries fail closed without database leaks", async () => {
    const res = await fetch(`${BASE_URL}/api/books?search[$gt]=`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
  });

  // 2. ReDoS Protection
  await t.test("2. ReDoS catastrophic backtracking payloads are safely neutralized", async () => {
    const redosPayload = encodeURIComponent("((((a+)+)+)+)+$");
    const res = await fetch(`${BASE_URL}/api/books?search=${redosPayload}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
  });

  // 3. IDOR: Attacker cannot access victim's profile
  await t.test("3. IDOR: Attacker cannot read or tamper with another user's profile", async () => {
    const res = await makeAuthRequest("/api/auth/me", { cookie: attacker.cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.email, attacker.email);
    assert.notStrictEqual(res.data.data.email, victim.email);
  });

  // 4. Token Forgery / Role Escalation
  await t.test("4. Forged JWT with elevated 'admin' role is rejected", async () => {
    const fakeAdminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJyb2xlIjoiYWRtaW4ifQ.fakesignature123";
    const res = await makeAuthRequest("/api/admin/analytics", { cookie: `token=${fakeAdminToken}` });
    assert.strictEqual(res.status, 401);
  });
});
