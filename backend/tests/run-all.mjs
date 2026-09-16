import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const testFiles = [
  "book-provider.test.mjs",
  "auth.test.mjs",
  "authorization.test.mjs",
  "orders.test.mjs",
  "payments.test.mjs",
  "reviews.test.mjs",
  "admin.test.mjs",
  "openlibrary-cache.test.mjs",
  "ecommerce-core.test.mjs",
  "security-profile-admin.test.mjs",
  "resilience-catalog.test.mjs",
  "unit-order-calc.test.mjs",
  "security-penetration.test.mjs",
  "e2e-lifecycle.test.mjs",
  "observability-support-seo.test.mjs",
];

console.log("=================================================");
console.log("🚀 STARTING AUTOMATED BUSINESS-CRITICAL TEST SUITE");
console.log("=================================================\n");

// Check if server is running on port 4000
async function isServerRunning() {
  try {
    const res = await fetch("http://localhost:4000/api/books?limit=1", { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

let serverProcess = null;
const alreadyRunning = await isServerRunning();

if (!alreadyRunning) {
  console.log("Starting test backend server on port 4000...");
  serverProcess = spawn(process.execPath, [join(__dirname, "../dist/main.js")], {
    env: { ...process.env, PORT: "4000", NODE_ENV: "test" },
    stdio: "pipe",
  });

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isServerRunning()) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.error("❌ Failed to start test backend server!");
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
  console.log("✅ Backend server is ready for test execution.\n");
}

let passedSuites = 0;
let failedSuites = 0;
const results = [];

try {
  for (const file of testFiles) {
    const filePath = join(__dirname, file);
    console.log(`\n▶ Running Suite: ${file}...`);

    await new Promise((resolve) => {
      const proc = spawn(process.execPath, ["--test", "--test-force-exit", filePath], {
        stdio: "inherit",
        env: process.env,
      });

      proc.on("close", (code) => {
        if (code === 0) {
          passedSuites++;
          results.push({ file, status: "PASS" });
        } else {
          failedSuites++;
          results.push({ file, status: "FAIL" });
        }
        resolve();
      });
    });
  }
} finally {
  if (serverProcess) {
    console.log("\nShutting down test backend server...");
    serverProcess.kill();
  }
}

console.log("\n=================================================");
console.log("📊 TEST EXECUTION SUMMARY");
console.log("=================================================");
for (const res of results) {
  console.log(`  ${res.status === "PASS" ? "✅" : "❌"} ${res.file.padEnd(28)} : ${res.status}`);
}
console.log("-------------------------------------------------");
console.log(`Total Suites : ${testFiles.length}`);
console.log(`Passed Suites: ${passedSuites}`);
console.log(`Failed Suites: ${failedSuites}`);
console.log("=================================================\n");

if (failedSuites > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
