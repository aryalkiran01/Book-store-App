import { Request, Response, NextFunction } from "express";
import {
  clearWishlistService,
  getWishlistService,
  removeFromWishlistService,
  syncGuestWishlistService,
  toggleWishlistItemService,
} from "./service";

export async function getWishlistController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const wishlist = await getWishlistService(userId);
    res.status(200).json({
      message: "Wishlist retrieved successfully",
      isSuccess: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleWishlistController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const bookId = req.params.bookId || req.body.bookId;

    if (!bookId) {
      res.status(400).json({
        message: "bookId is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const result = await toggleWishlistItemService(userId, bookId);
    res.status(200).json({
      message: result.message,
      isSuccess: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeFromWishlistController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const bookId = req.params.bookId;

    const wishlist = await removeFromWishlistService(userId, bookId);
    res.status(200).json({
      message: "Removed from wishlist",
      isSuccess: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
}

export async function syncWishlistController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const bookIds = req.body.bookIds || [];

    const wishlist = await syncGuestWishlistService(userId, bookIds);
    res.status(200).json({
      message: "Wishlist synchronized successfully",
      isSuccess: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
}

export async function clearWishlistController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const wishlist = await clearWishlistService(userId);
    res.status(200).json({
      message: "Wishlist cleared successfully",
      isSuccess: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
}
