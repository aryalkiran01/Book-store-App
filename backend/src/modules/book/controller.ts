import { Request, Response, NextFunction } from "express";
import { APIError } from "../../utils/error";
import { AddBookControllerSchema } from "./validation";
import { TUpdateBookControllerSchema } from "./validation";
import {
  createBookService,
  deleteBookService,
  getBookByIdService,
  getBooksService,
  updateBookService,
  // searchGoogleBooksService,
} from "./service";
import { getReviewsByBookIdService } from "../review/service";

export async function addBookController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body;

    const { success, error, data } = AddBookControllerSchema.safeParse(body);
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Invalid request",
        data: null,
        isSuccess: false,
        errors: errors,
      });
      return;
    }

    const book = await createBookService(data);

    res.status(201).json({
      message: "Book created sucessfully",
      isSuccess: true,
      data: {
        image: book.image,
        id: book._id,
        Title: book.title,
        author: book.author,
        description: book.description,
        genres: book.genre,
        price: book.price,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBookController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body;

    const bookId = req.params.bookId;

    const { success, error, data } = AddBookControllerSchema.safeParse(body);
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Invalid request",
        data: null,
        isSuccess: false,
        errors: errors,
      });
      return;
    }

    const book = await updateBookService(bookId, data);

    res.status(201).json({
      message: "Book updated sucessfully",
      isSuccess: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBookController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const bookId = req.params.bookId;
    const book = await deleteBookService(bookId);

    res.status(201).json({
      message: "Book deleted sucessfully",
      isSuccess: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBooksController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, genre, author } = req.query;
    const books = await getBooksService({
      search: typeof search === "string" ? search : undefined,
      genre: typeof genre === "string" ? genre : undefined,
      author: typeof author === "string" ? author : undefined,
    });
    res.status(200).json({
      message: "Books retrieved successfully",
      isSuccess: true,
      data: books,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.bookId || req.params.id;

    if (!id) {
      res.status(400).json({
        message: "Book ID is required",
        data: null,
        isSuccess: false,
      });
      return;
    }

    const result = await getBookByIdService(id);
    const review = await getReviewsByBookIdService(id);

    res.status(200).json({
      message: "Book found successfully",
      data: { result, review, ...result.toObject(), reviews: review },
      isSuccess: true,
    });
  } catch (e) {
    next(e);
  }
}


// export async function searchBooksController(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) {
//   try {
//     const { q } = req.query;

//     if (!q || typeof q !== "string") {
//       res.status(400).json({
//         message: "Search query (q) is required",
//         isSuccess: false,
//         data: null,
//       });
//       return;
//     }

//     const books = await searchGoogleBooksService(q);

//     res.status(200).json({
//       message: "Books fetched from Google API",
//       isSuccess: true,
//       data: books,
//     });
//   } catch (error) {
//     next(new APIError(500, (error as Error).message));
//   }
// }
