import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegularUserClient,
  createAdminClient,
  createTestBook,
  makeAuthRequest,
  closeDB,
} from "./test_helpers.mjs";

test("Admin Capabilities & Operations Suite", async (t) => {
  let user;
  let adminUser;
  let testBook;
  let createdBookId;
  let testOrder;

  t.before(async () => {
    user = await createRegularUserClient();
    adminUser = await createAdminClient();
    testBook = await createTestBook({ price: 350, stock: 8 });

    // User creates an order
    const orderRes = await makeAuthRequest("/api/orders", {
      method: "POST",
      cookie: user.cookie,
      body: {
        books: [{ bookId: testBook._id.toString(), quantity: 1 }],
        paymentMethod: "cod",
        customerInfo: {
          fullName: "Order Admin Customer",
          email: user.email,
          phone: "+977 9812345678",
        },
        shippingAddress: {
          street: "888 Admin Way",
          city: "Kathmandu",
          state: "Bagmati",
          postalCode: "44600",
        },
      },
    });
    assert.equal(orderRes.status, 201);
    testOrder = orderRes.data.data;
  });

  t.after(async () => {
    await closeDB();
  });

  await t.test("1. Admin can access platform analytics & KPI statistics", async () => {
    const res = await makeAuthRequest("/api/admin/stats", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.isSuccess, true);
    assert.ok(res.data.data.metrics, "Metrics must be present");
  });

  await t.test("2. Admin can create a new book in the catalog", async () => {
    const ts = Date.now();
    const res = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: `Admin Created Masterpiece ${ts}`,
        author: "Acclaimed Author",
        description: "An exceptional new arrival created via admin suite.",
        genre: "Non-Fiction",
        price: 850,
        stock: 25,
        discountPercentage: 5,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
      },
    });

    assert.equal(res.status, 201, "Expected 201 on book creation");
    assert.equal(res.data.isSuccess, true);
    assert.ok(res.data.data._id);
    createdBookId = res.data.data._id;
  });

  await t.test("3. Non-admin cannot create a new book in the catalog (403 Forbidden)", async () => {
    const res = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: user.cookie,
      body: {
        title: "Unauthorized Book Creation",
        author: "Nobody",
        description: "Should fail.",
        genre: "Fiction",
        price: 100,
        stock: 1,
      },
    });

    assert.equal(res.status, 403, "Non-admin must be forbidden from creating books");
  });

  await t.test("4. Admin can update book details and inventory stock", async () => {
    const res = await makeAuthRequest(`/api/books/${createdBookId}`, {
      method: "PUT",
      cookie: adminUser.cookie,
      body: {
        price: 900,
        stock: 30,
        discountPercentage: 10,
      },
    });

    assert.equal(res.status, 200, "Expected 200 on book update");
    assert.equal(res.data.isSuccess, true);
    assert.equal(res.data.data.price, 900);
    assert.equal(res.data.data.stock, 30);
  });

  await t.test("5. Admin can list all orders across users", async () => {
    const res = await makeAuthRequest("/api/admin/orders", {
      method: "GET",
      cookie: adminUser.cookie,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.isSuccess, true);
    assert.ok(Array.isArray(res.data.data.orders || res.data.data));
  });

  await t.test("6. Admin can update order status following valid lifecycle (pending -> confirmed -> processing)", async () => {
    const orderId = testOrder.orderId || testOrder._id;
    
    // Step 1: Confirm order
    const confirmRes = await makeAuthRequest(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      cookie: adminUser.cookie,
      body: {
        status: "confirmed",
        note: "Order confirmed by sales team",
      },
    });

    assert.equal(confirmRes.status, 200, "Admin should successfully confirm order");
    assert.equal(confirmRes.data.isSuccess, true);
    assert.equal(confirmRes.data.data.status, "confirmed");

    // Step 2: Processing order
    const processRes = await makeAuthRequest(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      cookie: adminUser.cookie,
      body: {
        status: "processing",
        note: "Order packaged by warehouse staff",
      },
    });

    assert.equal(processRes.status, 200, "Admin should successfully transition to processing");
    assert.equal(processRes.data.isSuccess, true);
    assert.equal(processRes.data.data.status, "processing");
  });

  await t.test("7. Admin can delete a book from the catalog", async () => {
    const res = await makeAuthRequest(`/api/books/${createdBookId}`, {
      method: "DELETE",
      cookie: adminUser.cookie,
    });

    assert.equal(res.status, 200, "Expected 200 on book deletion");
    assert.equal(res.data.isSuccess, true);

    // Verify book is no longer in catalog
    const fetchRes = await makeAuthRequest(`/api/books/${createdBookId}`);
    assert.equal(fetchRes.status, 404, "Deleted book should return 404");
  });

  await t.test("8. Admin Open Library search requires admin and handles query safely", async () => {
    // Non-admin rejected
    const nonAdminRes = await makeAuthRequest("/api/admin/open-library/search?q=tolkien", {
      method: "GET",
      cookie: user.cookie,
    });
    assert.equal(nonAdminRes.status, 403, "Non-admin must be forbidden from Open Library search");

    // Admin without query returns empty result safely
    const emptyQueryRes = await makeAuthRequest("/api/admin/open-library/search", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(emptyQueryRes.status, 200, "Empty query should return 200 with empty list");
    assert.equal(emptyQueryRes.data.isSuccess, true);
    assert.equal(emptyQueryRes.data.data.length, 0);

    // Admin with query succeeds (returns array of books or empty array if network unavailable)
    const adminRes = await makeAuthRequest("/api/admin/open-library/search?q=javascript", {
      method: "GET",
      cookie: adminUser.cookie,
    });
    assert.equal(adminRes.status, 200, "Admin search should return 200");
    assert.equal(adminRes.data.isSuccess, true);
    assert.ok(Array.isArray(adminRes.data.data), "Should return array of books");
  });

  await t.test("9. Admin can import an Open Library book into MongoDB with custom NPR price and stock", async () => {
    const testIsbn = "978" + Date.now().toString().slice(-10);
    const testOlid = "OL" + Date.now().toString().slice(-7) + "W";

    const importPayload = {
      title: "Test Ingested Masterpiece " + Date.now(),
      author: "Ingestion Test Author",
      genre: "Technology",
      isbn: testIsbn,
      openLibraryId: testOlid,
      price: 1250,
      stock: 30,
      discountPercentage: 10,
      publisher: "Prentice Hall",
      publicationDate: "2008",
      pages: 464,
      language: "English",
    };

    const importRes = await makeAuthRequest("/api/admin/open-library/import", {
      method: "POST",
      cookie: adminUser.cookie,
      body: importPayload,
    });

    assert.equal(importRes.status, 201, "Expected 201 Created on new book import");
    assert.equal(importRes.data.isSuccess, true);
    assert.equal(importRes.data.isNew, true);
    assert.equal(importRes.data.data.price, 1250);
    assert.equal(importRes.data.data.stock, 30);
    assert.equal(importRes.data.data.isbn, testIsbn);

    // Clean up created book
    if (importRes.data.data._id) {
      await makeAuthRequest(`/api/books/${importRes.data.data._id}`, {
        method: "DELETE",
        cookie: adminUser.cookie,
      });
    }
  });

  await t.test("10. Duplicate import attempts are detected and prevent duplicate book creation in MongoDB", async () => {
    const ts = Date.now();
    const uniqueTitle = "Duplicate Guard Test " + ts;
    const importPayload = {
      title: uniqueTitle,
      author: "Guard Author",
      genre: "Fiction",
      isbn: "978" + String(ts).slice(-10),
      openLibraryId: "OL" + ts + "W",
      price: 799,
      stock: 20,
    };

    // First import
    const firstRes = await makeAuthRequest("/api/admin/open-library/import", {
      method: "POST",
      cookie: adminUser.cookie,
      body: importPayload,
    });
    assert.equal(firstRes.status, 201, "First import should succeed with 201");
    assert.equal(firstRes.data.isNew, true);

    const firstBookId = firstRes.data.data._id;

    // Second import with duplicate title / ISBN
    const secondRes = await makeAuthRequest("/api/admin/open-library/import", {
      method: "POST",
      cookie: adminUser.cookie,
      body: importPayload,
    });
    assert.equal(secondRes.status, 200, "Duplicate import should return 200 without creating a new record");
    assert.equal(secondRes.data.isNew, false);
    assert.equal(secondRes.data.data._id, firstBookId, "Should return reference to the existing book document");

    // Clean up
    if (firstBookId) {
      await makeAuthRequest(`/api/books/${firstBookId}`, {
        method: "DELETE",
        cookie: adminUser.cookie,
      });
    }
  });

  await t.test("11. Same title + DIFFERENT author is ALLOWED (Non-restrictive title uniqueness)", async () => {
    const sharedTitle = "Selected Poems Collection " + Date.now();

    // Book by Author A
    const bookARes = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: sharedTitle,
        author: "Author A - Classic Poet",
        genre: "Poetry",
        price: 450,
        stock: 15,
      },
    });
    assert.equal(bookARes.status, 201, "Author A book creation should succeed with 201");
    assert.equal(bookARes.data.isSuccess, true);
    const bookAId = bookARes.data.data._id;

    // Book by Author B with SAME title
    const bookBRes = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: sharedTitle,
        author: "Author B - Modern Bard",
        genre: "Poetry",
        price: 550,
        stock: 20,
      },
    });
    assert.equal(bookBRes.status, 201, "Author B book creation with SAME title must be ALLOWED with 201");
    assert.equal(bookBRes.data.isSuccess, true);
    const bookBId = bookBRes.data.data._id;

    assert.notEqual(bookAId, bookBId, "Both books must have distinct IDs in database");

    // Clean up
    await makeAuthRequest(`/api/books/${bookAId}`, { method: "DELETE", cookie: adminUser.cookie });
    await makeAuthRequest(`/api/books/${bookBId}`, { method: "DELETE", cookie: adminUser.cookie });
  });

  await t.test("12. Same title + SAME author is REJECTED as duplicate (409 Conflict)", async () => {
    const duplicateTitle = "Duplicate Title Author Check " + Date.now();
    const authorName = "Specific Identical Author";

    const firstRes = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: duplicateTitle,
        author: authorName,
        genre: "Fiction",
        price: 600,
        stock: 10,
      },
    });
    assert.equal(firstRes.status, 201);
    const firstId = firstRes.data.data._id;

    // Second creation attempt with identical title AND author
    const secondRes = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: duplicateTitle,
        author: authorName,
        genre: "Fiction",
        price: 600,
        stock: 10,
      },
    });
    assert.equal(secondRes.status, 409, "Duplicate title + author must be rejected with 409 Conflict");
    assert.equal(secondRes.data.isSuccess, false);

    // Clean up
    await makeAuthRequest(`/api/books/${firstId}`, { method: "DELETE", cookie: adminUser.cookie });
  });

  await t.test("13. Same ISBN is REJECTED as duplicate (409 Conflict)", async () => {
    const sharedIsbn = "9789999" + Math.floor(100000 + Math.random() * 900000);

    const firstRes = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: "ISBN Primary Book " + Date.now(),
        author: "ISBN Author 1",
        isbn: sharedIsbn,
        genre: "Non-Fiction",
        price: 750,
        stock: 10,
      },
    });
    assert.equal(firstRes.status, 201);
    const firstId = firstRes.data.data._id;

    // Second book with DIFFERENT title and author but SAME ISBN
    const secondRes = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: "ISBN Conflicting Book " + Date.now(),
        author: "ISBN Author 2",
        isbn: sharedIsbn,
        genre: "Non-Fiction",
        price: 850,
        stock: 10,
      },
    });
    assert.equal(secondRes.status, 409, "Duplicate ISBN must be rejected with 409 Conflict");
    assert.equal(secondRes.data.isSuccess, false);

    // Clean up
    await makeAuthRequest(`/api/books/${firstId}`, { method: "DELETE", cookie: adminUser.cookie });
  });

  await t.test("14. Same Open Library ID is detected and prevented from duplicate import", async () => {
    const sharedOlid = "OL" + Math.floor(100000 + Math.random() * 900000) + "M";

    const firstImport = await makeAuthRequest("/api/admin/open-library/import", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: "OLID Initial Import " + Date.now(),
        author: "OLID Author 1",
        openLibraryId: sharedOlid,
        genre: "Classics",
        price: 650,
        stock: 12,
      },
    });
    assert.equal(firstImport.status, 201);
    const firstId = firstImport.data.data._id;

    // Attempt second import with same OLID
    const secondImport = await makeAuthRequest("/api/admin/open-library/import", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: "OLID Re-import Title " + Date.now(),
        author: "OLID Author 2",
        openLibraryId: sharedOlid,
        genre: "Classics",
        price: 700,
        stock: 15,
      },
    });
    assert.equal(secondImport.status, 200, "Should return existing book on duplicate OLID");
    assert.equal(secondImport.data.isNew, false);
    assert.equal(secondImport.data.data._id, firstId);

    // Clean up
    await makeAuthRequest(`/api/books/${firstId}`, { method: "DELETE", cookie: adminUser.cookie });
  });

  await t.test("15. Multiple books WITHOUT ISBN (empty ISBN) can be created and imported without conflict", async () => {
    const ts = Date.now();

    // Book 1 without ISBN
    const book1Res = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: `Indie Self-Published Volume 1 ${ts}`,
        author: `Independent Author A ${ts}`,
        genre: "Memoir",
        price: 350,
        stock: 20,
        isbn: "", // No ISBN
      },
    });
    assert.equal(book1Res.status, 201, "First no-ISBN book should succeed with 201");
    const book1Id = book1Res.data.data._id;

    // Book 2 without ISBN
    const book2Res = await makeAuthRequest("/api/books", {
      method: "POST",
      cookie: adminUser.cookie,
      body: {
        title: `Indie Self-Published Volume 2 ${ts}`,
        author: `Independent Author B ${ts}`,
        genre: "Memoir",
        price: 380,
        stock: 20,
        isbn: "", // No ISBN
      },
    });
    assert.equal(book2Res.status, 201, "Second no-ISBN book must also succeed with 201 without partial index collision");
    const book2Id = book2Res.data.data._id;

    assert.notEqual(book1Id, book2Id);

    // Clean up
    await makeAuthRequest(`/api/books/${book1Id}`, { method: "DELETE", cookie: adminUser.cookie });
    await makeAuthRequest(`/api/books/${book2Id}`, { method: "DELETE", cookie: adminUser.cookie });
  });
});



