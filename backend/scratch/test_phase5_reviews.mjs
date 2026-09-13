import assert from "node:assert";

const BASE_URL = "http://localhost:4000/api";

async function runTests() {
  console.log("=== PHASE 5: BOOK REVIEW + RATING SYSTEM AUTOMATED TESTS ===");

  const timestamp = Date.now();

  // 1. Authenticate Admin
  console.log("\n[1] Authenticating Admin user...");
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@bookstore.com",
      password: "admin123",
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.accessToken || adminLoginData.data?.token;
  assert(adminToken, "Admin token required");
  const adminHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  };
  console.log("-> Admin authenticated.");

  // 2. Register & Authenticate User 1 (Reviewer A) and User 2 (Reviewer B)
  console.log("\n[2] Registering and authenticating Reviewer A and Reviewer B...");
  const user1Email = `reviewer_a_${timestamp}@example.com`;
  const user1Username = `ReviewerA_${timestamp}`;
  const user2Email = `reviewer_b_${timestamp}@example.com`;
  const user2Username = `ReviewerB_${timestamp}`;
  const testPassword = "Password123!";

  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user1Username,
      email: user1Email,
      password: testPassword,
    }),
  });

  const u1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user1Email, password: testPassword }),
  });
  const u1LoginData = await u1LoginRes.json();
  const u1Token = u1LoginData.data?.accessToken || u1LoginData.data?.token;
  const u1Headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${u1Token}`,
  };

  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user2Username,
      email: user2Email,
      password: testPassword,
    }),
  });

  const u2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user2Email, password: testPassword }),
  });
  const u2LoginData = await u2LoginRes.json();
  const u2Token = u2LoginData.data?.accessToken || u2LoginData.data?.token;
  const u2Headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${u2Token}`,
  };
  console.log("-> Reviewer A and Reviewer B authenticated.");

  // 3. Create a Test Book for this suite
  console.log("\n[3] Creating a dedicated book for review testing...");
  const bookRes = await fetch(`${BASE_URL}/books`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      title: `The Review System Benchmark ${timestamp}`,
      author: "Test Author",
      genre: "Literature",
      description: "A testing ground book for reviews.",
      price: 25.0,
      stock: 50,
    }),
  });
  const bookData = await bookRes.json();
  assert.strictEqual(bookRes.status, 201);
  const testBookId = bookData.data._id;
  console.log(`-> Created book: ID ${testBookId}`);

  // 4. Test Rating Validation
  console.log("\n[4] Testing Rating Validation (rejecting invalid ratings)...");
  const invalidRes1 = await fetch(`${BASE_URL}/reviews/addReview/${testBookId}`, {
    method: "POST",
    headers: u1Headers,
    body: JSON.stringify({ rating: 6, reviewText: "Too high rating" }),
  });
  assert.strictEqual(invalidRes1.status, 400, "Rating > 5 should be rejected");

  const invalidRes2 = await fetch(`${BASE_URL}/reviews/addReview/${testBookId}`, {
    method: "POST",
    headers: u1Headers,
    body: JSON.stringify({ rating: 0, reviewText: "Too low rating" }),
  });
  assert.strictEqual(invalidRes2.status, 400, "Rating < 1 should be rejected");
  console.log("-> Rating bounds validation (1 to 5) verified.");

  // 5. Test Verified Purchase Detection
  console.log("\n[5] Testing Verified Purchase Detection...");
  // Reviewer A purchases the book first
  const orderRes = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: u1Headers,
    body: JSON.stringify({
      books: [{ bookId: testBookId, quantity: 1, price: 25.0 }],
      totalAmount: 25.0,
      shippingAddress: { fullName: "Reviewer A", city: "Kathmandu" },
      paymentMethod: "cod",
    }),
  });
  assert.strictEqual(orderRes.status, 201, "Order placement should succeed");

  // Reviewer A posts a review -> should have isVerifiedPurchase: true
  const revARes = await fetch(`${BASE_URL}/reviews/addReview/${testBookId}`, {
    method: "POST",
    headers: u1Headers,
    body: JSON.stringify({
      rating: 5,
      title: "Phenomenal Read!",
      reviewText: "I bought this book and read it in one sitting. Absolutely captivating!",
    }),
  });
  const revAData = await revARes.json();
  assert.strictEqual(revARes.status, 201);
  assert.strictEqual(revAData.data.isVerifiedPurchase, true, "Reviewer A should be verified purchaser");
  const reviewAId = revAData.data._id;
  console.log("-> Verified Purchase badge confirmed for buyer.");

  // Reviewer B (has not purchased) posts a review -> should have isVerifiedPurchase: false
  const revBRes = await fetch(`${BASE_URL}/reviews/addReview/${testBookId}`, {
    method: "POST",
    headers: u2Headers,
    body: JSON.stringify({
      rating: 3,
      title: "Decent concept",
      reviewText: "Interesting premise but pacing was slow in the middle chapters.",
    }),
  });
  const revBData = await revBRes.json();
  assert.strictEqual(revBRes.status, 201);
  assert.strictEqual(revBData.data.isVerifiedPurchase, false, "Reviewer B should NOT be verified purchaser");
  const reviewBId = revBData.data._id;
  console.log("-> Non-purchaser review verified without verified badge.");

  // 6. Test Rating Distribution & Average Rating Calculation
  console.log("\n[6] Testing Rating Distribution & Dynamic Average Calculation...");
  const reviewsListRes = await fetch(`${BASE_URL}/reviews/${testBookId}`);
  const reviewsListData = await reviewsListRes.json();
  assert.strictEqual(reviewsListRes.status, 200);
  assert.strictEqual(reviewsListData.data.length, 2);
  assert.strictEqual(reviewsListData.stats.totalReviews, 2);
  assert.strictEqual(reviewsListData.stats.averageRating, 4.0); // (5 + 3) / 2 = 4.0
  assert.strictEqual(reviewsListData.stats.verifiedReviewsCount, 1);
  assert.strictEqual(reviewsListData.stats.ratingDistribution[5].count, 1);
  assert.strictEqual(reviewsListData.stats.ratingDistribution[5].percentage, 50);
  assert.strictEqual(reviewsListData.stats.ratingDistribution[3].count, 1);
  assert.strictEqual(reviewsListData.stats.ratingDistribution[3].percentage, 50);

  // Check updated BookModel
  const bookCheckRes = await fetch(`${BASE_URL}/books/${testBookId}`);
  const bookCheckData = await bookCheckRes.json();
  const bookObj = bookCheckData.data.result || bookCheckData.data;
  assert.strictEqual(bookObj.averageRating, 4.0);
  assert.strictEqual(bookObj.totalReviews, 2);
  console.log("-> Rating aggregation and 5-to-1 star distribution verified.");

  // 7. Test Editing Review & Authorization
  console.log("\n[7] Testing Edit Review and Ownership Authorization...");
  // Reviewer B tries to edit Reviewer A's review -> Must get 403 Forbidden
  const tamperRes = await fetch(`${BASE_URL}/reviews/updateReview/${reviewAId}`, {
    method: "PUT",
    headers: u2Headers,
    body: JSON.stringify({ reviewText: "Maliciously edited text", rating: 1 }),
  });
  assert.strictEqual(tamperRes.status, 403, "Reviewer B cannot edit Reviewer A's review");

  // Reviewer A updates their own review
  const editRes = await fetch(`${BASE_URL}/reviews/updateReview/${reviewAId}`, {
    method: "PUT",
    headers: u1Headers,
    body: JSON.stringify({
      rating: 4,
      title: "Updated: Solid 4 Stars!",
      reviewText: "Re-read the ending and slightly adjusted my score to 4 stars.",
    }),
  });
  const editData = await editRes.json();
  assert.strictEqual(editRes.status, 200);
  assert.strictEqual(editData.data.rating, 4);

  // Verify new average: (4 + 3) / 2 = 3.5
  const updatedBookRes = await fetch(`${BASE_URL}/books/${testBookId}`);
  const updatedBookData = await updatedBookRes.json();
  const updatedBookObj = updatedBookData.data.result || updatedBookData.data;
  assert.strictEqual(updatedBookObj.averageRating, 3.5);
  console.log("-> Review editing and re-aggregation verified.");

  // 8. Test Helpful Voting
  console.log("\n[8] Testing Helpful Voting...");
  // Reviewer A cannot vote on own review
  const selfVoteRes = await fetch(`${BASE_URL}/reviews/${reviewAId}/helpful`, {
    method: "POST",
    headers: u1Headers,
  });
  assert.strictEqual(selfVoteRes.status, 400, "User cannot vote own review as helpful");

  // Reviewer B votes Reviewer A's review as helpful
  const voteRes = await fetch(`${BASE_URL}/reviews/${reviewAId}/helpful`, {
    method: "POST",
    headers: u2Headers,
  });
  const voteData = await voteRes.json();
  assert.strictEqual(voteRes.status, 200);
  assert.strictEqual(voteData.data.helpfulCount, 1);
  assert.strictEqual(voteData.data.hasVotedHelpful, true);

  // Reviewer B toggles off
  const unvoteRes = await fetch(`${BASE_URL}/reviews/${reviewAId}/helpful`, {
    method: "POST",
    headers: u2Headers,
  });
  const unvoteData = await unvoteRes.json();
  assert.strictEqual(unvoteData.data.helpfulCount, 0);
  assert.strictEqual(unvoteData.data.hasVotedHelpful, false);

  // Turn back on for sorting test
  await fetch(`${BASE_URL}/reviews/${reviewAId}/helpful`, {
    method: "POST",
    headers: u2Headers,
  });
  console.log("-> Helpful voting toggling verified.");

  // 9. Test Review Sorting and Filtering
  console.log("\n[9] Testing Review Sorting & Filtering...");
  // Sort by most-helpful
  const sortHelpfulRes = await fetch(`${BASE_URL}/reviews/${testBookId}?sortBy=most-helpful`);
  const sortHelpfulData = await sortHelpfulRes.json();
  assert.strictEqual(sortHelpfulData.data[0]._id, reviewAId, "Review A (1 helpful vote) should be first");

  // Filter by verified purchases only
  const verifiedRes = await fetch(`${BASE_URL}/reviews/${testBookId}?verifiedOnly=true`);
  const verifiedData = await verifiedRes.json();
  assert.strictEqual(verifiedData.data.length, 1);
  assert.strictEqual(verifiedData.data[0]._id, reviewAId);

  // Filter by star rating
  const filterRatingRes = await fetch(`${BASE_URL}/reviews/${testBookId}?ratingFilter=3`);
  const filterRatingData = await filterRatingRes.json();
  assert.strictEqual(filterRatingData.data.length, 1);
  assert.strictEqual(filterRatingData.data[0]._id, reviewBId);
  console.log("-> Sorting and filtering queries verified.");

  // 10. Test Reporting & Moderation
  console.log("\n[10] Testing Review Reporting and Admin Moderation...");
  const reportRes = await fetch(`${BASE_URL}/reviews/${reviewBId}/report`, {
    method: "POST",
    headers: u1Headers,
    body: JSON.stringify({ reason: "Inappropriate language or spam" }),
  });
  const reportData = await reportRes.json();
  assert.strictEqual(reportRes.status, 200);

  // Admin moderates (hides) Review B
  const hideRes = await fetch(`${BASE_URL}/reviews/${reviewBId}/moderate`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "hidden" }),
  });
  assert.strictEqual(hideRes.status, 200);

  // Public reviews list should no longer include hidden review B
  const publicListRes = await fetch(`${BASE_URL}/reviews/${testBookId}`);
  const publicListData = await publicListRes.json();
  assert.strictEqual(publicListData.data.length, 1);
  assert.strictEqual(publicListData.data[0]._id, reviewAId);
  console.log("-> Review reporting and admin moderation verified.");

  // 11. Test Deletion & Authorization
  console.log("\n[11] Testing Review Deletion and Authorization...");
  // Reviewer B tries to delete Reviewer A's review -> 403 Forbidden
  const delForbiddenRes = await fetch(`${BASE_URL}/reviews/deleteReview/${reviewAId}`, {
    method: "DELETE",
    headers: u2Headers,
  });
  assert.strictEqual(delForbiddenRes.status, 403, "Cannot delete another user's review");

  // Reviewer A deletes their own review
  const delRes = await fetch(`${BASE_URL}/reviews/deleteReview/${reviewAId}`, {
    method: "DELETE",
    headers: u1Headers,
  });
  assert.strictEqual(delRes.status, 200, "Owner can delete review");

  // Book average should revert back to 0
  const finalBookRes = await fetch(`${BASE_URL}/books/${testBookId}`);
  const finalBookData = await finalBookRes.json();
  const finalBookObj = finalBookData.data.result || finalBookData.data;
  assert.strictEqual(finalBookObj.averageRating, 0);
  assert.strictEqual(finalBookObj.totalReviews, 0);
  console.log("-> Review deletion and rating reset verified.");

  console.log("\n==========================================");
  console.log("🎉 ALL 11/11 PHASE 5 REVIEW TESTS PASSED!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("❌ Phase 5 Test Failed:", err);
  process.exit(1);
});
