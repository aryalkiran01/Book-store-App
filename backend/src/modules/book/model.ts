import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
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
    stock: { type: Number, default: 20, min: 0, index: true },
    reservedStock: { type: Number, default: 0, min: 0 },
    isbn: { type: String, default: "", trim: true },
    googleBooksId: { type: String, default: "", trim: true },
    openLibraryId: { type: String, default: "", trim: true },
    coverId: { type: String, default: "", trim: true },
    publisher: { type: String, default: "", trim: true },
    publicationDate: { type: String, default: "" },
    pages: { type: Number, default: 0, min: 0 },
    language: { type: String, default: "English" },
    averageRating: { type: Number, default: 0, min: 0, max: 5, index: true },
    totalReviews: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    isAvailableInStore: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    source: {
      type: String,
      enum: ["google_books", "openlibrary", "manual", "seeded"],
      default: "manual",
      index: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookSchema.virtual("availableStock").get(function () {
  return Math.max(0, (this.stock || 0) - (this.reservedStock || 0));
});

// 1. Compound uniqueness: (Title + Author) allows same title for different authors
bookSchema.index({ title: 1, author: 1 }, { unique: true });

// 2. Partial unique index for ISBN (only applies when isbn is non-empty string)
bookSchema.index(
  { isbn: 1 },
  {
    unique: true,
    partialFilterExpression: { isbn: { $type: "string", $gt: "" } },
  }
);

// 3. Partial unique index for Google Books ID (only applies when googleBooksId is non-empty string)
bookSchema.index(
  { googleBooksId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleBooksId: { $type: "string", $gt: "" } },
  }
);

// 4. Partial unique index for Open Library ID (only applies when openLibraryId is non-empty string)
bookSchema.index(
  { openLibraryId: 1 },
  {
    unique: true,
    partialFilterExpression: { openLibraryId: { $type: "string", $gt: "" } },
  }
);

// Compound text index for fuzzy search across title, author, genre, and description
bookSchema.index(
  {
    title: "text",
    author: "text",
    genre: "text",
    description: "text",
  },
  {
    default_language: "none",
    language_override: "none",
  }
);

// Secondary compound indexes for common query patterns
bookSchema.index({ genre: 1, price: 1 });
bookSchema.index({ isDeleted: 1, stock: 1, createdAt: -1 });
bookSchema.index({ featured: 1, isDeleted: 1, createdAt: -1 });
bookSchema.index({ isNewArrival: 1, isDeleted: 1, createdAt: -1 });
bookSchema.index({ createdAt: -1 });

export const BookModel = mongoose.model("Book", bookSchema);
