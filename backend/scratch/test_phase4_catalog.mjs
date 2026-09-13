import assert from "node:assert";

const BASE_URL = "http://localhost:4000/api";

async function runTests() {
  console.log("=== PHASE 4: BOOK CATALOG AUTOMATED TESTS ===");

  console.log("\n[1] Logging in as Admin user...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@bookstore.com",
      password: "admin123",
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.data?.token || "";
  assert(token, `Admin login must return a token. Got: ${JSON.stringify(loginData)}`);
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  console.log("-> Admin authenticated successfully.");

  // 2. Test Creating Books with Complete Catalog Fields
  console.log("\n[2] Creating sample books with complete catalog metadata...");
  const timestamp = Date.now();
  const testBooksData = [
    {
      title: `Clean Architecture in Practice ${timestamp}`,
      author: "Robert C. Martin",
      genre: "Technology",
      description: "A guide to software structure and design for enterprise systems.",
      price: 49.99,
      discountPercentage: 15,
      stock: 25,
      isbn: `978-01344${String(timestamp).slice(-6)}`,
      publisher: "Prentice Hall",
      publicationDate: "2017-09-20",
      pages: 432,
      language: "English",
      image: "https://images.unsplash.com/photo-1532012164546-f432f2e3edd3",
      featured: true,
      isNewArrival: false,
    },
    {
      title: `The Silent Forest Mystery ${timestamp}`,
      author: "Eleanor Vance",
      genre: "Mystery",
      description: "A chilling thriller set in the dense woods of Blackwood.",
      price: 18.5,
      discountPercentage: 0,
      stock: 5,
      isbn: `978-00628${String(timestamp).slice(-6)}`,
      publisher: "HarperCollins",
      publicationDate: "2023-04-12",
      pages: 360,
      language: "English",
      image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f",
      featured: true,
      isNewArrival: true,
    },
    {
      title: `Culinary Secrets of Tuscany ${timestamp}`,
      author: "Marco Rossi",
      genre: "Cooking",
      description: "Authentic recipes and stories from Italian countryside kitchens.",
      price: 29.99,
      discountPercentage: 10,
      stock: 0, // Out of stock
      isbn: `978-14000${String(timestamp).slice(-6)}`,
      publisher: "Clarkson Potter",
      publicationDate: "2021-11-05",
      pages: 280,
      language: "English",
      image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330",
      featured: false,
      isNewArrival: true,
    },
  ];

  const createdBooks = [];
  for (const b of testBooksData) {
    const res = await fetch(`${BASE_URL}/books`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(b),
    });
    const resData = await res.json();
    assert.strictEqual(res.status, 201, `Book creation failed: ${JSON.stringify(resData)}`);
    assert(resData.data._id, "Created book must have an ID");
    assert.strictEqual(resData.data.title, b.title);
    assert.strictEqual(resData.data.stock, b.stock);
    assert.strictEqual(resData.data.discountPercentage, b.discountPercentage);
    assert.strictEqual(resData.data.isbn, b.isbn);
    createdBooks.push(resData.data);
    console.log(`-> Created: "${b.title}" (ID: ${resData.data._id}, Stock: ${b.stock})`);
  }

  // 3. Test Book Details Endpoint
  console.log("\n[3] Testing single book details endpoint...");
  const targetBook = createdBooks[0];
  const detailRes = await fetch(`${BASE_URL}/books/${targetBook._id}`);
  const detailData = await detailRes.json();
  assert.strictEqual(detailRes.status, 200, "Should get book details");
  const bookResult = detailData.data.result || detailData.data;
  assert.strictEqual(bookResult.title, targetBook.title);
  assert.strictEqual(bookResult.publisher, "Prentice Hall");
  assert.strictEqual(bookResult.pages, 432);
  console.log("-> Book details verified with full metadata.");

  // 4. Test Book Editing
  console.log("\n[4] Testing book editing...");
  const editRes = await fetch(`${BASE_URL}/books/${targetBook._id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      price: 39.99,
      discountPercentage: 20,
      stock: 40,
      description: "Updated edition with new architectural diagrams.",
    }),
  });
  const editData = await editRes.json();
  assert.strictEqual(editRes.status, 200, `Book update failed: ${JSON.stringify(editData)}`);
  assert.strictEqual(editData.data.price, 39.99);
  assert.strictEqual(editData.data.discountPercentage, 20);
  assert.strictEqual(editData.data.stock, 40);
  console.log("-> Book update verified: price, discount, and stock updated.");

  // 5. Test Search
  console.log("\n[5] Testing Search by query...");
  const searchRes = await fetch(`${BASE_URL}/books?search=Architecture`);
  const searchData = await searchRes.json();
  assert.strictEqual(searchRes.status, 200);
  assert(searchData.data.length >= 1, "Search should return matching book");
  assert(searchData.data.some((b) => b.title.includes("Clean Architecture")));
  console.log(`-> Search for 'Architecture' returned ${searchData.data.length} results.`);

  // 6. Test Filtering by Genre & InStock
  console.log("\n[6] Testing Filtering (genre, price, stock)...");
  // Genre filter
  const techRes = await fetch(`${BASE_URL}/books?genre=Technology`);
  const techData = await techRes.json();
  assert(techData.data.every((b) => b.genre.toLowerCase().includes("tech")));
  console.log(`-> Genre 'Technology' filter returned ${techData.data.length} books.`);

  // In-stock filter
  const inStockRes = await fetch(`${BASE_URL}/books?inStock=true`);
  const inStockData = await inStockRes.json();
  assert(inStockData.data.every((b) => b.stock > 0), "All returned books must have stock > 0");
  assert(!inStockData.data.some((b) => b._id === createdBooks[2]._id), "Out-of-stock book should not appear");
  console.log(`-> inStock filter verified: ${inStockData.data.length} items in stock.`);

  // Price range filter
  const priceRes = await fetch(`${BASE_URL}/books?minPrice=15&maxPrice=25`);
  const priceData = await priceRes.json();
  assert(priceData.data.every((b) => b.price >= 15 && b.price <= 25));
  console.log(`-> Price filter ($15 - $25) verified: ${priceData.data.length} items.`);

  // 7. Test Sorting
  console.log("\n[7] Testing Sorting...");
  const sortAscRes = await fetch(`${BASE_URL}/books?sortBy=price-asc`);
  const sortAscData = await sortAscRes.json();
  for (let i = 0; i < sortAscData.data.length - 1; i++) {
    assert(sortAscData.data[i].price <= sortAscData.data[i + 1].price, "Books must be in ascending price order");
  }
  console.log("-> Price ascending sort verified.");

  const sortDescRes = await fetch(`${BASE_URL}/books?sortBy=price-desc`);
  const sortDescData = await sortDescRes.json();
  for (let i = 0; i < sortDescData.data.length - 1; i++) {
    assert(sortDescData.data[i].price >= sortDescData.data[i + 1].price, "Books must be in descending price order");
  }
  console.log("-> Price descending sort verified.");

  // 8. Test Pagination
  console.log("\n[8] Testing Pagination...");
  const pageRes = await fetch(`${BASE_URL}/books?page=1&limit=2`);
  const pageData = await pageRes.json();
  assert.strictEqual(pageData.data.length, 2, "Page 1 limit 2 must return exactly 2 items");
  assert(pageData.pagination, "Response must include pagination metadata");
  assert.strictEqual(pageData.pagination.page, 1);
  assert.strictEqual(pageData.pagination.limit, 2);
  assert(pageData.pagination.total >= 3);
  assert.strictEqual(pageData.pagination.hasNext, true);
  console.log(`-> Pagination verified: page 1 returned 2 of ${pageData.pagination.total} books.`);

  // 9. Test Genres, Featured, and New Arrivals Endpoints
  console.log("\n[9] Testing Genres, Featured, and New Arrivals endpoints...");
  const genresRes = await fetch(`${BASE_URL}/books/genres`);
  const genresData = await genresRes.json();
  assert.strictEqual(genresRes.status, 200);
  assert(Array.isArray(genresData.data));
  assert(genresData.data.includes("Technology"));
  console.log(`-> /api/books/genres returned: ${JSON.stringify(genresData.data)}`);

  const featRes = await fetch(`${BASE_URL}/books/featured`);
  const featData = await featRes.json();
  assert.strictEqual(featRes.status, 200);
  assert(featData.data.some((b) => b._id === createdBooks[1]._id));
  console.log(`-> /api/books/featured returned ${featData.data.length} featured books.`);

  const newArrRes = await fetch(`${BASE_URL}/books/new-arrivals`);
  const newArrData = await newArrRes.json();
  assert.strictEqual(newArrRes.status, 200);
  assert(newArrData.data.some((b) => b._id === createdBooks[1]._id));
  console.log(`-> /api/books/new-arrivals returned ${newArrData.data.length} new arrivals.`);

  // 10. Test Deletion
  console.log("\n[10] Testing Book Deletion...");
  const delRes = await fetch(`${BASE_URL}/books/${createdBooks[2]._id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  const delData = await delRes.json();
  assert.strictEqual(delRes.status, 200, "Book deletion should succeed");

  const verifyDelRes = await fetch(`${BASE_URL}/books/${createdBooks[2]._id}`);
  assert.strictEqual(verifyDelRes.status, 404, "Deleted book should return 404");
  console.log("-> Book deletion verified.");

  console.log("\n==========================================");
  console.log("🎉 ALL 10/10 PHASE 4 CATALOG TESTS PASSED!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("❌ Phase 4 Test Failed:", err);
  process.exit(1);
});
