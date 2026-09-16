import { Request, Response, NextFunction } from "express";
import {
  addToCartService,
  clearCartService,
  getCartService,
  removeFromCartService,
  syncGuestCartService,
  updateCartItemQuantityService,
} from "./service";

export async function getCartController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const cart = await getCartService(userId);
    res.status(200).json({
      message: "Cart retrieved successfully",
      isSuccess: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

export async function addToCartController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const { bookId, quantity } = req.body;

    if (!bookId) {
      res.status(400).json({
        message: "bookId is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const cart = await addToCartService(userId, bookId, Number(quantity) || 1);
    res.status(200).json({
      message: "Item added to cart",
      isSuccess: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCartItemController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const bookId = req.params.bookId || req.body.bookId;
    const quantity = Number(req.body.quantity);

    if (!bookId || isNaN(quantity)) {
      res.status(400).json({
        message: "bookId and quantity are required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const cart = await updateCartItemQuantityService(userId, bookId, quantity);
    res.status(200).json({
      message: "Cart updated successfully",
      isSuccess: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeFromCartController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const bookId = req.params.bookId;

    const cart = await removeFromCartService(userId, bookId);
    res.status(200).json({
      message: "Item removed from cart",
      isSuccess: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

export async function syncCartController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const items = req.body.items || [];

    const cart = await syncGuestCartService(userId, items);
    res.status(200).json({
      message: "Cart synchronized successfully",
      isSuccess: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

export async function clearCartController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const cart = await clearCartService(userId);
    res.status(200).json({
      message: "Cart cleared successfully",
      isSuccess: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}
