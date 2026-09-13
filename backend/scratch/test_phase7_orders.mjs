import fetch from "node-fetch";

const API_BASE = "http://localhost:4000/api";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("\n==========================================");
  console.log("   PHASE 7: ORDER & CHECKOUT TEST SUITE   ");
  console.log("==========================================\n");

  const timestamp = Date.now();
  const user1Email = `orderuser1_${timestamp}@example.com`;
  const user2Email = `orderuser2_${timestamp}@example.com`;
  const adminEmail = `orderadmin_${timestamp}@example.com`;
  const password = "Password123!";

  // 1. Register & Login User 1
  console.log("1. Registering & Logging in test users...");
  const reg1Res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `user1_${timestamp.toString().slice(-6)}`,
      email: user1Email,
      password,
    }),
  });
  const reg1Data = await reg1Res.json();
  if (!reg1Data.isSuccess) console.error("Reg 1 failed:", reg1Data);

  const login1Res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user1Email, password }),
  });
  const login1Data = await login1Res.json();
  if (!login1Data.isSuccess) console.error("Login 1 failed:", login1Data);
  assert(login1Data.isSuccess, "User 1 logged in successfully");
  const user1Token = login1Data.data.accessToken || login1Data.data.token;
  const user1Id = login1Data.data.user.id || login1Data.data.user._id;

  // 2. Register & Login User 2
  await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `user2_${timestamp.toString().slice(-6)}`,
      email: user2Email,
      password,
    }),
  });
  const login2Res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user2Email, password }),
  });
  const login2Data = await login2Res.json();
  assert(login2Data.isSuccess, "User 2 logged in successfully");
  const user2Token = login2Data.data.accessToken || login2Data.data.token;
  const user2Id = login2Data.data.user.id || login2Data.data.user._id;

  // 3. Login Seeded Admin User
  const loginAdminRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@bookstore.com", password: "admin123" }),
  });
  const loginAdminData = await loginAdminRes.json();
  assert(loginAdminData.isSuccess, "Admin logged in successfully");
  const adminToken = loginAdminData.data.accessToken || loginAdminData.data.token;

  // 4. Fetch an active book from store
  console.log("\n2. Fetching available books...");
  const booksRes = await fetch(`${API_BASE}/books?limit=5`);
  const booksData = await booksRes.json();
  assert(booksData.isSuccess && booksData.data.length > 0, "Found active books in catalog");
  
  const testBook = booksData.data.find(b => (b.stock || 0) >= 5) || booksData.data[0];
  const initialStock = testBook.stock || 10;
  console.log(`Using Book: "${testBook.title}" (ID: ${testBook._id}, Initial Stock: ${initialStock})`);

  // 5. Test Order Creation & Inventory Deduction
  console.log("\n3. Testing Order Creation & Inventory Deduction...");
  const orderPayload = {
    books: [
      {
        bookId: testBook._id,
        quantity: 2,
      },
    ],
    shippingAddress: {
      fullName: "Test Customer 1",
      street: "123 Bookworm Lane",
      city: "Kathmandu",
      state: "Bagmati",
      postalCode: "44600",
      phone: "+977-9812345678",
    },
    paymentMethod: "cod",
    orderNote: "Please leave at door",
  };

  const createOrderRes = await fetch(`${API_BASE}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify(orderPayload),
  });
  const createOrderData = await createOrderRes.json();
  if (!createOrderData.isSuccess) {
    console.error("createOrder failed:", JSON.stringify(createOrderData, null, 2));
  }
  assert(createOrderData.isSuccess, "Order created successfully by User 1");
  const order1 = createOrderData.data;
  assert(order1.status === "pending", "Initial order status is pending");
  assert(order1.books[0].quantity === 2, "Order books quantity is 2");
  assert(order1.subtotal > 0, "Order subtotal calculated by backend");
  assert(order1.totalAmount === order1.subtotal + order1.shippingCost - order1.discount, "Authoritative total calculation verified");
  assert(order1.statusHistory && order1.statusHistory.length >= 1, "statusHistory tracks order placement");

  // Check that book stock was deducted by 2
  const bookCheck1 = await (await fetch(`${API_BASE}/books/${testBook._id}`)).json();
  const stockAfterOrder = bookCheck1.data.stock;
  assert(stockAfterOrder === initialStock - 2, `Stock properly deducted from ${initialStock} to ${stockAfterOrder}`);

  // 6. Test My Orders API
  console.log("\n4. Testing My Orders API & Filtering...");
  const myOrdersRes = await fetch(`${API_BASE}/order/my-orders`, {
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  const myOrdersData = await myOrdersRes.json();
  assert(myOrdersData.isSuccess, "User 1 successfully fetched my-orders");
  assert(myOrdersData.data.some(o => o._id === order1._id), "Created order exists in User 1's order list");

  // 7. Test Ownership Enforcement
  console.log("\n5. Testing Security & Ownership Enforcement...");
  // User 2 trying to get User 1's order by ID
  const getOrderUser2 = await fetch(`${API_BASE}/order/${order1._id}`, {
    headers: { Authorization: `Bearer ${user2Token}` },
  });
  assert(getOrderUser2.status === 403, "User 2 is Forbidden (403) from viewing User 1's order");

  // User 2 trying to cancel User 1's order
  const cancelUser2 = await fetch(`${API_BASE}/order/${order1._id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({ reason: "Malicious cancel" }),
  });
  const cancelUser2Data = await cancelUser2.json();
  console.log("cancelUser2 status:", cancelUser2.status, "body:", cancelUser2Data);
  assert(cancelUser2.status === 403, "User 2 is Forbidden (403) from cancelling User 1's order");

  // User 1 trying to call admin status endpoint
  const unauthorizedStatusChange = await fetch(`${API_BASE}/order/${order1._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({ status: "delivered" }),
  });
  assert(unauthorizedStatusChange.status === 403, "Non-admin User 1 is Forbidden (403) from updating order status directly");

  // 8. Test Admin Order Lifecycle State Machine
  console.log("\n6. Testing State Machine & Status Transitions...");
  
  // Pending -> Confirmed
  const toConfirmed = await fetch(`${API_BASE}/order/${order1._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "confirmed", note: "Verified address" }),
  });
  const confData = await toConfirmed.json();
  assert(confData.isSuccess && confData.data.status === "confirmed", "Transitioned to confirmed");

  // Confirmed -> Processing
  const toProcessing = await fetch(`${API_BASE}/order/${order1._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "processing", note: "Books packaged" }),
  });
  const procData = await toProcessing.json();
  assert(procData.isSuccess && procData.data.status === "processing", "Transitioned to processing");

  // Processing -> Shipped
  const toShipped = await fetch(`${API_BASE}/order/${order1._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "shipped", note: "Handed to courier" }),
  });
  const shipData = await toShipped.json();
  assert(shipData.isSuccess && shipData.data.status === "shipped", "Transitioned to shipped");

  // Shipped -> Delivered
  const toDelivered = await fetch(`${API_BASE}/order/${order1._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "delivered", note: "Signed by recipient" }),
  });
  const delData = await toDelivered.json();
  assert(delData.isSuccess && delData.data.status === "delivered", "Transitioned to delivered");
  assert(delData.data.statusHistory.length >= 5, "Complete status audit trail logged in statusHistory");

  // 9. Test Invalid State Transitions
  console.log("\n7. Testing Invalid Transition Prevention...");
  
  // Delivered -> Pending (Invalid!)
  const invalidDeliveredToPending = await fetch(`${API_BASE}/order/${order1._id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "pending" }),
  });
  assert(invalidDeliveredToPending.status === 400, "Delivered -> Pending correctly blocked with 400 Bad Request");

  // Delivered -> Cancelled (Invalid!)
  const invalidDeliveredToCancel = await fetch(`${API_BASE}/order/${order1._id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({ reason: "Too late" }),
  });
  assert(invalidDeliveredToCancel.status === 400, "Cancelling a delivered order correctly blocked with 400");

  // 10. Test Cancellation & Automatic Stock Restoral
  console.log("\n8. Testing Order Cancellation & Automatic Stock Restoral...");
  
  // Create order 2
  const order2Res = await fetch(`${API_BASE}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({
      books: [{ bookId: testBook._id, quantity: 3 }],
      shippingAddress: {
        fullName: "Test Customer 2",
        street: "456 Readers Way",
        city: "Pokhara",
        state: "Gandaki",
        postalCode: "33700",
        phone: "+977-9800000000",
      },
      paymentMethod: "cod",
    }),
  });
  const order2Data = await order2Res.json();
  assert(order2Data.isSuccess, "Order 2 created with 3 quantity");
  const order2 = order2Data.data;

  // Verify stock decreased by 3
  const bookCheck2 = await (await fetch(`${API_BASE}/books/${testBook._id}`)).json();
  assert(bookCheck2.data.stock === stockAfterOrder - 3, `Stock decreased by 3 to ${bookCheck2.data.stock}`);

  // User 2 cancels order 2
  const cancelRes = await fetch(`${API_BASE}/order/${order2._id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({ reason: "Ordered by mistake" }),
  });
  const cancelData = await cancelRes.json();
  assert(cancelData.isSuccess, "User 2 successfully cancelled their order");
  assert(cancelData.data.status === "cancelled", "Order status updated to cancelled");
  assert(cancelData.data.cancellationReason === "Ordered by mistake", "Cancellation reason recorded");

  // Verify stock was restored by 3
  const bookCheck3 = await (await fetch(`${API_BASE}/books/${testBook._id}`)).json();
  assert(bookCheck3.data.stock === stockAfterOrder, `Stock restored back to ${stockAfterOrder} after cancellation`);

  // Double cancellation attempt
  const doubleCancel = await fetch(`${API_BASE}/order/${order2._id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({ reason: "Again" }),
  });
  assert(doubleCancel.status === 400, "Double cancellation blocked with 400");

  console.log("\n==========================================");
  console.log("🎉 ALL PHASE 7 ORDER TESTS PASSED 100%!");
  console.log("==========================================\n");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
