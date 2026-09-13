import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true, index: true },
    author: { type: String, required: true, trim: true, index: true },
    genre: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    image: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    },
    price: { type: Number, required: true, min: 0, index: true },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 20, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5, index: true },
    totalReviews: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound text index for fuzzy search across title, author, genre, and description
bookSchema.index({
  title: "text",
  author: "text",
  genre: "text",
  description: "text",
});

// Secondary compound indexes for common query patterns
bookSchema.index({ genre: 1, price: 1 });
bookSchema.index({ createdAt: -1 });

export const BookModel = mongoose.model("Book", bookSchema);
