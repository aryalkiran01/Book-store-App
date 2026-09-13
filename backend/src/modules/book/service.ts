import { APIError } from "../../utils/error";
import { BookModel } from "./model";
import { TAddBookControllerInput } from "./validation";
import { validateObjectId } from "../../utils/security";

export async function createBookService(input: TAddBookControllerInput) {
  const { title, genre, author, description, image, price } = input;

  const existingBook = await BookModel.findOne({ title });
  if (existingBook) {
    throw APIError.conflict("A book with this title already exists");
  }

  const newBook = new BookModel({
    title,
    genre,
    author,
    description: description || "",
    image: image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    price,
  });

  await newBook.save();

  return newBook;
}

export async function updateBookService(
  bookId: string,
  input: TAddBookControllerInput
) {
  validateObjectId(bookId, "Book ID");
  const { title, genre, author, description, image, price } = input;

  const book = await BookModel.findById(bookId);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  // If title was changed, check that new title isn't already taken by another book
  if (title !== book.title) {
    const existingTitle = await BookModel.findOne({ title, _id: { $ne: bookId } });
    if (existingTitle) {
      throw APIError.conflict("A book with this title already exists");
    }
  }

  book.title = title;
  book.genre = genre;
  book.author = author;
  book.description = description || "";
  book.price = price;
  if (image) book.image = image;
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

export async function getBooksService(query?: {
  search?: string;
  genre?: string;
  author?: string;
}) {
  const filter: Record<string, any> = {};

  if (query?.genre && query.genre !== "All") {
    filter.genre = { $regex: new RegExp(query.genre, "i") };
  }

  if (query?.author) {
    filter.author = { $regex: new RegExp(query.author, "i") };
  }

  if (query?.search) {
    const searchRegex = new RegExp(query.search, "i");
    filter.$or = [
      { title: searchRegex },
      { author: searchRegex },
      { genre: searchRegex },
      { description: searchRegex },
    ];
  }

  const books = await BookModel.find(filter).sort({ created_at: -1 });
  return books;
}

export async function getBookByIdService(id: string) {
  validateObjectId(id, "Book ID");
  const book = await BookModel.findById(id);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  return book;
}


// google books
// export async function searchGoogleBooksService(query: string) {
//   const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;

//   const res = await fetch(apiUrl);
//   if (!res.ok) {
//     throw new Error("Failed to fetch from Google Books API");
//   }

//   const json = await res.json();

//   return json.items?.map((item: any) => {
//     const info = item.volumeInfo;
//     return {
//       title: info.title,
//       author: info.authors?.[0] || "Unknown",
//       genre: info.categories?.[0] || "General",
//       description: info.description || "No description",
//       image: info.imageLinks?.thumbnail || "",
//       previewLink: info.previewLink || "",
//     };
//   });
// }
