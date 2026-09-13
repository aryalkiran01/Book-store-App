import { TBook } from "../api/book/fetch";

export interface CartItem {
  _id: string;
  title: string;
  author: string;
  image?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  quantity: number;
  stock?: number;
}

export interface WishlistItem {
  _id: string;
  title: string;
  author: string;
  genre?: string;
  image?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  stock?: number;
  addedAt?: string;
}

const CART_KEY = "cart";
const WISHLIST_KEY = "wishlist";

// Notify all components across the app and open tabs
function notifyStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("cart-wishlist-update"));
  }
}

// ---------------------- CART HELPERS ----------------------

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToCart(book: Partial<TBook> & { _id: string }, quantity = 1): CartItem[] {
  const cart = getCart();
  const existingIdx = cart.findIndex((item) => item._id === book._id);

  const effectivePrice =
    book.discountPercentage && book.discountPercentage > 0
      ? Number((book.price! * (1 - book.discountPercentage / 100)).toFixed(2))
      : book.price ?? 0;

  if (existingIdx > -1) {
    const newQty = cart[existingIdx].quantity + quantity;
    const maxStock = book.stock ?? cart[existingIdx].stock ?? 50;
    cart[existingIdx].quantity = Math.min(maxStock, newQty);
  } else {
    cart.push({
      _id: book._id,
      title: book.title || "Untitled Book",
      author: book.author || "Unknown Author",
      image: book.image || "",
      price: effectivePrice,
      originalPrice: book.price || effectivePrice,
      discountPercentage: book.discountPercentage || 0,
      quantity: Math.max(1, quantity),
      stock: book.stock ?? 20,
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyStorageChange();
  return cart;
}

export function updateCartQuantity(bookId: string, quantity: number): CartItem[] {
  let cart = getCart();
  if (quantity <= 0) {
    return removeFromCart(bookId);
  }

  cart = cart.map((item) =>
    item._id === bookId ? { ...item, quantity } : item
  );

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyStorageChange();
  return cart;
}

export function removeFromCart(bookId: string): CartItem[] {
  const cart = getCart().filter((item) => item._id !== bookId);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyStorageChange();
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  notifyStorageChange();
}

// ---------------------- WISHLIST HELPERS ----------------------

export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isInWishlist(bookId: string): boolean {
  return getWishlist().some((item) => item._id === bookId);
}

export function addToWishlist(book: Partial<TBook> & { _id: string }): WishlistItem[] {
  const list = getWishlist();
  if (!list.some((item) => item._id === book._id)) {
    list.push({
      _id: book._id,
      title: book.title || "Untitled Book",
      author: book.author || "Unknown Author",
      genre: book.genre,
      image: book.image || "",
      price: book.price ?? 0,
      discountPercentage: book.discountPercentage || 0,
      stock: book.stock ?? 20,
      addedAt: new Date().toISOString(),
    });
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    notifyStorageChange();
  }
  return list;
}

export function removeFromWishlist(bookId: string): WishlistItem[] {
  const list = getWishlist().filter((item) => item._id !== bookId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  notifyStorageChange();
  return list;
}

export function toggleWishlist(book: Partial<TBook> & { _id: string }): boolean {
  if (isInWishlist(book._id)) {
    removeFromWishlist(book._id);
    return false;
  } else {
    addToWishlist(book);
    return true;
  }
}

export function moveWishlistToCart(book: Partial<TBook> & { _id: string }, quantity = 1): void {
  addToCart(book, quantity);
  removeFromWishlist(book._id);
}
