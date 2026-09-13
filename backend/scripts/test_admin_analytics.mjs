import fetch from 'node-fetch';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:4000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/book_review_app_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_bookreviewapp_2025_secure';

async function runAdminAnalyticsTests() {
  console.log('==================================================');
  console.log('📊 ADMIN ANALYTICS & REVIEW SEARCH AUDIT SUITE');
  console.log('==================================================\n');

  await mongoose.connect(MONGO_URI);
  const User = mongoose.model(
    'UserAnalyticsTest',
    new mongoose.Schema({ username: String, email: String, role: String }, { strict: false }),
    'users'
  );
  const Book = mongoose.model(
    'BookAnalyticsTest',
    new mongoose.Schema({ title: String, author: String, genre: String, price: Number, stock: Number, averageRating: Number, totalReviews: Number }, { strict: false }),
    'books'
  );
  const Review = mongoose.model(
    'ReviewAnalyticsTest',
    new mongoose.Schema({ bookId: mongoose.Schema.Types.ObjectId, userId: mongoose.Schema.Types.ObjectId, username: String, rating: Number, reviewText: String, title: String, status: String }, { strict: false }),
    'reviews'
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

  // Create test admin
  const adminUser = await User.findOneAndUpdate(
    { email: 'analytics_admin@example.com' },
    { username: 'AnalyticsAdmin', email: 'analytics_admin@example.com', role: 'admin' },
    { upsert: true, new: true }
  );
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), username: adminUser.username, email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ----------------------------------------------------
  // TEST 1: Author Analytics Calculates avgRating from averageRating (Not null/0)
  // ----------------------------------------------------
  console.log('--- 1. Testing Author Analytics & Average Rating Computation ---');
  const targetAuthor = `Author_Analytics_${Date.now()}`;
  
  const bookA = await Book.create({
    title: `Analytics Book A_${Date.now()}`,
    author: targetAuthor,
    genre: 'Economics',
    price: 400,
    stock: 25,
    averageRating: 4.6,
    totalReviews: 12,
  });

  const bookB = await Book.create({
    title: `Analytics Book B_${Date.now()}`,
    author: targetAuthor,
    genre: 'Philosophy',
    price: 600,
    stock: 15,
    averageRating: 3.4,
    totalReviews: 8,
  });

  const authorsRes = await fetch(`${BASE_URL}/api/admin/authors`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const authorsData = await authorsRes.json();
  console.log('Authors Response Status:', authorsRes.status);
  assert(authorsRes.status === 200, 'GET /api/admin/authors returns 200 OK');
  assert(authorsData.isSuccess === true, 'Authors response indicates success');
  assert(Array.isArray(authorsData.data), 'Authors data is an array');

  const authorRecord = authorsData.data.find((a) => a.author === targetAuthor);
  assert(Boolean(authorRecord), `Target author '${targetAuthor}' found in authors analytics`);
  assert(authorRecord.bookCount === 2, `Author bookCount is 2 (actual: ${authorRecord?.bookCount})`);
  assert(authorRecord.totalStock === 40, `Author totalStock is 40 (actual: ${authorRecord?.totalStock})`);
  // Expected average of 4.6 and 3.4 = 4.0
  console.log(`Computed avgRating for ${targetAuthor}:`, authorRecord?.avgRating);
  assert(authorRecord.avgRating === 4.0, `Author avgRating correctly computed as 4.0 from averageRating (actual: ${authorRecord?.avgRating})`);

  // ----------------------------------------------------
  // TEST 2: Review Search Matches reviewText Field
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Review Search by reviewText Field ---');
  const uniqueKeyword = `QuantumInsight_${Date.now()}`;
  const testReview = await Review.create({
    bookId: bookA._id,
    userId: adminUser._id,
    username: 'QuantumReviewer',
    rating: 5,
    title: 'Fascinating Read',
    reviewText: `This book provides a ${uniqueKeyword} into behavioral finance that changed my thinking.`,
    status: 'published',
  });

  // Search by unique keyword
  const searchReviewRes = await fetch(`${BASE_URL}/api/admin/reviews?search=${uniqueKeyword}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const searchReviewData = await searchReviewRes.json();
  console.log('Search Reviews Status:', searchReviewRes.status);
  console.log('Search Reviews Data:', JSON.stringify(searchReviewData, null, 2));

  assert(searchReviewRes.status === 200, 'GET /api/admin/reviews?search=... returns 200 OK');
  assert(searchReviewData.isSuccess === true, 'Search reviews response indicates isSuccess: true');
  assert(searchReviewData.data.length >= 1, `Review containing '${uniqueKeyword}' was found in search results`);
  
  const foundReview = searchReviewData.data.find((r) => r._id.toString() === testReview._id.toString());
  assert(Boolean(foundReview), 'Specific created review was matched by reviewText search');
  assert(foundReview.reviewText.includes(uniqueKeyword), 'Matched review contains the searched reviewText');

  // Search by non-existent term
  const noMatchRes = await fetch(`${BASE_URL}/api/admin/reviews?search=NonExistentKeywordXYZ999`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const noMatchData = await noMatchRes.json();
  assert(noMatchData.data.length === 0, 'Search for non-existent keyword correctly returns 0 reviews');

  // ----------------------------------------------------
  // TEST 3: Admin Categories Analytics & KPI Metrics
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Categories Analytics & Dashboard KPI Metrics ---');
  const categoriesRes = await fetch(`${BASE_URL}/api/admin/categories`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const categoriesData = await categoriesRes.json();
  assert(categoriesRes.status === 200, 'GET /api/admin/categories returns 200 OK');
  assert(categoriesData.isSuccess === true && Array.isArray(categoriesData.data), 'Categories data is valid array');
  const econCat = categoriesData.data.find((c) => c.genre === 'Economics');
  assert(Boolean(econCat) && econCat.bookCount >= 1, 'Economics category found in category analytics');

  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsData = await statsRes.json();
  assert(statsRes.status === 200, 'GET /api/admin/stats returns 200 OK');
  assert(statsData.data.metrics.totalBooks > 0, 'Metrics report valid totalBooks count');
  assert(statsData.data.orderStatusBreakdown !== undefined, 'orderStatusBreakdown is present');

  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} ADMIN ANALYTICS AUDIT TESTS PASSED!`);
  console.log('==================================================');
}

runAdminAnalyticsTests().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
