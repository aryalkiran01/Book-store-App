import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:4000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/book_review_app_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_bookreviewapp_2025_secure';

async function runInventoryTests() {
  console.log('=== STARTING INVENTORY ATOMICITY & RACE CONDITION SUITE ===\n');

  await mongoose.connect(MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({ username: String, email: String, role: String }, { strict: false }));
  const Book = mongoose.model('Book', new mongoose.Schema({ title: String, author: String, genre: String, price: Number, stock: Number }, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, books: Array, totalAmount: Number, status: String }, { strict: false }));

  const testUser = await User.findOneAndUpdate(
    { email: 'inventory_test_user@example.com' },
    { username: 'InventoryTester', email: 'inventory_test_user@example.com', role: 'user' },
    { upsert: true, new: true }
  );
  const userToken = jwt.sign({ id: testUser._id.toString(), email: testUser.email, role: testUser.role }, JWT_SECRET, { expiresIn: '1h' });

  let totalTests = 0;
  let passedTests = 0;

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
  // TEST 1: Normal Purchase (Stock Decrements Correctly)
  // ----------------------------------------------------
  console.log('--- 1. Testing Normal Purchase (Stock Decrement) ---');
  const book1 = await Book.create({
    title: `Atomic Stock Book 1_${Date.now()}`,
    author: 'Stock Author',
    genre: 'Fiction',
    price: 300,
    stock: 10,
  });

  const res1 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      books: [{ bookId: book1._id.toString(), quantity: 2 }],
      shippingAddress: 'Kathmandu',
    }),
  });
  const data1 = await res1.json();
  const book1After = await Book.findById(book1._id);

  assert(res1.status === 201, `Order creation succeeded with 201 (actual: ${res1.status})`);
  assert(book1After.stock === 8, `Stock decreased from 10 to 8 (actual: ${book1After.stock})`);

  // ----------------------------------------------------
  // TEST 2: Quantity 0 (Must be rejected, stock unchanged)
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Quantity 0 Validation ---');
  const res2 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      books: [{ bookId: book1._id.toString(), quantity: 0 }],
      shippingAddress: 'Kathmandu',
    }),
  });
  const book1After2 = await Book.findById(book1._id);
  assert(res2.status >= 400, `Quantity 0 was rejected with HTTP 400 (actual: ${res2.status})`);
  assert(book1After2.stock === 8, `Stock remained unchanged at 8 (actual: ${book1After2.stock})`);

  // ----------------------------------------------------
  // TEST 3: Negative Quantity (Must be rejected, stock unchanged)
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Negative Quantity Validation ---');
  const res3 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      books: [{ bookId: book1._id.toString(), quantity: -5 }],
      shippingAddress: 'Kathmandu',
    }),
  });
  const book1After3 = await Book.findById(book1._id);
  assert(res3.status >= 400, `Negative quantity was rejected with HTTP 400 (actual: ${res3.status})`);
  assert(book1After3.stock === 8, `Stock remained unchanged at 8 (actual: ${book1After3.stock})`);

  // ----------------------------------------------------
  // TEST 4: Quantity Greater Than Available Stock
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Quantity Exceeding Available Stock ---');
  const res4 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      books: [{ bookId: book1._id.toString(), quantity: 100 }], // only 8 available
      shippingAddress: 'Kathmandu',
    }),
  });
  const book1After4 = await Book.findById(book1._id);
  assert(res4.status >= 400, `Excessive quantity rejected with HTTP 400 (actual: ${res4.status})`);
  assert(book1After4.stock === 8, `Stock remained unchanged at 8 (actual: ${book1After4.stock})`);

  // ----------------------------------------------------
  // TEST 5: Multi-Item Order with Partial Failure (Compensating Rollback)
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Multi-Item Order Partial Failure Rollback ---');
  const bookInStock = await Book.create({
    title: `In Stock Book_${Date.now()}`,
    author: 'Author A',
    genre: 'Fiction',
    price: 400,
    stock: 5,
  });

  const bookOutOfStock = await Book.create({
    title: `Out Of Stock Book_${Date.now()}`,
    author: 'Author B',
    genre: 'Fiction',
    price: 500,
    stock: 0,
  });

  const res5 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      books: [
        { bookId: bookInStock._id.toString(), quantity: 2 },
        { bookId: bookOutOfStock._id.toString(), quantity: 1 }, // will fail!
      ],
      shippingAddress: 'Kathmandu',
    }),
  });
  const inStockAfter = await Book.findById(bookInStock._id);
  const outOfStockAfter = await Book.findById(bookOutOfStock._id);

  assert(res5.status >= 400, `Multi-item order with out-of-stock item failed with HTTP 400 (actual: ${res5.status})`);
  assert(inStockAfter.stock === 5, `In-stock item was rolled back to initial stock 5 (actual: ${inStockAfter.stock})`);
  assert(outOfStockAfter.stock === 0, `Out-of-stock item remained at 0 (actual: ${outOfStockAfter.stock})`);

  // ----------------------------------------------------
  // TEST 6: High Concurrency Purchase Race Condition Test
  // ----------------------------------------------------
  console.log('\n--- 6. Testing High Concurrency Purchase (Race Condition Protection) ---');
  const limitedBook = await Book.create({
    title: `Limited Edition Book_${Date.now()}`,
    author: 'Limited Author',
    genre: 'Collector',
    price: 999,
    stock: 3, // Exactly 3 copies available
  });

  console.log(`Initial stock for '${limitedBook.title}': 3`);
  console.log(`Firing 10 simultaneous purchase requests (1 copy each)...`);

  // Launch 10 simultaneous purchase attempts
  const concurrentRequests = Array.from({ length: 10 }).map((_, index) =>
    fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        books: [{ bookId: limitedBook._id.toString(), quantity: 1 }],
        shippingAddress: `Address ${index + 1}`,
      }),
    }).then(async (r) => ({ status: r.status, data: await r.json() }))
  );

  const results = await Promise.all(concurrentRequests);
  const successCount = results.filter((r) => r.status === 201).length;
  const failureCount = results.filter((r) => r.status >= 400).length;

  const finalLimitedBook = await Book.findById(limitedBook._id);

  console.log(`Results: ${successCount} orders succeeded, ${failureCount} orders failed due to out-of-stock.`);
  console.log(`Final stock in MongoDB: ${finalLimitedBook.stock}`);

  assert(successCount === 3, `Exactly 3 orders succeeded (actual: ${successCount})`);
  assert(failureCount === 7, `Exactly 7 orders failed due to insufficient stock (actual: ${failureCount})`);
  assert(finalLimitedBook.stock === 0, `Final stock is exactly 0 and NEVER negative (actual: ${finalLimitedBook.stock})`);

  // Clean up created test books & users
  await Book.deleteMany({ _id: { $in: [book1._id, bookInStock._id, bookOutOfStock._id, limitedBook._id] } });
  await User.deleteOne({ _id: testUser._id });

  await mongoose.disconnect();
  console.log(`\n=== ALL ${passedTests}/${totalTests} INVENTORY CONCURRENCY TESTS PASSED! ===`);
}

runInventoryTests().catch((err) => {
  console.error('\n❌ Inventory test failed:', err);
  process.exit(1);
});
