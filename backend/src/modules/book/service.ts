import { APIError } from "../../utils/error";
import { BookModel } from "./model";
import { TAddBookControllerInput } from "./validation";
import { validateObjectId } from "../../utils/security";
import { BookDiscoveryService, BookProviderService } from "./provider";
import mongoose from "mongoose";

export async function createBookService(input: TAddBookControllerInput) {
  const {
    title,
    genre,
    author,
    description,
    image,
    price,
    discountPercentage,
    stock,
    isbn,
    publisher,
    publicationDate,
    pages,
    language,
    featured,
    isNewArrival,
  } = input;

  const cleanTitle = title.trim();
  const cleanAuthor = author.trim();
  const cleanIsbn = isbn?.trim() || "";

  if (cleanIsbn) {
    const existingByIsbn = await BookModel.findOne({ isbn: cleanIsbn });
    if (existingByIsbn) {
      throw APIError.conflict(`A book with ISBN "${cleanIsbn}" already exists.`);
    }
  }

  const existingBook = await BookModel.findOne({
    title: cleanTitle,
    author: cleanAuthor,
  });
  if (existingBook) {
    throw APIError.conflict(
      `A book titled "${cleanTitle}" by ${cleanAuthor} already exists.`
    );
  }

  const newBook = new BookModel({
    title: cleanTitle,
    genre,
    author: cleanAuthor,
    description: description || "",
    image:
      image ||
      "",
    price,
    discountPercentage: discountPercentage ?? 0,
    stock: stock ?? 20,
    isbn: cleanIsbn,
    publisher: publisher || "",
    publicationDate: publicationDate || "",
    pages: pages || 0,
    language: language || "English",
    featured: featured ?? false,
    isNewArrival: isNewArrival ?? false,
    source: "manual",
    isAvailableInStore: true,
  });

  await newBook.save();

  return newBook;
}

export async function updateBookService(
  bookId: string,
  input: Partial<TAddBookControllerInput>
) {
  validateObjectId(bookId, "Book ID");

  const book = await BookModel.findById(bookId);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  const targetTitle = input.title !== undefined ? input.title.trim() : book.title;
  const targetAuthor = input.author !== undefined ? input.author.trim() : book.author;
  const targetIsbn = input.isbn !== undefined ? input.isbn.trim() : book.isbn;

  if (targetIsbn && targetIsbn !== book.isbn) {
    const existingIsbn = await BookModel.findOne({
      isbn: targetIsbn,
      _id: { $ne: bookId },
    });
    if (existingIsbn) {
      throw APIError.conflict(`A book with ISBN "${targetIsbn}" already exists.`);
    }
  }

  if (
    (input.title !== undefined && input.title.trim() !== book.title) ||
    (input.author !== undefined && input.author.trim() !== book.author)
  ) {
    const existingTitleAuthor = await BookModel.findOne({
      title: targetTitle,
      author: targetAuthor,
      _id: { $ne: bookId },
    });
    if (existingTitleAuthor) {
      throw APIError.conflict(
        `A book titled "${targetTitle}" by ${targetAuthor} already exists.`
      );
    }
  }

  if (input.title !== undefined) book.title = input.title;
  if (input.genre !== undefined) book.genre = input.genre;
  if (input.author !== undefined) book.author = input.author;
  if (input.description !== undefined) book.description = input.description;
  if (input.price !== undefined) book.price = input.price;
  if (input.discountPercentage !== undefined)
    book.discountPercentage = input.discountPercentage;
  if (input.stock !== undefined) book.stock = input.stock;
  if (input.isbn !== undefined) book.isbn = input.isbn;
  if (input.publisher !== undefined) book.publisher = input.publisher;
  if (input.publicationDate !== undefined)
    book.publicationDate = input.publicationDate;
  if (input.pages !== undefined) book.pages = input.pages;
  if (input.language !== undefined) book.language = input.language;
  if (input.featured !== undefined) book.featured = input.featured;
  if (input.isNewArrival !== undefined) book.isNewArrival = input.isNewArrival;
  if (input.image) book.image = input.image;

  await book.save();

  return book;
}

export async function deleteBookService(id: string) {
  validateObjectId(id, "Book ID");
  const book = await BookModel.findById(id);
  if (!book || book.isDeleted) {
    throw APIError.notFound("Book not found");
  }
  book.isDeleted = true;
  book.deletedAt = new Date();
  book.isActive = false;
  await book.save();
  return book;
}

export interface BookQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  author?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "price-asc" | "price-desc" | "rating" | "popular";
  featured?: boolean;
  isNewArrival?: boolean;
  inStock?: boolean;
}

