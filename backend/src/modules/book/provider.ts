import axios from "axios";
import { BookModel } from "./model";

export interface NormalizedBookData {
  openLibraryId: string;
  title: string;
  author: string;
  isbn: string;
  coverId: string;
  image: string;
  firstPublishYear?: number | string;
  genre: string;
  pages: number;
  publisher: string;
  language: string;
  description?: string;
  price: number;
  discountPercentage: number;
  stock: number;
  source: "openlibrary" | "manual" | "seeded";
}

// Bounded in-memory cache for Open Library responses
export const PROVIDER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_PROVIDER_CACHE_ENTRIES = 300;

interface CachedProviderEntry {
  books: NormalizedBookData[];
  total: number;
  cachedAt: number;
}

const providerCache = new Map<string, CachedProviderEntry>();

export function getProviderCacheStats() {
  return {
    size: providerCache.size,
    maxEntries: MAX_PROVIDER_CACHE_ENTRIES,
    ttlMs: PROVIDER_CACHE_TTL_MS,
  };
}

export function clearProviderCache() {
  providerCache.clear();
}

export function normalizeProviderQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Calculates a realistic, deterministic NPR price based on pages, genre, and store pricing policy.
 */
export function calculateStorePriceNPR(
  pages?: number,
  genre?: string,
  baseOverride?: number
): number {
  if (baseOverride && baseOverride >= 100) {
    return baseOverride;
  }

  const p = Math.max(120, Math.min(1200, pages || 300));
  let price = p * 1.8 + 200;

  // Minor genre adjustments
  const g = (genre || "").toLowerCase();
  if (g.includes("technology") || g.includes("computer") || g.includes("business") || g.includes("investing")) {
    price += 150;
  } else if (g.includes("manga") || g.includes("comic") || g.includes("poetry")) {
    price -= 50;
  }

  // Bound between NPR 449 and NPR 1,899, rounded to nearest 50 minus 1 (e.g. 499, 549, 699, 799, 899)
  const clamped = Math.max(449, Math.min(1899, price));
  const rounded = Math.round(clamped / 50) * 50 - 1;
  return Math.max(449, rounded);
}

/**
 * Normalizes raw Open Library document into a standardized bookstore book object.
 */
export function normalizeExternalBook(doc: any): NormalizedBookData | null {
  if (!doc) return null;

  const rawTitle = typeof doc.title === "string" ? doc.title.trim() : "";
  if (!rawTitle) return null;

  // Clean author
  let author = "Unknown Author";
  if (Array.isArray(doc.author_name) && doc.author_name.length > 0) {
    author = doc.author_name.slice(0, 3).join(", ").trim();
  } else if (typeof doc.author_name === "string" && doc.author_name.trim()) {
    author = doc.author_name.trim();
  } else if (Array.isArray(doc.authors) && doc.authors.length > 0) {
    const names = doc.authors.map((a: any) => (typeof a === "string" ? a : a.name)).filter(Boolean);
    if (names.length > 0) author = names.slice(0, 3).join(", ");
  }

  const openLibraryId = (doc.key || "").replace("/works/", "").replace("/books/", "").trim();

  // Extract best ISBN (prefer ISBN-13)
  let isbn = "";
  if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
    const isbn13 = doc.isbn.find(
      (i: string) =>
        String(i).trim().length === 13 ||
        String(i).startsWith("978") ||
        String(i).startsWith("979")
    );
    isbn = isbn13 ? String(isbn13).trim() : String(doc.isbn[0]).trim();
  } else if (typeof doc.isbn === "string") {
    isbn = doc.isbn.trim();
  }

  const coverId = doc.cover_i ? String(doc.cover_i) : (doc.cover_id ? String(doc.cover_id) : "");

  // Build clean, high-resolution Open Library HTTPS cover URL
  let coverUrl = "";
  if (isbn) {
    coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  } else if (coverId) {
    coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  } else if (openLibraryId) {
    coverUrl = `https://covers.openlibrary.org/b/olid/${openLibraryId}-L.jpg`;
  }

  // Genre / Subject mapping
  let genre = "Fiction";
  if (Array.isArray(doc.subject) && doc.subject.length > 0) {
    const rawGenre = doc.subject[0];
    genre = typeof rawGenre === "string" ? rawGenre.slice(0, 50).trim() : "Fiction";
  } else if (typeof doc.subject === "string" && doc.subject.trim()) {
    genre = doc.subject.slice(0, 50).trim();
  }

  // Publisher
  let publisher = "";
  if (Array.isArray(doc.publisher) && doc.publisher.length > 0) {
    publisher = typeof doc.publisher[0] === "string" ? doc.publisher[0].trim() : "";
  } else if (typeof doc.publisher === "string") {
    publisher = doc.publisher.trim();
  }

  // Language
  let language = "English";
  if (Array.isArray(doc.language) && doc.language.length > 0) {
    language = typeof doc.language[0] === "string" ? doc.language[0].toUpperCase().trim() : "English";
    if (language === "ENG") language = "English";
    if (language === "NEP") language = "Nepali";
  }

  const pages = doc.number_of_pages_median || doc.number_of_pages || 0;
  const price = calculateStorePriceNPR(pages, genre);

  let description = "";
  if (typeof doc.description === "string") {
    description = doc.description.trim();
  } else if (doc.description && typeof doc.description.value === "string") {
    description = doc.description.value.trim();
  }

  return {
    openLibraryId,
    title: rawTitle,
    author,
    isbn,
    coverId,
    image: coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    firstPublishYear: doc.first_publish_year,
    genre,
    pages,
    publisher,
    language,
    description,
    price,
    discountPercentage: pages > 400 ? 10 : 0,
    stock: 25,
    source: "openlibrary",
  };
}

