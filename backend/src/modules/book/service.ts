import { APIError } from "../../utils/error";
import { BookModel } from "./model";
import { TAddBookControllerInput } from "./validation";
import { validateObjectId } from "../../utils/security";

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

  const existingBook = await BookModel.findOne({ title });
  if (existingBook) {
    throw APIError.conflict("A book with this title already exists");
  }

  const newBook = new BookModel({
    title,
    genre,
    author,
    description: description || "",
    image:
      image ||
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    price,
    discountPercentage: discountPercentage ?? 0,
    stock: stock ?? 20,
    isbn: isbn || "",
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

  // If title was changed, check that new title isn't already taken by another book
  if (input.title && input.title !== book.title) {
    const existingTitle = await BookModel.findOne({
      title: input.title,
      _id: { $ne: bookId },
    });
    if (existingTitle) {
      throw APIError.conflict("A book with this title already exists");
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
    const searchRegex = new RegExp(query.search, "i");
    filter.$or = [
      { title: searchRegex },
      { author: searchRegex },
      { genre: searchRegex },
      { description: searchRegex },
      { isbn: searchRegex },
      { publisher: searchRegex },
    ];
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

  const [total, books] = await Promise.all([
    BookModel.countDocuments(filter),
    BookModel.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

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
