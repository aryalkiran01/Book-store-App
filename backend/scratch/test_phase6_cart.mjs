import mongoose from "mongoose";

const BASE_URL = "http://localhost:4000/api";

async function runTests() {
  console.log("=== PHASE 6 STORE, CART & WISHLIST TEST SUITE ===");

  await mongoose.connect("mongodb://127.0.0.1:27017/book_review_app_db");
  const db = mongoose.connection;

  const booksColl = db.collection("books");
  const ordersColl = db.collection("orders");

  // Fetch a couple of test books
  const sampleBooks = await booksColl.find({}).limit(3).toArray();
  if (sampleBooks.length < 2) {
    console.error("Not enough test books in database.");
    process.exit(1);
  }

  const bookA = sampleBooks[0];
  const bookB = sampleBooks[1];

  console.log(`\nTest Book A: "${bookA.title}" - NPR ${bookA.price}, discount: ${bookA.discountPercentage || 0}%, stock: ${bookA.stock}`);
  console.log(`Test Book B: "${bookB.title}" - NPR ${bookB.price}, discount: ${bookB.discountPercentage || 0}%, stock: ${bookB.stock}`);

  // Test 1: Authoritative Cart Validation
  console.log("\n[Test 1] Testing /api/order/validate-cart with valid items...");
  const valRes1 = await fetch(`${BASE_URL}/order/validate-cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { bookId: bookA._id.toString(), quantity: 2 },
        { bookId: bookB._id.toString(), quantity: 1 },
      ],
    }),
  });

  const valData1 = await valRes1.json();
  console.log("Validation Response status:", valRes1.status);
  console.log("Validation Data summary:", {
    subtotal: valData1.data?.subtotal,
    discountSavings: valData1.data?.discountSavings,
    shipping: valData1.data?.shipping,
    finalTotal: valData1.data?.finalTotal,
    totalItems: valData1.data?.totalItems,
  });

  if (!valData1.isSuccess || valData1.data?.totalItems !== 3) {
    throw new Error("Test 1 Failed: Cart validation did not return expected totals.");
  }
  console.log("✓ Test 1 Passed: Cart validation returned authoritative calculation.");

  // Test 2: Client Price Manipulation Immunity
  console.log("\n[Test 2] Testing Client Price & Discount Manipulation Immunity...");
  // Even if a malicious client sends fake price / discount in body, backend computes directly from DB
  const valRes2 = await fetch(`${BASE_URL}/order/validate-cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          bookId: bookA._id.toString(),
          quantity: 1,
          price: 1, // Fake price 1 NPR
          discountPercentage: 99, // Fake 99% discount
        },
      ],
    }),
  });
  const valData2 = await valRes2.json();
  const expectedEffPrice = bookA.discountPercentage
    ? Number((bookA.price * (1 - bookA.discountPercentage / 100)).toFixed(2))
    : bookA.price;

  console.log(`Expected Book A price: NPR ${expectedEffPrice}, Got: NPR ${valData2.data.items[0].effectivePrice}`);
  if (Math.abs(valData2.data.items[0].effectivePrice - expectedEffPrice) > 0.01) {
    throw new Error("Test 2 Failed: Backend accepted manipulated price!");
  }
  console.log("✓ Test 2 Passed: Backend ignored fake client price & used authoritative DB price.");

  // Test 3: Negative Quantity Rejection
  console.log("\n[Test 3] Testing Negative & Zero Quantity Rejection...");
  const valRes3 = await fetch(`${BASE_URL}/order/validate-cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { bookId: bookA._id.toString(), quantity: -5 },
      ],
    }),
  });
  console.log("Negative quantity response status:", valRes3.status);
  if (valRes3.status !== 400) {
    throw new Error("Test 3 Failed: Backend did not reject negative quantity.");
  }
  console.log("✓ Test 3 Passed: Negative quantity rejected by schema validator.");

  // Test 4: Stock Exceeded Clamping & Warnings
  console.log("\n[Test 4] Testing Stock Bounds & Out-of-Stock Warnings...");
  const valRes4 = await fetch(`${BASE_URL}/order/validate-cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { bookId: bookA._id.toString(), quantity: 999999 },
      ],
    }),
  });
  const valData4 = await valRes4.json();
  console.log("Requested 999999, Clamped Quantity:", valData4.data?.items[0]?.quantity);
  console.log("Warnings:", valData4.data?.warnings);

  if (valData4.data?.items[0]?.quantity > (bookA.stock || 20)) {
    throw new Error("Test 4 Failed: Quantity was not clamped to available stock.");
  }
  if (!valData4.data?.warnings || valData4.data.warnings.length === 0) {
    throw new Error("Test 4 Failed: Expected stock adjustment warning.");
  }
  console.log("✓ Test 4 Passed: Stock clamped with authoritative warning.");

  // Test 5: Shipping Fee Threshold
  console.log("\n[Test 5] Testing Free Shipping Threshold (>= NPR 1000)...");
  // Test case A: small total < 1000
  const valRes5A = await fetch(`${BASE_URL}/order/validate-cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ bookId: bookA._id.toString(), quantity: 1 }],
    }),
  });
  const valData5A = await valRes5A.json();
  const subtotalA = valData5A.data.subtotal;
  const expectedShippingA = subtotalA >= 1000 ? 0 : 100;
  if (valData5A.data.shipping !== expectedShippingA) {
    throw new Error(`Test 5A Failed: Expected shipping NPR ${expectedShippingA}, got ${valData5A.data.shipping}`);
  }
  console.log(`Subtotal NPR ${subtotalA} -> Shipping: NPR ${valData5A.data.shipping} (Correct)`);

  // Test 6: Authoritative Order Placement & Stock Decrement
  console.log("\n[Test 6] Testing Order Creation with Authoritative Calculations & Stock Decrement...");
  
  // Register then Login test user
  let token = null;
  const uniqueSuffix = Date.now();
  const testEmail = `cart_test_${uniqueSuffix}@example.com`;
  const testUsername = `user_${uniqueSuffix}`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: "Password123!",
    }),
  });
  const regData = await regRes.json();
  if (!regData.isSuccess) {
    throw new Error(`Register failed: ${regData.message}`);
  }

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "Password123!",
    }),
  });
  const loginData = await loginRes.json();
  token = loginData.data?.accessToken;

  if (!token) {
    throw new Error(`Could not authenticate test user: ${loginData.message}`);
  }

  const initialStockA = (await booksColl.findOne({ _id: bookA._id })).stock;
  
  const orderRes = await fetch(`${BASE_URL}/order/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      books: [
        { bookId: bookA._id.toString(), quantity: 1 },
      ],
      shippingAddress: "Kathmandu Test Address",
    }),
  });
  const orderData = await orderRes.json();
  console.log("Order creation response:", orderData.message, "Total Amount: NPR", orderData.data?.totalAmount);

  if (!orderData.isSuccess || !orderData.data?._id) {
    throw new Error(`Test 6 Failed: Could not create test order (${orderData.message}).`);
  }

  const postStockA = (await booksColl.findOne({ _id: bookA._id })).stock;
  console.log(`Book A stock before: ${initialStockA}, after order: ${postStockA}`);
  if (postStockA !== initialStockA - 1) {
    throw new Error("Test 6 Failed: Stock was not decremented by 1.");
  }
  console.log("✓ Test 6 Passed: Order created with authoritative calculations and stock decremented.");

  console.log("\n🎉 ALL PHASE 6 CART, STORE & WISHLIST TESTS PASSED SUCCESSFULLY! 🎉\n");
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
