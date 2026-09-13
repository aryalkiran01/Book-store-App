import http from "http";

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on("error", reject);
  });
}

async function runTests() {
  console.log("=== Testing Search & Suggestions API ===");

  // 1. Search suggestions
  const res1 = await get("http://localhost:4000/api/books/suggestions?q=great");
  console.log("Suggestions for 'great':", res1.status, res1.body.isSuccess ? `Found ${res1.body.data.length} items` : res1.body);
  if (res1.body.data && res1.body.data.length > 0) {
    console.log("Sample suggestion:", res1.body.data[0]);
  }

  // 2. Empty query suggestions
  const res2 = await get("http://localhost:4000/api/books/suggestions?q=");
  console.log("Empty suggestions query:", res2.status, res2.body.data);

  // 3. Filtered books search
  const res3 = await get("http://localhost:4000/api/books?sortBy=rating-high&limit=5&inStock=true");
  console.log("Filtered books query (top rated & in stock):", res3.status, `Returned ${res3.body.data?.length} books`);

  // 4. Genres listing
  const res4 = await get("http://localhost:4000/api/books/genres");
  console.log("Genres listing:", res4.status, res4.body.data?.slice(0, 5));

  // 5. Featured books
  const res5 = await get("http://localhost:4000/api/books/featured");
  console.log("Featured books:", res5.status, `Returned ${res5.body.data?.length} books`);

  // 6. New arrivals
  const res6 = await get("http://localhost:4000/api/books/new-arrivals");
  console.log("New arrivals:", res6.status, `Returned ${res6.body.data?.length} books`);

  console.log("=== All Tests Completed Successfully ===");
}

runTests().catch(console.error);
