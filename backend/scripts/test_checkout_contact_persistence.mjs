import fetch from 'node-fetch';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:4000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/book_review_app_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_bookreviewapp_2025_secure';

async function runCheckoutContactTests() {
  console.log('==================================================');
  console.log('📦 CHECKOUT CONTACT PERSISTENCE & VALIDATION SUITE');
  console.log('==================================================\n');

  await mongoose.connect(MONGO_URI);
  const User = mongoose.model(
    'UserContactTest',
    new mongoose.Schema({ username: String, email: String, role: String }, { strict: false }),
    'users'
  );
  const Book = mongoose.model(
    'BookContactTest',
    new mongoose.Schema({ title: String, author: String, genre: String, price: Number, stock: Number }, { strict: false }),
    'books'
  );

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

  // Create test user and auth token
  const testUser = await User.findOneAndUpdate(
    { email: 'contact_tester@example.com' },
    { username: 'ContactTester', email: 'contact_tester@example.com', role: 'user' },
    { upsert: true, new: true }
  );
  const userToken = jwt.sign(
    { id: testUser._id.toString(), username: testUser.username, email: testUser.email, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create test admin and auth token
  const adminUser = await User.findOneAndUpdate(
    { email: 'contact_admin@example.com' },
    { username: 'ContactAdmin', email: 'contact_admin@example.com', role: 'admin' },
    { upsert: true, new: true }
  );
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), username: adminUser.username, email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Ensure an available book exists
  let testBook = await Book.findOne({ stock: { $gte: 10 } });
  if (!testBook) {
    testBook = await Book.create({
      title: 'Checkout Persistence Guide',
      author: 'QA Architect',
      genre: 'Non-Fiction',
      price: 450,
      stock: 50,
    });
  }

  // ----------------------------------------------------
  // TEST 1: Valid Checkout Contact Info Persisted Accurately
  // ----------------------------------------------------
  console.log('\n--- 1. Order Creation with Full Contact Info ---');
  const validOrderPayload = {
    fullName: 'Jane Doe Customer',
    email: 'jane.doe@example.com',
    phone: '+977 9812345678',
    customerInfo: {
      fullName: 'Jane Doe Customer',
      email: 'jane.doe@example.com',
      phone: '+977 9812345678',
    },
    books: [{ bookId: testBook._id.toString(), quantity: 2 }],
    shippingAddress: {
      fullName: 'Jane Doe Customer',
      email: 'jane.doe@example.com',
      phone: '+977 9812345678',
      street: '456 New Baneshwor, Ward 10',
      city: 'Kathmandu',
      state: 'Bagmati',
      postalCode: '44600',
    },
    orderNote: 'Please ring the doorbell upon arrival.',
    paymentMethod: 'cod',
  };

  const createRes = await fetch(`${BASE_URL}/api/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(validOrderPayload),
  });

  const createData = await createRes.json();
  console.log('Order Creation Response:', JSON.stringify(createData, null, 2));

  assert(createRes.status === 201, 'Order creation returns 201 Created');
  assert(createData.isSuccess === true, 'Order creation response indicates success');
  assert(createData.data !== undefined, 'Order data is present in response');

  const createdOrder = createData.data;
  assert(createdOrder.customerInfo?.fullName === 'Jane Doe Customer', 'customerInfo.fullName matches persisted value');
  assert(createdOrder.customerInfo?.email === 'jane.doe@example.com', 'customerInfo.email matches persisted value');
  assert(createdOrder.customerInfo?.phone === '+977 9812345678', 'customerInfo.phone matches persisted value');
  assert(createdOrder.shippingAddress?.fullName === 'Jane Doe Customer', 'shippingAddress.fullName matches persisted value');
  assert(createdOrder.shippingAddress?.phone === '+977 9812345678', 'shippingAddress.phone matches persisted value');

  // ----------------------------------------------------
  // TEST 2: Retrieve Order By ID & Verify Persisted Contact Info
  // ----------------------------------------------------
  console.log('\n--- 2. Fetching Order Details by ID ---');
  const fetchRes = await fetch(`${BASE_URL}/api/order/${createdOrder._id}`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });
  const fetchData = await fetchRes.json();
  assert(fetchRes.status === 200, 'Order retrieval by ID returns 200 OK');
  assert(fetchData.data.customerInfo?.fullName === 'Jane Doe Customer', 'Retrieved order includes customerInfo.fullName');
  assert(fetchData.data.customerInfo?.email === 'jane.doe@example.com', 'Retrieved order includes customerInfo.email');
  assert(fetchData.data.customerInfo?.phone === '+977 9812345678', 'Retrieved order includes customerInfo.phone');
  assert(fetchData.data.shippingAddress?.street === '456 New Baneshwor, Ward 10', 'Retrieved order includes street address');

  // ----------------------------------------------------
  // TEST 3: Admin Can Access Fulfillment Contact Info
  // ----------------------------------------------------
  console.log('\n--- 3. Admin Accessing Fulfillment Contact Info ---');
  const adminFetchRes = await fetch(`${BASE_URL}/api/order/${createdOrder._id}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const adminFetchData = await adminFetchRes.json();
  assert(adminFetchRes.status === 200, 'Admin can fetch order details');
  assert(adminFetchData.data.customerInfo?.fullName === 'Jane Doe Customer', 'Admin order details has customer fullName');
  assert(adminFetchData.data.customerInfo?.phone === '+977 9812345678', 'Admin order details has customer phone for fulfillment');

  // ----------------------------------------------------
  // TEST 4: Invalid Phone Number Rejected by Server (Fail Closed)
  // ----------------------------------------------------
  console.log('\n--- 4. Server-Side Phone Number Validation ---');
  const invalidPhonePayload = {
    fullName: 'Valid Name',
    email: 'valid@example.com',
    phone: '123', // Too short, invalid
    books: [{ bookId: testBook._id.toString(), quantity: 1 }],
  };

  const invalidPhoneRes = await fetch(`${BASE_URL}/api/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(invalidPhonePayload),
  });
  const invalidPhoneData = await invalidPhoneRes.json();
  console.log('Invalid Phone Response (400 expected):', invalidPhoneData);
  assert(invalidPhoneRes.status === 400, 'Server rejects invalid phone number with 400');
  assert(invalidPhoneData.errors?.phone !== undefined, 'Validation error mentions phone field');

  // ----------------------------------------------------
  // TEST 5: Invalid Email Format Rejected by Server
  // ----------------------------------------------------
  console.log('\n--- 5. Server-Side Email Format Validation ---');
  const invalidEmailPayload = {
    fullName: 'Valid Name',
    email: 'invalid-email-address',
    phone: '+977 9801234567',
    books: [{ bookId: testBook._id.toString(), quantity: 1 }],
  };

  const invalidEmailRes = await fetch(`${BASE_URL}/api/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(invalidEmailPayload),
  });
  const invalidEmailData = await invalidEmailRes.json();
  console.log('Invalid Email Response (400 expected):', invalidEmailData);
  assert(invalidEmailRes.status === 400, 'Server rejects invalid email format with 400');
  assert(invalidEmailData.errors?.email !== undefined, 'Validation error mentions email field');

  // ----------------------------------------------------
  // TEST 6: Backward Compatibility (Fallback to User Account when not supplied)
  // ----------------------------------------------------
  console.log('\n--- 6. Backward Compatibility with Legacy Order Payloads ---');
  const legacyPayload = {
    books: [{ bookId: testBook._id.toString(), quantity: 1 }],
    shippingAddress: 'Pokhara, Lakeside',
  };

  const legacyRes = await fetch(`${BASE_URL}/api/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(legacyPayload),
  });
  const legacyData = await legacyRes.json();
  assert(legacyRes.status === 201, 'Legacy order payload without explicit contact info succeeds');
  assert(legacyData.data.customerInfo?.fullName === testUser.username, 'Fallback automatically populates user username');
  assert(legacyData.data.customerInfo?.email === testUser.email, 'Fallback automatically populates user email');

  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} CHECKOUT CONTACT PERSISTENCE TESTS PASSED!`);
  console.log('==================================================');
}

runCheckoutContactTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
