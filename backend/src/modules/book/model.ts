import mongoose from "mongoose";
import { number } from "zod";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  image: { type: String },
  price: { type: Number, required: true },
});

export const BookModel = mongoose.model("Book", bookSchema);
