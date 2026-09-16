import { Request, Response, NextFunction } from "express";
import { APIError } from "../../utils/error";
import { AddBookControllerSchema } from "./validation";
import { TUpdateBookControllerSchema } from "./validation";
import { BookModel } from "./model";
import {
  createBookService,
  deleteBookService,
  getBookByIdService,
  getBooksService,
  getHomepageFeedsService,
  getRecommendedBooksService,
  getSearchSuggestionsService,
  updateBookService,
} from "./service";
import { getReviewsByBookIdService } from "../review/service";
import { BookDiscoveryService } from "./provider";

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
      message: "Book created successfully",
      isSuccess: true,
      data: book,
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

    const { success, error, data } = TUpdateBookControllerSchema.safeParse(body);
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

    res.status(200).json({
      message: "Book updated successfully",
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

    res.status(200).json({
      message: "Book deleted successfully",
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
    const {
      search,
      genre,
      author,
      page,
      limit,
      minPrice,
      maxPrice,
      sortBy,
      featured,
      isNewArrival,
      inStock,
    } = req.query;

    const result = await getBooksService({
      search: typeof search === "string" ? search : undefined,
      genre: typeof genre === "string" ? genre : undefined,
      author: typeof author === "string" ? author : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      sortBy: typeof sortBy === "string" ? (sortBy as any) : undefined,
      featured:
        featured === "true" ? true : featured === "false" ? false : undefined,
      isNewArrival:
        isNewArrival === "true"
          ? true
          : isNewArrival === "false"
          ? false
          : undefined,
      inStock: inStock === "true" ? true : inStock === "false" ? false : undefined,
    });

    res.status(200).json({
      message: "Books retrieved successfully",
      isSuccess: true,
      data: result.books,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGenresController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const genres: string[] = await BookModel.distinct("genre");
    const formatted = genres
      .flatMap((g: string) => g.split(",").map((s: string) => s.trim()))
      .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
      .sort();

    res.status(200).json({
      message: "Genres retrieved successfully",
      isSuccess: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeaturedBooksController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let books = await BookModel.find({ featured: true })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(8)
      .lean();

    // Resilient discovery: if fewer than 4 featured books, discover bestsellers
    if (books.length < 4) {
      const discovered = await BookDiscoveryService.discoverBooksBySubject("bestsellers", 8);
      if (discovered.length > 0) {
        const persisted = await BookDiscoveryService.persistAndHydrateBatch(discovered);
        const existingIds = new Set(books.map((b: any) => b._id.toString()));
        for (const p of persisted) {
          if (p._id && !existingIds.has(p._id.toString())) {
            books.push(p);
            if (books.length >= 8) break;
          }
        }
      }
    }

    res.status(200).json({
      message: "Featured books retrieved successfully",
      isSuccess: true,
      data: books,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNewArrivalsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let books = await BookModel.find({ isNewArrival: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // Resilient discovery: if fewer than 4 new arrivals, discover psychology/fiction
    if (books.length < 4) {
      const discovered = await BookDiscoveryService.discoverBooksBySubject("psychology", 8);
      if (discovered.length > 0) {
        const persisted = await BookDiscoveryService.persistAndHydrateBatch(discovered);
        const existingIds = new Set(books.map((b: any) => b._id.toString()));
        for (const p of persisted) {
          if (p._id && !existingIds.has(p._id.toString())) {
            books.push(p);
            if (books.length >= 8) break;
          }
        }
      }
    }

    res.status(200).json({
      message: "New arrivals retrieved successfully",
      isSuccess: true,
      data: books,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHomepageFeedsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const feeds = await getHomepageFeedsService();
    res.status(200).json({
      message: "Homepage feeds retrieved successfully",
      isSuccess: true,
      data: feeds,
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


export async function getSearchSuggestionsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = (req.query.q || req.query.query || req.query.search || "") as string;
    const suggestions = await getSearchSuggestionsService(q);
    res.status(200).json({
      message: "Search suggestions fetched successfully",
      isSuccess: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendationsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const bookId = req.params.bookId || req.params.id;
    const limit = Number(req.query.limit) || 6;
    const recommendations = await getRecommendedBooksService(bookId, limit);
    res.status(200).json({
      message: "Book recommendations fetched successfully",
      isSuccess: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}