export async function getBooksService(query?: BookQueryParams) {
  const page = Math.min(500, Math.max(1, Number(query?.page) || 1));
  const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {
    isDeleted: { $ne: true },
    isActive: { $ne: false },
  };

  if (query?.genre && query.genre !== "All") {
    const escapedGenre = query.genre.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.genre = { $regex: new RegExp(escapedGenre, "i") };
  }

  if (query?.author) {
    const escapedAuthor = query.author.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.author = { $regex: new RegExp(escapedAuthor, "i") };
  }

  if (query?.featured !== undefined) {
    filter.featured = query.featured;
  }

  if (query?.isNewArrival !== undefined) {
    filter.isNewArrival = query.isNewArrival;
  }

  if (query?.inStock) {
    filter.stock = { $gt: 0 };
  }

  if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
    filter.price = {};
    if (query?.minPrice !== undefined && !isNaN(Number(query.minPrice))) {
      filter.price.$gte = Number(query.minPrice);
    }
    if (query?.maxPrice !== undefined && !isNaN(Number(query.maxPrice))) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }

  if (query?.search) {
    const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (escapedSearch) {
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { genre: searchRegex },
        { description: searchRegex },
        { isbn: searchRegex },
        { publisher: searchRegex },
      ];
    }
  }

  // Determine sort order
  let sortOption: Record<string, any> = { createdAt: -1 };
  if (query?.sortBy === "price-asc") {
    sortOption = { price: 1 };
  } else if (query?.sortBy === "price-desc") {
    sortOption = { price: -1 };
  } else if (query?.sortBy === "rating") {
    sortOption = { averageRating: -1, totalReviews: -1 };
  } else if (query?.sortBy === "popular") {
    sortOption = { totalReviews: -1, averageRating: -1 };
  } else {
    sortOption = { createdAt: -1 };
  }

  let [total, books] = await Promise.all([
    BookModel.countDocuments(filter),
    BookModel.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  // Automatic External Discovery: If MongoDB has 0 books or active search with few results on page 1
  if (books.length === 0 || (query?.search && books.length < limit && page === 1)) {
    try {
      if (query?.search && query.search.trim()) {
        const external = await BookDiscoveryService.searchBooks(query.search.trim(), 1, 15);
        if (external.books.length > 0) {
          await BookDiscoveryService.persistExternalBooksBatch(external.books);
          [total, books] = await Promise.all([
            BookModel.countDocuments(filter),
            BookModel.find(filter)
              .sort(sortOption)
              .skip(skip)
              .limit(limit)
              .lean(),
          ]);
        }
      } else if (query?.genre && query.genre !== "All" && books.length === 0) {
        const external = await BookDiscoveryService.discoverBooksBySubject(query.genre, 15);
        if (external.length > 0) {
          await BookDiscoveryService.persistExternalBooksBatch(external);
          [total, books] = await Promise.all([
            BookModel.countDocuments(filter),
            BookModel.find(filter)
              .sort(sortOption)
              .skip(skip)
              .limit(limit)
              .lean(),
          ]);
        }
      } else if (!query?.search && (!query?.genre || query.genre === "All") && total === 0) {
        // Broad initial empty catalog discovery across bestsellers
        const subjects = ["bestsellers", "fiction", "business", "science_fiction", "self-help", "technology"];
        const discoveries = await Promise.all(
          subjects.map((s) => BookDiscoveryService.discoverBooksBySubject(s, 5))
        );
        const flattened = discoveries.flat();
        if (flattened.length > 0) {
          await BookDiscoveryService.persistExternalBooksBatch(flattened);
          [total, books] = await Promise.all([
            BookModel.countDocuments(filter),
            BookModel.find(filter)
              .sort(sortOption)
              .skip(skip)
              .limit(limit)
              .lean(),
          ]);
        }
      }
    } catch (err: any) {
      console.warn("Automatic external discovery warning:", err.message);
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    books,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getBookByIdService(id: string) {
  if (!id || !id.trim()) {
    throw APIError.badRequest("Book ID is required");
  }

  const cleanId = id.trim();

  // 1. If valid Mongo ObjectId, query by _id
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const book = await BookModel.findOne({ _id: cleanId, isDeleted: { $ne: true } });
    if (book) return book;
  }

  // 2. Query by googleBooksId, openLibraryId, or isbn
  const existingByAlt = await BookModel.findOne({
    isDeleted: { $ne: true },
    $or: [
      { googleBooksId: cleanId },
      { openLibraryId: cleanId },
      { isbn: cleanId },
    ],
  });

  if (existingByAlt) {
    return existingByAlt;
  }

  // 3. If still not in MongoDB, search via external discovery and cache
  try {
    const searchRes = await BookDiscoveryService.searchBooks(cleanId, 1, 1);
    if (searchRes.books.length > 0) {
      const persisted = await BookDiscoveryService.persistExternalBookToMongo(searchRes.books[0]);
      if (persisted && !persisted.isDeleted) return persisted;
    }
  } catch (err: any) {
    console.warn("External lookup for book ID failed:", err.message);
  }

  throw APIError.notFound("Book not found");
}

export async function getHomepageFeedsService() {
  return BookDiscoveryService.getHomepageFeeds();
}

export async function getSearchSuggestionsService(query: string) {
  if (!query || !query.trim()) {
    return [];
  }

  const s = query.trim();
  const searchRegex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  let suggestions = await BookModel.find({
    isDeleted: { $ne: true },
    isActive: { $ne: false },
    $or: [
      { title: searchRegex },
      { author: searchRegex },
      { genre: searchRegex },
      { isbn: searchRegex },
    ],
  })
    .select("title author genre price discountPercentage image rating averageRating stock")
    .limit(6)
    .lean();

  if (suggestions.length < 3 && s.length >= 2) {
    try {
      const external = await BookDiscoveryService.searchBooks(s, 1, 5);
      if (external.books.length > 0) {
        const persisted = await BookDiscoveryService.persistAndHydrateBatch(external.books);
        const existingIds = new Set(suggestions.map((item: any) => item._id.toString()));
        for (const p of persisted) {
          if (p._id && !existingIds.has(p._id.toString())) {
            suggestions.push(p);
            if (suggestions.length >= 6) break;
          }
        }
      }
    } catch {
      // Graceful fallback to existing suggestions
    }
  }

  return suggestions;
}

