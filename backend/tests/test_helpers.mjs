const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";

export { BASE_URL };

export async function registerUser({ username, email, password, role }) {
  const payload = { username, email, password };
  if (role) payload.role = role;

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, setCookie, headers: res.headers };
}

export async function makeAuthRequest(
  endpoint,
  { method = "GET", body = null, cookie = "", headers: customHeaders = {} } = {}
) {
  const headers = { ...customHeaders };
  if (cookie) headers["Cookie"] = cookie;
  if (body && typeof body === "object") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, setCookie, headers: res.headers };
}

export async function createAdminClient() {
  const ts = Date.now() + Math.random().toString(36).substring(2, 6);
  const email = `test_admin_${ts}@example.com`;
  const password = "AdminPassword123!";
  const username = `Admin_${ts}`;

  // Register user
  await registerUser({ username, email, password });

  // Promote in DB directly
  const mongoose = (await import("mongoose")).default;
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/book_review_app_db";
    await mongoose.connect(mongoUri);
  }
  const UserModel = mongoose.models.User || mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  await UserModel.updateOne({ email }, { $set: { role: "admin" } });

  // Login as admin
  const loginRes = await loginUser({ email, password });
  return { email, password, username, cookie: loginRes.setCookie };
}

export async function createRegularUserClient() {
  const ts = Date.now() + Math.random().toString(36).substring(2, 6);
  const email = `user_${ts}@example.com`;
  const password = "UserPassword123!";
  const username = `User_${ts}`;

  await registerUser({ username, email, password });
  const loginRes = await loginUser({ email, password });
  return { email, password, username, cookie: loginRes.setCookie };
}

export async function createTestBook({ title, author, price = 500, stock = 10, discountPercentage = 0 } = {}) {
  const mongoose = (await import("mongoose")).default;
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/book_review_app_db";
    await mongoose.connect(mongoUri);
  }
  const BookModel = mongoose.models.Book || mongoose.model("Book", new mongoose.Schema({}, { strict: false }));

  const ts = Date.now() + Math.random().toString(36).substring(2, 6);
  const book = await BookModel.create({
    title: title || `Test Book ${ts}`,
    author: author || `Author ${ts}`,
    description: "A compelling test book description with comprehensive details.",
    genre: "Fiction",
    price,
    stock,
    discountPercentage,
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
  });
  return book;
}

export async function closeDB() {
  const mongoose = (await import("mongoose")).default;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
