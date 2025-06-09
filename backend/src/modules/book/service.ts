import { APIError } from "../../utils/error"
import { BookModel } from "./model";
import { TAddBookControllerInput } from "./validation";

export async function createBookService(input: TAddBookControllerInput) {
  const { title, genre, author, description, image, price } = input;

  const book = await BookModel.findOne({ title });
  if (book) {
    throw APIError.conflict("Book already exists");
  }

  const newBook = new BookModel({
    title,
    genre,
    author,
    description,
    image: image || "/rich and poor dad.jpg",
    price,
  });

  await newBook.save();

  return newBook;
}

export async function updateBookService(
  bookId: string,
  input: TAddBookControllerInput
) {
  const { title, genre, author, description, image, price } = input;

  const book = await BookModel.findById(bookId);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  book.title = title;
  book.genre = genre;
  book.author = author;
  book.description = description;
  book.price = price;
  book.image = image;
  await book.save();

  return book;
}

export async function deleteBookService(id: string) {
  const book = await BookModel.findByIdAndDelete(id);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  await BookModel.deleteOne({ _id: id });

  return book;
}

export async function getBooksService() {
  const books = await BookModel.find();
  return books;
}

export async function getBookByIdService(id: string) {
  const book = await BookModel.findById(id);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  return book;
}
// google books
export async function searchGoogleBooksService(query: string) {
  const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;

  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error("Failed to fetch from Google Books API");
  }

  const json = await res.json();

  return json.items?.map((item: any) => {
    const info = item.volumeInfo;
    return {
      title: info.title,
      author: info.authors?.[0] || "Unknown",
      genre: info.categories?.[0] || "General",
      description: info.description || "No description",
      image: info.imageLinks?.thumbnail || "",
      previewLink: info.previewLink || "",
    };
  });
}
