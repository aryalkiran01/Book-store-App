/**
 * Production Database Backup Utility
 * Usage: node scripts/backup-db.mjs [optional-output-dir]
 */
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/book_review_app_db";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = process.argv[2] || path.join(process.cwd(), "backups", `backup-${timestamp}`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log(`Starting MongoDB backup to: ${backupDir}`);
const command = `mongodump --uri="${mongoUri}" --out="${backupDir}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error("Backup failed or mongodump CLI tool not found in PATH:", error.message);
    console.log("Tip: Ensure 'mongodump' from MongoDB Database Tools is installed on the host.");
    return;
  }
  console.log("Database backup completed successfully!");
  console.log(stdout || stderr);
});
