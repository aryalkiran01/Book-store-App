#!/usr/bin/env node
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/book_review_app_db';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

async function createAdmin() {
  const args = parseArgs();
  const email = (args.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = (args.password || process.env.ADMIN_PASSWORD || '').trim();
  const username = (args.username || process.env.ADMIN_USERNAME || 'Administrator').trim();

  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid --email argument is required.');
    console.log('Usage: node scripts/create-admin.mjs --email admin@example.com --password YourStrongPassword123! [--username SuperAdmin]');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Error: A secure --password of at least 8 characters is required.');
    process.exit(1);
  }

  try {
    console.log(`Connecting to database...`);
    await mongoose.connect(MONGO_URI);

    const UserSchema = new mongoose.Schema(
      {
        username: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
      },
      { timestamps: true }
    );

    const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      existingUser.role = 'admin';
      existingUser.password = hashedPassword;
      if (username) existingUser.username = username;
      await existingUser.save();
      console.log(`🛡️ Successfully updated and promoted existing user '${email}' to Administrator.`);
    } else {
      await UserModel.create({
        username,
        email,
        password: hashedPassword,
        role: 'admin',
      });
      console.log(`🛡️ Successfully created new Administrator account for '${email}'.`);
    }

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating administrator account:', error.message);
    process.exit(1);
  }
}

createAdmin();
