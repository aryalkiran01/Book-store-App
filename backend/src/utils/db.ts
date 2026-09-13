import mongoose from "mongoose";
import { env } from "./config";

const uri = env.MONGO_URI;

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established successfully.");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error occurred:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected.");
});

export async function createDBConnection() {
  const db = await mongoose.connect(uri, {
    dbName: "book_review_app_db",
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  return db;
}