export class BookProviderService {
  /**
   * Search external books on Open Library with 10-minute caching.
   */
  static async searchExternalBooks(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ books: NormalizedBookData[]; total: number }> {
    if (!query || !query.trim()) {
      return { books: [], total: 0 };
    }

    const cleanQuery = query.trim();
    const normalized = normalizeProviderQuery(cleanQuery);
    const targetPage = Math.max(1, page);
    const targetLimit = Math.min(50, Math.max(1, limit));
    const cacheKey = `search:${normalized}:p${targetPage}:l${targetLimit}`;

    const now = Date.now();
    const cached = providerCache.get(cacheKey);

    if (cached && now - cached.cachedAt < PROVIDER_CACHE_TTL_MS) {
      return { books: cached.books, total: cached.total };
    }

    try {
      const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
        cleanQuery
      )}&page=${targetPage}&limit=${targetLimit}&fields=key,title,author_name,first_publish_year,isbn,cover_i,subject,number_of_pages_median,publisher,language`;

      const response = await axios.get(searchUrl, {
        timeout: 8000,
        headers: {
          "User-Agent": "KitabGhar-Bookstore-App/1.0 (catalog-discovery)",
        },
      });

      const data = response.data as { docs?: any[]; numFound?: number } | undefined;
      const docs = Array.isArray(data?.docs) ? data.docs : [];
      const total = data?.numFound || docs.length;

      const books = docs
        .map(normalizeExternalBook)
        .filter((b): b is NormalizedBookData => b !== null);

      // Bounded cache maintenance
      if (providerCache.size >= MAX_PROVIDER_CACHE_ENTRIES) {
        const oldestKey = providerCache.keys().next().value;
        if (oldestKey) providerCache.delete(oldestKey);
      }

      providerCache.set(cacheKey, {
        books,
        total,
        cachedAt: now,
      });

      return { books, total };
    } catch (error: any) {
      console.warn("External book provider search warning:", error.message);
      return { books: [], total: 0 };
    }
  }

  /**
   * Discovers books by subject/genre on Open Library.
   */
  static async discoverBooksBySubject(
    subject: string,
    limit: number = 15
  ): Promise<NormalizedBookData[]> {
    if (!subject || !subject.trim()) return [];

    const cleanSubject = subject.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const targetLimit = Math.min(30, Math.max(1, limit));
    const cacheKey = `subject:${cleanSubject}:l${targetLimit}`;

    const now = Date.now();
    const cached = providerCache.get(cacheKey);
    if (cached && now - cached.cachedAt < PROVIDER_CACHE_TTL_MS) {
      return cached.books;
    }

    try {
      const subjectUrl = `https://openlibrary.org/subjects/${encodeURIComponent(
        cleanSubject
      )}.json?limit=${targetLimit}`;

      const response = await axios.get(subjectUrl, {
        timeout: 8000,
        headers: {
          "User-Agent": "KitabGhar-Bookstore-App/1.0 (subject-discovery)",
        },
      });

      const data = response.data as { works?: any[] } | undefined;
      const works = Array.isArray(data?.works) ? data.works : [];
      const books = works
        .map((w: any) => normalizeExternalBook(w))
        .filter((b: NormalizedBookData | null): b is NormalizedBookData => b !== null);

      if (providerCache.size >= MAX_PROVIDER_CACHE_ENTRIES) {
        const oldestKey = providerCache.keys().next().value;
        if (oldestKey) providerCache.delete(oldestKey);
      }

      providerCache.set(cacheKey, {
        books,
        total: books.length,
        cachedAt: now,
      });

      return books;
    } catch (error: any) {
      console.warn(`External subject discovery warning for '${subject}':`, error.message);
      return [];
    }
  }

  /**
   * Persists or finds a normalized external book in MongoDB with strict duplicate protection.
   * Never overwrites manual admin pricing.
   */
  static async persistExternalBookToMongo(
    bookData: NormalizedBookData
  ): Promise<any> {
    const cleanTitle = bookData.title.trim();
    const cleanAuthor = bookData.author.trim();
    const cleanIsbn = bookData.isbn ? bookData.isbn.trim() : "";
    const cleanOlid = bookData.openLibraryId ? bookData.openLibraryId.trim() : "";

    // 1. Check existing by ISBN
    if (cleanIsbn) {
      const existingByIsbn = await BookModel.findOne({ isbn: cleanIsbn });
      if (existingByIsbn) {
        return existingByIsbn;
      }
    }

    // 2. Check existing by Open Library ID
    if (cleanOlid) {
      const existingByOlid = await BookModel.findOne({ openLibraryId: cleanOlid });
      if (existingByOlid) {
        return existingByOlid;
      }
    }

    // 3. Check existing by (Title + Author)
    const existingByTitleAuthor = await BookModel.findOne({
      title: cleanTitle,
      author: cleanAuthor,
    });
    if (existingByTitleAuthor) {
      return existingByTitleAuthor;
    }

    // 4. Create new document
    const newBook = new BookModel({
      title: cleanTitle,
      author: cleanAuthor,
      genre: bookData.genre || "Fiction",
      description: bookData.description || "",
      image: bookData.image,
      price: bookData.price,
      discountPercentage: bookData.discountPercentage ?? 0,
      stock: bookData.stock ?? 25,
      isbn: cleanIsbn,
      openLibraryId: cleanOlid,
      coverId: bookData.coverId || "",
      publisher: bookData.publisher || "",
      publicationDate: bookData.firstPublishYear ? String(bookData.firstPublishYear) : "",
      pages: bookData.pages || 0,
      language: bookData.language || "English",
      source: "openlibrary",
      featured: false,
      isNewArrival: true,
    });

    await newBook.save();
    return newBook;
  }

  /**
   * Batch persists multiple normalized books to MongoDB safely in parallel.
   */
  static async persistExternalBooksBatch(
    books: NormalizedBookData[]
  ): Promise<any[]> {
    const results: any[] = [];
    for (const b of books) {
      try {
        const doc = await this.persistExternalBookToMongo(b);
        if (doc) results.push(doc);
      } catch (err: any) {
        // Continue on individual uniqueness collisions
        console.warn("Batch persist non-fatal conflict:", err.message);
      }
    }
    return results;
  }
}
