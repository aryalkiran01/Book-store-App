import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const testFiles = [
  "auth.test.mjs",
  "authorization.test.mjs",
  "orders.test.mjs",
  "payments.test.mjs",
  "reviews.test.mjs",
  "admin.test.mjs",
];

console.log("=================================================");
console.log("🚀 STARTING AUTOMATED BUSINESS-CRITICAL TEST SUITE");
console.log("=================================================\n");

let passedSuites = 0;
let failedSuites = 0;
const results = [];

for (const file of testFiles) {
  const filePath = join(__dirname, file);
  console.log(`\n▶ Running Suite: ${file}...`);

  await new Promise((resolve) => {
    const proc = spawn(process.execPath, ["--test", filePath], {
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
