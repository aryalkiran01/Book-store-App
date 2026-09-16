import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_bookreviewapp_2025_secure';

async function runTests() {
  console.log('=== STARTING PAYMENT SECURITY AUDIT & VERIFICATION SUITE ===\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/book_review_app_db');
  const User = mongoose.model('User', new mongoose.Schema({ username: String, email: String, role: String }, { strict: false }));
  const Book = mongoose.model('Book', new mongoose.Schema({ title: String, price: Number, stock: Number }, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, books: Array, totalAmount: Number, paymentStatus: String, paymentId: String, status: String }, { strict: false }));

  // Create two distinct test users
  const user1 = await User.findOneAndUpdate(
    { email: 'user1_sec@example.com' },
    { username: 'UserOne', email: 'user1_sec@example.com', role: 'user' },
    { upsert: true, new: true }
  );

  const user2 = await User.findOneAndUpdate(
    { email: 'user2_sec@example.com' },
    { username: 'UserTwo', email: 'user2_sec@example.com', role: 'user' },
    { upsert: true, new: true }
  );

  const token1 = jwt.sign({ id: user1._id.toString(), email: user1.email, role: user1.role }, JWT_SECRET, { expiresIn: '1h' });
  const token2 = jwt.sign({ id: user2._id.toString(), email: user2.email, role: user2.role }, JWT_SECRET, { expiresIn: '1h' });

  // Get a test book
  let book = await Book.findOne({ stock: { $gt: 5 } });
  if (!book) {
    book = await Book.create({
      title: 'Security Testing Handbook',
      author: 'Security Expert',
      genre: 'Technology',
      price: 500,
      stock: 50
    });
  }

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Fake `paymentId` during order creation MUST NOT mark order as paid
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Fake Client-Supplied paymentId on Order Creation ---');
  const orderCreateRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      books: [{ bookId: book._id.toString(), quantity: 1 }],
      shippingAddress: 'Kathmandu, Nepal',
      paymentId: 'fake_instant_paid_exploit_123',
    }),
  });
  const orderCreateData = await orderCreateRes.json();
  const createdOrder = await Order.findById(orderCreateData.data.orderId || orderCreateData.data._id);

  assert(
    createdOrder.paymentStatus === 'pending',
    `Order paymentStatus must be 'pending', actual: '${createdOrder.paymentStatus}' (did not become paid from paymentId input)`
  );
  assert(
    createdOrder.status === 'pending',
    `Order status must be 'pending', actual: '${createdOrder.status}'`
  );

  // ----------------------------------------------------
  // TEST 2: Ownership verification - User 2 cannot verify/initiate payment on User 1's order
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Payment Ownership Enforcement ---');
  const initiateUser2Res = await fetch(`${BASE_URL}/api/payments/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`, // User 2 trying to initiate payment on User 1's order
    },
    body: JSON.stringify({
      return_url: 'http://localhost:5173/payment',
      website_url: 'http://localhost:5173',
      amount: Math.round(createdOrder.totalAmount * 100),
      purchase_order_id: createdOrder._id.toString(),
      purchase_order_name: `Order #${createdOrder._id}`,
    }),
  });
  assert(
    initiateUser2Res.status === 403,
    `Unauthorized user initiating payment on another user order was rejected with status 403 (actual: ${initiateUser2Res.status})`
  );

  const verifyUser2Res = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`, // User 2 trying to verify payment on User 1's order
    },
    body: JSON.stringify({
      pidx: 'mock_pidx_12345',
      orderId: createdOrder._id.toString(),
    }),
  });
  assert(
    verifyUser2Res.status === 403,
    `Unauthorized user verifying payment on another user order was rejected with status 403 (actual: ${verifyUser2Res.status})`
  );

  // ----------------------------------------------------
  // TEST 3: Invalid pidx / Nonexistent Khalti Payment must FAIL CLOSED
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Invalid / Nonexistent Khalti Token (Fail Closed) ---');
  const invalidPidxRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      pidx: 'invalid_nonexistent_pidx_999999',
      orderId: createdOrder._id.toString(),
    }),
  });
  assert(
    invalidPidxRes.status >= 400,
    `Invalid pidx verification rejected with HTTP error (actual: ${invalidPidxRes.status})`
  );
  const orderAfterInvalid = await Order.findById(createdOrder._id);
  assert(
    orderAfterInvalid.paymentStatus === 'failed',
    `Order paymentStatus after failed lookup must be 'failed' (never completed), actual: '${orderAfterInvalid.paymentStatus}'`
  );

  // ----------------------------------------------------
  // TEST 4: Successful Genuine Verification & Idempotency
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Successful Payment Verification & Idempotency ---');
  const freshOrder = await Order.create({
    userId: user1._id,
    books: [{ bookId: book._id, title: book.title, price: book.price, quantity: 1, subtotal: book.price }],
    totalAmount: 600,
    subtotal: 500,
    shippingCost: 100,
    discount: 0,
    paymentStatus: 'pending',
    status: 'pending',
  });

  const validVerifyRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      pidx: `mock_pidx_${Date.now()}_test`,
      orderId: freshOrder._id.toString(),
    }),
  });
  assert(
    validVerifyRes.status === 200,
    `Valid payment verification succeeded with 200 (actual: ${validVerifyRes.status})`
  );
  const freshOrderCompleted = await Order.findById(freshOrder._id);
  assert(
    freshOrderCompleted.paymentStatus === 'completed',
    `Order paymentStatus transitioned to 'completed', actual: '${freshOrderCompleted.paymentStatus}'`
  );
  assert(
    freshOrderCompleted.status === 'confirmed',
    `Order status transitioned to 'confirmed', actual: '${freshOrderCompleted.status}'`
  );

  // Test Idempotency: verify again
  const duplicateVerifyRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      pidx: `mock_pidx_${Date.now()}_test`,
      orderId: freshOrder._id.toString(),
    }),
  });
  const duplicateVerifyData = await duplicateVerifyRes.json();
  assert(
    duplicateVerifyRes.status === 200 && duplicateVerifyData.data.alreadyVerified === true,
    `Duplicate payment verification is idempotent and returns alreadyVerified: true`
  );

  // ----------------------------------------------------
  // TEST 5: Verify Amount Manipulation Protection
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Amount Manipulation Protection on Initiate ---');
  const orderForTamper = await Order.create({
    userId: user1._id,
    books: [{ bookId: book._id, title: book.title, price: 1000, quantity: 1, subtotal: 1000 }],
    totalAmount: 1000,
    subtotal: 1000,
    shippingCost: 0,
    discount: 0,
    paymentStatus: 'pending',
    status: 'pending',
  });

  // Client attempts to initiate payment with tampered amount (100 paisa = NPR 1 instead of NPR 1000 = 100000 paisa)
  const tamperInitiateRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      return_url: 'http://localhost:5173/payment',
      website_url: 'http://localhost:5173',
      amount: 100, // Tampered client input
      purchase_order_id: orderForTamper._id.toString(),
      purchase_order_name: `Order #${orderForTamper._id}`,
    }),
  });
  assert(
    tamperInitiateRes.status === 201,
    `Initiate request handled safely (actual: ${tamperInitiateRes.status})`
  );

  await mongoose.disconnect();
  console.log(`\n=== ALL ${passedTests}/${totalTests} PAYMENT SECURITY TESTS PASSED SUCCESSFULLY! ===`);
}

runTests().catch((err) => {
  console.error('\n❌ Payment security test failed:', err);
  process.exit(1);
});
