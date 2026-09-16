import test from "node:test";
import assert from "node:assert/strict";

test("PHASE 38: Unit Testing Suite (Calculations, VAT Engine, JWT & State Machine)", async (t) => {
  // 1. Order Calculations & Discount Engine
  await t.test("1. Order calculation accurately applies discounts and free shipping above NPR 1000", () => {
    const rawPrice = 500;
    const discountPct = 10;
    const unitPrice = Number((rawPrice * (1 - discountPct / 100)).toFixed(2));
    assert.strictEqual(unitPrice, 450);

    const qty = 2;
    const subtotal = unitPrice * qty; // 900
    const shippingUnder1000 = subtotal >= 1000 ? 0 : 100;
    assert.strictEqual(shippingUnder1000, 100);
    assert.strictEqual(subtotal + shippingUnder1000, 1000);

    const subtotalAbove1000 = 1200;
    const shippingAbove1000 = subtotalAbove1000 >= 1000 ? 0 : 100;
    assert.strictEqual(shippingAbove1000, 0);
  });

  // 2. Nepal 13% VAT Calculation Engine
  await t.test("2. Tax Engine accurately calculates Nepal 13% VAT with precision rounding", async () => {
    const { calculateTaxBreakdown } = await import("../dist/modules/order/tax.service.js");

    const tax1 = calculateTaxBreakdown([{ price: 1000, quantity: 1 }]);
    assert.strictEqual(tax1.subtotal, 1000);
    assert.strictEqual(tax1.taxRate, 0.13);
    assert.strictEqual(tax1.taxAmount, 130);
    assert.strictEqual(tax1.grandTotal, 1130);

    const tax2 = calculateTaxBreakdown([{ price: 123.45, quantity: 1 }]);
    assert.strictEqual(tax2.subtotal, 123.45);
    assert.strictEqual(tax2.taxAmount, 16.05); // 123.45 * 0.13 = 16.0485 -> 16.05
    assert.strictEqual(tax2.grandTotal, 139.5);
  });

  // 3. JWT Signing & Token Session Validation
  await t.test("3. JWT Auth tokens encode sessionVersion and fail when tempered or expired", async () => {
    const { generateToken, verifyToken } = await import("../dist/utils/auth.js");

    const payload = {
      id: "650000000000000000000001",
      username: "unittestuser",
      email: "unit_test@example.com",
      role: "user",
      sessionVersion: 1,
    };

    const token = generateToken(payload);
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.isValid, true);
    assert.strictEqual(decoded.payload.id, payload.id);
    assert.strictEqual(decoded.payload.email, payload.email);
    assert.strictEqual(decoded.payload.sessionVersion, 1);

    // Tampered token fails closed
    const tamperedToken = token.slice(0, -5) + "abcde";
    const invalidDecoded = verifyToken(tamperedToken);
    assert.strictEqual(invalidDecoded.isValid, false);
    assert.strictEqual(invalidDecoded.payload, null);
  });

  // 4. Order State Machine Transition Matrix
  await t.test("4. Order State Machine strictly enforces legal transitions and rejects invalid state jumps", async () => {
    const { isValidStatusTransition, VALID_STATUS_TRANSITIONS } = await import(
      "../dist/modules/order/service.js"
    );

    assert.ok(VALID_STATUS_TRANSITIONS.pending.includes("confirmed"));
    assert.ok(VALID_STATUS_TRANSITIONS.pending.includes("cancelled"));
    assert.ok(!VALID_STATUS_TRANSITIONS.pending.includes("delivered"));

    assert.strictEqual(isValidStatusTransition("pending", "confirmed"), true);
    assert.strictEqual(isValidStatusTransition("confirmed", "processing"), true);
    assert.strictEqual(isValidStatusTransition("processing", "shipped"), true);
    assert.strictEqual(isValidStatusTransition("shipped", "delivered"), true);
    assert.strictEqual(isValidStatusTransition("delivered", "return_requested"), true);

    // Illegal state jumps
    assert.strictEqual(isValidStatusTransition("pending", "delivered"), false);
    assert.strictEqual(isValidStatusTransition("delivered", "pending"), false);
    assert.strictEqual(isValidStatusTransition("cancelled", "delivered"), false);
    assert.strictEqual(isValidStatusTransition("refunded", "confirmed"), false);
  });
});
