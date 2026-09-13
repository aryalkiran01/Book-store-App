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
  console.log("   PHASE 8: ADMIN DASHBOARD TEST SUITE    ");
  console.log("==========================================\n");

  const timestamp = Date.now().toString().slice(-6);
  const normalUserEmail = `normal_${timestamp}@example.com`;
  const password = "Password123!";

  // 1. Register a normal user
  console.log("1. Setting up test accounts...");
  const regUser = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `user_${timestamp}`,
      email: normalUserEmail,
      password,
    }),
  });
  const regUserData = await regUser.json();
  assert(regUserData.isSuccess, "Regular user registered");

  const loginUser = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalUserEmail, password }),
  });
  const loginUserData = await loginUser.json();
  assert(loginUserData.isSuccess, "Regular user logged in");
  const userToken = loginUserData.data.accessToken || loginUserData.data.token;
  const userId = loginUserData.data.user.id || loginUserData.data.user._id;

  // 2. Login seeded Admin
  const loginAdmin = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@bookstore.com", password: "admin123" }),
  });
  const loginAdminData = await loginAdmin.json();
  assert(loginAdminData.isSuccess, "Admin logged in successfully");
  const adminToken = loginAdminData.data.accessToken || loginAdminData.data.token;
  const adminId = loginAdminData.data.user.id || loginAdminData.data.user._id;

  // 3. Security: Non-admin access rejection
  console.log("\n2. Testing Admin Security & Authorization...");
  const unauthStats = await fetch(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(unauthStats.status === 403, "Non-admin access to /api/admin/stats is blocked (403 Forbidden)");

  const unauthUsers = await fetch(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(unauthUsers.status === 403, "Non-admin access to /api/admin/users is blocked (403 Forbidden)");

  // 4. Admin Stats Endpoint
  console.log("\n3. Testing Admin Statistics Endpoint...");
  const statsRes = await fetch(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsData = await statsRes.json();
  assert(statsData.isSuccess, "Admin successfully fetched stats");
  assert(typeof statsData.data.metrics.totalUsers === "number", "totalUsers metric returned");
  assert(typeof statsData.data.metrics.totalBooks === "number", "totalBooks metric returned");
  assert(typeof statsData.data.metrics.totalOrders === "number", "totalOrders metric returned");
  assert(typeof statsData.data.metrics.totalRevenue === "number", "totalRevenue metric returned");
  assert(statsData.data.orderStatusBreakdown !== undefined, "orderStatusBreakdown returned");
  assert(Array.isArray(statsData.data.recentOrders), "recentOrders list returned");
  assert(Array.isArray(statsData.data.topCategories), "topCategories breakdown returned");

  // 5. User Management & Self-Protection Rules
  console.log("\n4. Testing User Management & Protection Rules...");
  const usersRes = await fetch(`${API_BASE}/admin/users?limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const usersData = await usersRes.json();
  assert(usersData.isSuccess && usersData.data.length > 0, "Users list returned");

  // Promote regular user to admin
  const promoteRes = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: "admin" }),
  });
  const promoteData = await promoteRes.json();
  assert(promoteData.isSuccess && promoteData.data.role === "admin", "Promoted user to admin");

  // Demote user back to regular user
  const demoteRes = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: "user" }),
  });
  const demoteData = await demoteRes.json();
  assert(demoteData.isSuccess && demoteData.data.role === "user", "Demoted user back to user");

  // Self-demotion prevention
  const selfDemoteRes = await fetch(`${API_BASE}/admin/users/${adminId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: "user" }),
  });
  assert(selfDemoteRes.status === 400, "Admin self-demotion is correctly blocked (400 Bad Request)");

  // Self-deletion prevention
  const selfDeleteRes = await fetch(`${API_BASE}/admin/users/${adminId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(selfDeleteRes.status === 400, "Admin self-deletion is correctly blocked (400 Bad Request)");

  // 6. Inventory Management & Quick Stock Update
  console.log("\n5. Testing Inventory Management & Quick Stock Updates...");
  const invRes = await fetch(`${API_BASE}/admin/inventory?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const invData = await invRes.json();
  assert(invData.isSuccess && invData.data.length > 0, "Admin inventory list fetched");
  assert(typeof invData.summary.lowStockCount === "number", "Inventory summary with lowStockCount returned");

  const targetBook = invData.data[0];
  const originalStock = targetBook.stock || 0;
  const newStock = originalStock + 5;

  const updateStockRes = await fetch(`${API_BASE}/admin/inventory/${targetBook._id}/stock`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ stock: newStock }),
  });
  const updateStockData = await updateStockRes.json();
  assert(updateStockData.isSuccess && updateStockData.data.stock === newStock, `Stock updated from ${originalStock} to ${newStock}`);

  // 7. Categories & Authors Analytics
  console.log("\n6. Testing Category & Author Analytics...");
  const catRes = await fetch(`${API_BASE}/admin/categories`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const catData = await catRes.json();
  assert(catData.isSuccess && Array.isArray(catData.data), "Categories aggregated analytics returned");

  const authRes = await fetch(`${API_BASE}/admin/authors`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const authData = await authRes.json();
  assert(authData.isSuccess && Array.isArray(authData.data), "Authors aggregated analytics returned");

  // 8. Admin Reviews Moderation
  console.log("\n7. Testing Admin Reviews Moderation...");
  const revRes = await fetch(`${API_BASE}/admin/reviews?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const revData = await revRes.json();
  assert(revData.isSuccess, "Admin reviews list fetched");

  if (revData.data.length > 0) {
    const rev = revData.data[0];
    const modRes = await fetch(`${API_BASE}/admin/reviews/${rev._id}/moderate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "hidden" }),
    });
    const modData = await modRes.json();
    assert(modData.isSuccess && modData.data.status === "hidden", "Review successfully moderated to hidden");

    // Restore back to published
    await fetch(`${API_BASE}/admin/reviews/${rev._id}/moderate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "published" }),
    });
  }

  // 9. Admin Orders Querying
  console.log("\n8. Testing Admin Orders Querying...");
  const ordersRes = await fetch(`${API_BASE}/admin/orders?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const ordersData = await ordersRes.json();
  assert(ordersData.isSuccess, "Admin orders list fetched");

  console.log("\n==========================================");
  console.log("🎉 ALL PHASE 8 ADMIN BACKEND TESTS PASSED!");
  console.log("==========================================\n");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
