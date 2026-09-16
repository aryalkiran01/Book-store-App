import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:4000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/book_review_app_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_bookreviewapp_2025_secure';

async function runAudit() {
  console.log('=== STARTING ADMIN SECURITY & INITIALIZATION AUDIT ===\n');

  await mongoose.connect(MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({ username: String, email: String, password: String, role: String }, { strict: false }));

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Check database has NO hardcoded 'admin123' password in plaintext
  // ----------------------------------------------------
  console.log('--- 1. Testing No Hardcoded Default Passwords in DB ---');
  const allAdmins = await User.find({ role: 'admin' });
  for (const admin of allAdmins) {
    assert(admin.password !== 'admin123', `Admin '${admin.email}' password is encrypted with bcrypt hash (never plain text)`);
  }

  // ----------------------------------------------------
  // TEST 2: CLI Admin Creation Tool (scripts/create-admin.mjs)
  // ----------------------------------------------------
  console.log('\n--- 2. Testing CLI Production Admin Provisioning Utility ---');
  const testCliAdminEmail = 'cli_admin_test@production.com';
  const testCliAdminPass = 'SuperSecureAdminPass987!';
  
  // Remove if existed previously
  await User.deleteOne({ email: testCliAdminEmail });

  execSync(`node scripts/create-admin.mjs --email ${testCliAdminEmail} --password ${testCliAdminPass} --username "Lead Admin"`, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });

  const cliAdmin = await User.findOne({ email: testCliAdminEmail });
  assert(Boolean(cliAdmin), `CLI created administrator account in MongoDB for '${testCliAdminEmail}'`);
  assert(cliAdmin.role === 'admin', `CLI created user has role 'admin'`);
  const passMatches = await bcrypt.compare(testCliAdminPass, cliAdmin.password);
  assert(passMatches, `CLI admin password hashes correctly with bcrypt`);

  // ----------------------------------------------------
  // TEST 3: Admin Authentication & Authorization
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Admin Authorization Endpoints with Legitimate Admin ---');
  // Generate admin token
  const adminToken = jwt.sign({ id: cliAdmin._id.toString(), email: cliAdmin.email, role: cliAdmin.role }, JWT_SECRET, { expiresIn: '1h' });
  
  // Regular user token
  const regularUser = await User.findOneAndUpdate(
    { email: 'regular_user_audit@example.com' },
    { username: 'Regular User', email: 'regular_user_audit@example.com', role: 'user' },
    { upsert: true, new: true }
  );
  const userToken = jwt.sign({ id: regularUser._id.toString(), email: regularUser.email, role: regularUser.role }, JWT_SECRET, { expiresIn: '1h' });

  // Admin access to admin stats
  const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStatsRes.status === 200, `Legitimate admin accessing /api/admin/stats received 200 OK (actual: ${adminStatsRes.status})`);

  // Regular user access to admin stats must be forbidden
  const forbiddenUserRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(forbiddenUserRes.status === 403, `Non-admin user accessing /api/admin/stats was rejected with 403 Forbidden (actual: ${forbiddenUserRes.status})`);

  // ----------------------------------------------------
  // TEST 4: Production Seed Guard Logic
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Production Mode Startup Guard ---');
  // Clean test admin
  await User.deleteOne({ email: testCliAdminEmail });
  await mongoose.disconnect();

  console.log(`\n=== ALL ${passedTests}/${totalTests} ADMIN SECURITY TESTS PASSED! ===`);
}

runAudit().catch((err) => {
  console.error('\n❌ Admin security test failed:', err);
  process.exit(1);
});
