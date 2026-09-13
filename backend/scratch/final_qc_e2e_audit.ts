/**
 * Comprehensive Final End-to-End Quality Control & Security Audit Test Suite (TypeScript)
 * Tests all flows from Phase 17 & Phase 18
 */
import mongoose from "mongoose";
import { UserModel } from "../src/modules/auth/model";
import { BookModel } from "../src/modules/book/model";
import { ReviewModel } from "../src/modules/review/model";
import { OrderModel } from "../src/modules/order/model";
import {
  createUserService,
  loginService,
  getUserById,
} from "../src/modules/auth/service";
import {
  createOrderService,
  getOrderByIdService,
  getOrdersByUserIdService,
  updateOrderStatusService,
  validateCartService,
} from "../src/modules/order/service";
import {
  createReviewService,
  getReviewsByBookIdService,
  updateReviewService,
} from "../src/modules/review/service";
import {
  getAdminStatsService,
  getAdminUsersService,
  updateAdminUserRoleService,
  getAdminInventoryService,
  quickUpdateStockService,
  getAdminReviewsService,
  moderateAdminReviewService,
  getAdminCategoriesService,
  getAdminAuthorsService,
} from "../src/modules/admin/service";
import {
  createBookService,
  getBooksService,
  getBookByIdService,
  updateBookService,
  getSearchSuggestionsService,
} from "../src/modules/book/service";
import { verifyToken, generateToken } from "../src/utils/auth";
import { sanitizeNoSqlInput } from "../src/utils/security";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/book_review_app_db";

interface TestResult {
  total: number;
  passed: number;
  failed: number;
  categories: Record<string, { passed: number; failed: number; tests: Array<{ name: string; passed: boolean; detail?: string }> }>;
}

const results: TestResult = {
  total: 0,
  passed: 0,
  failed: 0,
  categories: {},
};

function recordTest(category: string, name: string, passed: boolean, detail = "") {
  results.total++;
  if (!results.categories[category]) {
    results.categories[category] = { passed: 0, failed: 0, tests: [] };
  }
  if (passed) {
    results.passed++;
    results.categories[category].passed++;
    console.log(`  ✅ [${category}] ${name}`);
  } else {
    results.failed++;
    results.categories[category].failed++;
    console.error(`  ❌ [${category}] ${name}: ${detail}`);
  }
  results.categories[category].tests.push({ name, passed, detail });
}

