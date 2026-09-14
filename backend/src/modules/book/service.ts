import { APIError } from "../../utils/error";
import { BookModel } from "./model";
import { TAddBookControllerInput } from "./validation";
import { validateObjectId } from "../../utils/security";
import { BookProviderService } from "./provider";

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
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
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
  const book = await BookModel.findByIdAndDelete(id);
  if (!book) {
    throw APIError.notFound("Book not found");
  }
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
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (query?.genre && query.genre !== "All") {
    filter.genre = { $regex: new RegExp(query.genre, "i") };
  }

  if (query?.author) {
    filter.author = { $regex: new RegExp(query.author, "i") };
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

  // Automatic External Discovery: If MongoDB has insufficient results, discover from Open Library & cache
  if (books.length === 0 || (query?.search && books.length < limit && page === 1)) {
    try {
      if (query?.search && query.search.trim()) {
        const external = await BookProviderService.searchExternalBooks(query.search.trim(), 1, 15);
        if (external.books.length > 0) {
          await BookProviderService.persistExternalBooksBatch(external.books);
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
        const external = await BookProviderService.discoverBooksBySubject(query.genre, 15);
        if (external.length > 0) {
          await BookProviderService.persistExternalBooksBatch(external);
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
        // Broad initial empty catalog discovery
        const subjects = ["fiction", "business", "science_fiction", "self-help", "history", "technology"];
        const discoveries = await Promise.all(
          subjects.map((s) => BookProviderService.discoverBooksBySubject(s, 5))
        );
        const flattened = discoveries.flat();
        if (flattened.length > 0) {
          await BookProviderService.persistExternalBooksBatch(flattened);
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
      console.warn("Automatic external discovery non-fatal warning:", err.message);
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
  validateObjectId(id, "Book ID");
  const book = await BookModel.findById(id);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  return book;
}


export async function getSearchSuggestionsService(query: string) {
  if (!query || !query.trim()) {
    return [];
  }

  const s = query.trim();
  const searchRegex = new RegExp(s, "i");

  const suggestions = await BookModel.find({
    $or: [
      { title: searchRegex },
      { author: searchRegex },
      { genre: searchRegex },
      { isbn: searchRegex },
    ],
  })
    .select("title author genre price discountPercentage image rating stock")
    .limit(6)
    .lean();

  return suggestions;
}
