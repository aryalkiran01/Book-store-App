import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("Reviews & Moderation Suite", async (t) => {
  let user1;
  let user2;
  let adminUser;
  let testBook;
  let reviewId;

  t.before(async () => {
    user1 = await createRegularUserClient();
    user2 = await createRegularUserClient();
    adminUser = await createAdminClient();
    testBook = await createTestBook({ price: 400, stock: 10 });
  });

  t.after(async () => {
    await closeDB();
  });

  await t.test("1. User creates a review for a book", async () => {
    const res = await makeAuthRequest(`/api/reviews/${testBook._id}`, {
      method: "POST",
      cookie: user1.cookie,
      body: {
        rating: 5,
        reviewText: "An exquisite exploration of character and depth!",
        title: "Masterpiece",
      },
    });

    assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert.equal(res.data.isSuccess, true);
    assert.equal(res.data.data.rating, 5);
    assert.equal(res.data.data.title, "Masterpiece");
    reviewId = res.data.data._id;
  });

  await t.test("2. Duplicate review by same user updates existing review (Upsert pattern)", async () => {
    const res = await makeAuthRequest(`/api/reviews/${testBook._id}`, {
      method: "POST",
      cookie: user1.cookie,
      body: {
        rating: 4,
        reviewText: "Updated: Still fantastic on a second read.",
        title: "Revised Opinion",
      },
    });

    assert.ok(res.status === 200 || res.status === 201);
    assert.equal(res.data.data._id, reviewId, "Should update the same review ID");
    assert.equal(res.data.data.rating, 4);
    assert.equal(res.data.data.title, "Revised Opinion");
  });

  await t.test("3. User can edit their own review", async () => {
    const res = await makeAuthRequest(`/api/reviews/${reviewId}`, {
      method: "PUT",
      cookie: user1.cookie,
      body: {
        rating: 5,
        reviewText: "Final updated review text with profound appreciation.",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.data.rating, 5);
  });

  await t.test("4. Normal user cannot edit another user's review (403 Forbidden)", async () => {
    const res = await makeAuthRequest(`/api/reviews/${reviewId}`, {
      method: "PUT",
      cookie: user2.cookie,
      body: {
        rating: 1,
        reviewText: "Malicious modification attempt.",
      },
    });

    assert.equal(res.status, 403, "Expected 403 Forbidden");
    assert.equal(res.data.isSuccess, false);
  });

  await t.test("5. Normal user cannot delete another user's review (403 Forbidden)", async () => {
    const res = await makeAuthRequest(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      cookie: user2.cookie,
    });

    assert.equal(res.status, 403, "Expected 403 Forbidden");
  });

  await t.test("6. Admin can moderate and delete any user's review (200 OK)", async () => {
    const res = await makeAuthRequest(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      cookie: adminUser.cookie,
    });

    assert.equal(res.status, 200, "Admin should be permitted to delete review");
    assert.equal(res.data.isSuccess, true);
  });
});