async function runAudit() {
  console.log("================================================================================");
  console.log("🚀 STARTING FINAL QUALITY CONTROL & PRODUCTION READINESS AUDIT (PHASE 17 & 18)");
  console.log("================================================================================");

  await mongoose.connect(MONGO_URI, { dbName: "book_review_app_db" });
  console.log("Connected to MongoDB successfully.\n");

  const timestamp = Date.now();
  const testUserEmail = `testuser_${timestamp}@example.com`;
  const testUser2Email = `testuser2_${timestamp}@example.com`;
  const testAdminEmail = `testadmin_${timestamp}@example.com`;
  const password = "Password123!";

  let user1: any, user2: any, adminUser: any;
  let user1Token: string = "", adminToken: string = "";
  let sampleBook: any, createdOrder: any, sampleReview: any;

  // -------------------------------------------------------------------------
  // 1. USER FLOW AUDIT
  // -------------------------------------------------------------------------
  console.log("📋 1. USER FLOW AUDIT");

  // Step 1: Register
  try {
    user1 = await createUserService({
      email: testUserEmail,
      username: `qcuser_${timestamp}`,
      password,
    });
    recordTest("User Flow", "1. User Registration", !!user1 && user1.role === "user");
  } catch (err: any) {
    recordTest("User Flow", "1. User Registration", false, err.message);
  }

  // Register User 2 (for permission isolation tests)
  try {
    user2 = await createUserService({
      email: testUser2Email,
      username: `qcuser2_${timestamp}`,
      password,
    });
    recordTest("User Flow", "1b. Secondary User Registration", !!user2);
  } catch (err: any) {
    recordTest("User Flow", "1b. Secondary User Registration", false, err.message);
  }

  // Step 2: Login
  try {
    const loginRes = await loginService({ email: testUserEmail, password });
    user1Token = loginRes.token;
    recordTest("User Flow", "2. User Login & Token Generation", !!user1Token && loginRes.user.email === testUserEmail);
  } catch (err: any) {
    recordTest("User Flow", "2. User Login & Token Generation", false, err.message);
  }

  // Step 3: Browse Catalog
  try {
    const catalog = await getBooksService({ limit: 10, page: 1 });
    recordTest("User Flow", "3. Browse Book Catalog", Array.isArray(catalog.books) && catalog.books.length > 0);
    sampleBook = catalog.books[0];
  } catch (err: any) {
    recordTest("User Flow", "3. Browse Book Catalog", false, err.message);
  }

  // Step 4: Search & Suggestions
  try {
    const searchRes = await getBooksService({ search: "a", limit: 5 });
    const suggestions = await getSearchSuggestionsService("a");
    recordTest(
      "User Flow",
      "4. Search Catalog & Suggestions",
      Array.isArray(searchRes.books) && Array.isArray(suggestions)
    );
  } catch (err: any) {
    recordTest("User Flow", "4. Search Catalog & Suggestions", false, err.message);
  }

  // Step 5: Book Details
  try {
    const bookDetails = await getBookByIdService(sampleBook._id.toString());
    recordTest("User Flow", "5. Book Details Retrieval", bookDetails.title === sampleBook.title);
  } catch (err: any) {
    recordTest("User Flow", "5. Book Details Retrieval", false, err.message);
  }

  // Step 6: Read Reviews & Stats
  try {
    const reviewsRes = await getReviewsByBookIdService(sampleBook._id.toString());
    recordTest(
      "User Flow",
      "6. Read Reviews & Breakdown Stats",
      Array.isArray(reviewsRes.reviews) && reviewsRes.stats !== undefined
    );
  } catch (err: any) {
    recordTest("User Flow", "6. Read Reviews & Breakdown Stats", false, err.message);
  }

  // Step 7: Cart Validation & Authoritative Calculation
  try {
    const cartRes = await validateCartService([
      { bookId: sampleBook._id.toString(), quantity: 2 },
    ]);
    recordTest(
      "User Flow",
      "7. Cart Calculation & Stock Validation",
      cartRes.isValid && cartRes.subtotal > 0 && cartRes.finalTotal >= cartRes.subtotal
    );
  } catch (err: any) {
    recordTest("User Flow", "7. Cart Calculation & Stock Validation", false, err.message);
  }

  // Step 8: Checkout & Place Order
  try {
    createdOrder = await createOrderService({
      userId: user1._id.toString(),
      books: [{ bookId: sampleBook._id.toString(), quantity: 1 }],
      shippingAddress: {
        street: "123 Test St",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
        phone: "9800000000",
      },
      paymentMethod: "cod",
    });
    recordTest(
      "User Flow",
      "8. Checkout & Order Creation",
      !!createdOrder && createdOrder.status === "pending" && createdOrder.books.length === 1
    );
  } catch (err: any) {
    recordTest("User Flow", "8. Checkout & Order Creation", false, err.message);
  }

  // Step 9: Order History & User Orders
  try {
    const myOrders = await getOrdersByUserIdService(user1._id.toString());
    recordTest(
      "User Flow",
      "9. View Order History",
      Array.isArray(myOrders.orders) && myOrders.orders.length > 0
    );
  } catch (err: any) {
    recordTest("User Flow", "9. View Order History", false, err.message);
  }

  // Step 10: Submit Review & Verified Purchase Detection
  try {
    sampleReview = await createReviewService(
      { bookId: sampleBook._id.toString(), userId: user1._id.toString(), role: "user" },
      {
        rating: 5,
        title: "Incredible reading experience",
        reviewText: "This book completely surpassed my expectations. Highly recommended!",
        username: user1.username,
      }
    );
    recordTest(
      "User Flow",
      "10. Submit Book Review (Verified Purchase)",
      sampleReview.rating === 5 && sampleReview.isVerifiedPurchase === true
    );
  } catch (err: any) {
    recordTest("User Flow", "10. Submit Book Review (Verified Purchase)", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. ADMIN FLOW AUDIT
  // -------------------------------------------------------------------------
  console.log("\n📋 2. ADMIN FLOW AUDIT");

  // Step 11: Create & Login as Admin
  try {
    const adminHashed = await UserModel.create({
      email: testAdminEmail,
      username: `qcadmin_${timestamp}`,
      password: "HashedPassword123!",
      role: "admin",
    });
    adminUser = adminHashed;
    adminToken = generateToken({
      id: adminUser._id.toString(),
      username: adminUser.username,
      email: adminUser.email,
      role: "admin",
    });
    recordTest("Admin Flow", "11. Admin Authentication & Role Provision", adminUser.role === "admin");
  } catch (err: any) {
    recordTest("Admin Flow", "11. Admin Authentication & Role Provision", false, err.message);
  }

  // Step 12: Admin Dashboard & Statistics
  try {
    const stats = await getAdminStatsService();
    recordTest(
      "Admin Flow",
      "12. Admin KPI Dashboard & Analytics",
      stats.metrics.totalBooks > 0 && stats.metrics.totalUsers > 0 && typeof stats.metrics.totalRevenue === "number"
    );
  } catch (err: any) {
    recordTest("Admin Flow", "12. Admin KPI Dashboard & Analytics", false, err.message);
  }

  // Step 13: Manage Books (Create, Update)
  let createdBookId: string = "";
  try {
    const newBook = await createBookService({
      title: `QC Test Book ${timestamp}`,
      author: "Quality Author",
      genre: "Technology",
      description: "Testing admin book creation",
      price: 550,
      stock: 15,
      discountPercentage: 10,
    });
    createdBookId = newBook._id.toString();

    const updated = await updateBookService(createdBookId, {
      price: 600,
      description: "Updated description during QC",
    });

    recordTest(
      "Admin Flow",
      "13. Manage Books (Create & Update)",
      !!newBook && !!updated && updated.price === 600
    );
  } catch (err: any) {
    recordTest("Admin Flow", "13. Manage Books (Create & Update)", false, err.message);
  }

  // Step 14: Manage Users (List, Filter, Role Update)
  try {
    const userList = await getAdminUsersService({ page: 1, limit: 10 });
    const roleUpdated = await updateAdminUserRoleService(
      user2._id.toString(),
      { role: "admin" },
      adminUser._id.toString()
    );
    recordTest(
      "Admin Flow",
      "14. Manage Users (List & Update Role)",
      userList.users.length > 0 && roleUpdated.role === "admin"
    );
  } catch (err: any) {
    recordTest("Admin Flow", "14. Manage Users (List & Update Role)", false, err.message);
  }

  // Step 15: Manage Reviews (Moderation, Flagging)
  try {
    const adminReviews = await getAdminReviewsService({ page: 1, limit: 10 });
    const moderated = await moderateAdminReviewService(sampleReview._id.toString(), {
      status: "flagged",
    });
    recordTest(
      "Admin Flow",
      "15. Manage Reviews (Moderation & Status Change)",
      adminReviews.reviews.length > 0 && moderated.status === "flagged"
    );
  } catch (err: any) {
    recordTest("Admin Flow", "15. Manage Reviews (Moderation & Status Change)", false, err.message);
  }

  // Step 16: Manage Orders (Status Transitions)
  try {
    const updatedOrder = await updateOrderStatusService(
      createdOrder._id.toString(),
      { status: "confirmed", note: "Confirmed by admin QC" },
      adminUser.username
    );
    recordTest(
      "Admin Flow",
      "16. Manage Orders (Status Transition Enforcement)",
      updatedOrder.status === "confirmed" && updatedOrder.statusHistory.length > 1
    );
  } catch (err: any) {
    recordTest("Admin Flow", "16. Manage Orders (Status Transition Enforcement)", false, err.message);
  }

  // Step 17: Manage Inventory & Quick Stock Update
  try {
    const inventory = await getAdminInventoryService({ page: 1, limit: 10 });
    const stockUpdated = await quickUpdateStockService(sampleBook._id.toString(), {
      stock: 45,
    });
    recordTest(
      "Admin Flow",
      "17. Manage Inventory (Stock Filtering & Adjustment)",
      inventory.books.length > 0 && stockUpdated.stock === 45
    );
  } catch (err: any) {
    recordTest("Admin Flow", "17. Manage Inventory (Stock Filtering & Adjustment)", false, err.message);
  }

  // Step 18: View Categories & Authors Aggregations
  try {
    const categories = await getAdminCategoriesService();
    const authors = await getAdminAuthorsService();
    recordTest(
      "Admin Flow",
      "18. Category & Author Aggregated Metrics",
      Array.isArray(categories) && Array.isArray(authors)
    );
  } catch (err: any) {
    recordTest("Admin Flow", "18. Category & Author Aggregated Metrics", false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. SECURITY AUDIT & PENETRATION ATTEMPTS
  // -------------------------------------------------------------------------
  console.log("\n📋 3. SECURITY AUDIT & PENETRATION ATTEMPTS");

  // 19. ID Manipulation (Malformed MongoDB ObjectId)
  try {
    await getBookByIdService("invalid-malformed-object-id-12345");
    recordTest("Security", "19. ID Manipulation Prevention", false, "Should have thrown badRequest error");
  } catch (err: any) {
    recordTest(
      "Security",
      "19. ID Manipulation Prevention",
      err.status === 400 || err.message.includes("Invalid")
    );
  }

  // 20. Role Escalation Prevention on Signup
  try {
    const forgedUser = await createUserService({
      email: `forged_${timestamp}@example.com`,
      username: `forged_${timestamp}`,
      password: "Password123!",
      role: "admin", // Malicious attempt to self-promote
    } as any);
    recordTest(
      "Security",
      "20. Role Escalation Prevention on Signup",
      forgedUser.role === "user"
    );
  } catch (err: any) {
    recordTest("Security", "20. Role Escalation Prevention on Signup", false, err.message);
  }

  // 21. Review Ownership Bypass Prevention
  try {
    // User2 tries to edit User1's review
    await updateReviewService(
      sampleReview._id.toString(),
      { userId: user2._id.toString(), role: "user" },
      { reviewText: "Malicious unauthorized review text modification" }
    );
    recordTest("Security", "21. Review Ownership Bypass Prevention", false, "Should have forbidden unauthorized user");
  } catch (err: any) {
    recordTest(
      "Security",
      "21. Review Ownership Bypass Prevention",
      err.status === 403 || err.message.includes("not authorized")
    );
  }

  // 22. Order Ownership Bypass Prevention
  try {
    // User2 tries to view User1's order
    await getOrderByIdService(
      createdOrder._id.toString(),
      user2._id.toString(),
      "user"
    );
    recordTest("Security", "22. Order Ownership Bypass Prevention", false, "Should have blocked access to another user's order");
  } catch (err: any) {
    recordTest(
      "Security",
      "22. Order Ownership Bypass Prevention",
      err.status === 403 || err.message.includes("permission")
    );
  }

  // 23. Price Manipulation Defense
  try {
    // User submits forged custom unit price of NPR 1
    const manipulatedOrder = await createOrderService({
      userId: user1._id.toString(),
      books: [
        {
          bookId: sampleBook._id.toString(),
          quantity: 1,
          price: 1, // Forged frontend price
        } as any,
      ],
      shippingAddress: { street: "456 Test" },
    });

    const expectedAuthoritativePrice =
      sampleBook.discountPercentage && sampleBook.discountPercentage > 0
        ? Number((sampleBook.price * (1 - sampleBook.discountPercentage / 100)).toFixed(2))
        : sampleBook.price;

    recordTest(
      "Security",
      "23. Price Manipulation Defense (Server Authoritative Pricing)",
      manipulatedOrder.books[0].price === expectedAuthoritativePrice && manipulatedOrder.books[0].price !== 1
    );
  } catch (err: any) {
    recordTest("Security", "23. Price Manipulation Defense", false, err.message);
  }

  // 24. Stock Manipulation Defense (Ordering more than in stock)
  try {
    await createOrderService({
      userId: user1._id.toString(),
      books: [
        {
          bookId: sampleBook._id.toString(),
          quantity: 9999999, // Exceeds available stock
        },
      ],
      shippingAddress: { street: "456 Test" },
    });
    recordTest("Security", "24. Stock Manipulation Defense", false, "Should reject order exceeding stock");
  } catch (err: any) {
    recordTest(
      "Security",
      "24. Stock Manipulation Defense",
      err.status === 400 || err.message.includes("Insufficient stock")
    );
  }

  // 25. Input Sanitization (XSS & NoSQL Injection Payloads)
  try {
    const maliciousInput = {
      $where: "function() { return true; }",
      "user.role": "admin",
      comment: "<script>alert('xss')</script>Hello <b>world</b>",
    };
    const sanitized = sanitizeNoSqlInput(maliciousInput);
    recordTest(
      "Security",
      "25. Input Sanitization (NoSQL & XSS Neutralization)",
      sanitized.$where === undefined &&
        sanitized["user.role"] === undefined &&
        sanitized.comment === "Hello world"
    );
  } catch (err: any) {
    recordTest("Security", "25. Input Sanitization", false, err.message);
  }

  // 26. Invalid / Tampered Token Misuse Defense
  try {
    const tamperedToken = user1Token + "tampered_signature";
    const verification = verifyToken(tamperedToken);
    recordTest(
      "Security",
      "26. Tampered Token Rejection",
      verification.isValid === false
    );
  } catch (err: any) {
    recordTest("Security", "26. Tampered Token Rejection", false, err.message);
  }

  // 27. Invalid Order State Transition Defense
  try {
    // Attempt illegal transition: pending directly to delivered
    const testOrderForTransition = await OrderModel.create({
      userId: user1._id,
      books: [{ bookId: sampleBook._id, title: sampleBook.title, price: 100, quantity: 1, subtotal: 100 }],
      totalAmount: 200,
      status: "pending",
    });

    await updateOrderStatusService(testOrderForTransition._id.toString(), {
      status: "delivered", // Illegal transition
    });
    recordTest("Security", "27. Illegal State Transition Defense", false, "Should prevent illegal status skip");
  } catch (err: any) {
    recordTest(
      "Security",
      "27. Illegal State Transition Defense",
      err.status === 400 || err.message.includes("Invalid order status transition")
    );
  }

  // Cleanup test entities
  console.log("\n🧹 Cleaning up test artifacts...");
  if (user1) await UserModel.findByIdAndDelete(user1._id);
  if (user2) await UserModel.findByIdAndDelete(user2._id);
  if (adminUser) await UserModel.findByIdAndDelete(adminUser._id);
  if (createdBookId) await BookModel.findByIdAndDelete(createdBookId);

  console.log("\n================================================================================");
  console.log(`📊 FINAL QC SUMMARY: ${results.passed} / ${results.total} Tests Passed (${((results.passed / results.total) * 100).toFixed(1)}%)`);
  console.log("================================================================================");

  await mongoose.disconnect();
}

runAudit().catch((err) => {
  console.error("FATAL ERROR during audit:", err);
  process.exit(1);
});
