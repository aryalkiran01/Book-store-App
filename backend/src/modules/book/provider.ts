import { BookModel } from "./model";
import { NormalizedBookData, ProviderSearchResult } from "./providers/types";
import { GoogleBooksProvider, calculateStorePriceNPR, normalizeGoogleBook, normalizeGoogleBooksCover } from "./providers/googleBooksProvider";
import { OpenLibraryProvider, normalizeOpenLibraryBook } from "./providers/openlibraryProvider";
import { MongoBookProvider } from "./providers/mongoBookProvider";

export {
  NormalizedBookData,
  ProviderSearchResult,
  calculateStorePriceNPR,
  normalizeGoogleBook,
  normalizeGoogleBooksCover,
  normalizeOpenLibraryBook,
};

// Backwards compatibility alias
export const normalizeExternalBook = normalizeOpenLibraryBook;

// Bounded in-memory cache
export const PROVIDER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_PROVIDER_CACHE_ENTRIES = 500;

interface CachedProviderEntry {
  data: any;
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
 * Generates a unique deduplication key for a book.
 */
export function getBookDedupeKeys(book: Partial<NormalizedBookData>): string[] {
  const keys: string[] = [];

  const isbn = (book.isbn || "").replace(/[^0-9X]/gi, "").trim();
  if (isbn) {
    keys.push(`isbn:${isbn}`);
  }

  const gid = (book.googleBooksId || "").trim();
  if (gid) {
    keys.push(`gid:${gid}`);
  }

  const olid = (book.openLibraryId || "").trim();
  if (olid) {
    keys.push(`olid:${olid}`);
  }

  const title = (book.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
  const author = (book.author || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (title && author) {
    keys.push(`title_author:${title}:::${author}`);
  }

  return keys;
}

/**
 * Deduplicates a list of books based on ISBN, Google Books ID, OLID, and Title+Author.
 */
export function deduplicateBooks(books: NormalizedBookData[]): NormalizedBookData[] {
  const seenKeys = new Set<string>();
  const uniqueBooks: NormalizedBookData[] = [];

  for (const book of books) {
    const keys = getBookDedupeKeys(book);
    const hasBeenSeen = keys.some((k) => seenKeys.has(k));
    if (!hasBeenSeen) {
      keys.forEach((k) => seenKeys.add(k));
      uniqueBooks.push(book);
    }
  }

  return uniqueBooks;
}

export class BookDiscoveryService {
  private static googleProvider = new GoogleBooksProvider();
  private static openLibraryProvider = new OpenLibraryProvider();
  private static mongoProvider = new MongoBookProvider();

  /**
   * Search books across the fallback chain:
   * 1. Google Books API
   * 2. Open Library API
   * 3. MongoDB Local Catalog
   */
  static async searchBooks(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProviderSearchResult> {
    if (!query || !query.trim()) {
      return { books: [], total: 0, provider: "mongo" };
    }

    const cleanQuery = query.trim();
    const normalized = normalizeProviderQuery(cleanQuery);
    const targetPage = Math.max(1, page);
    const targetLimit = Math.min(40, Math.max(1, limit));
    const cacheKey = `search:${normalized}:p${targetPage}:l${targetLimit}`;

    const now = Date.now();
    const cached = providerCache.get(cacheKey);
    if (cached && now - cached.cachedAt < PROVIDER_CACHE_TTL_MS) {
      return cached.data;
    }

    let result: ProviderSearchResult = { books: [], total: 0, provider: "google_books" };

    // Step 1: Try Google Books
    try {
      const gbResult = await this.googleProvider.search(cleanQuery, targetPage, targetLimit);
      if (gbResult.books.length > 0) {
        result = gbResult;
      }
    } catch (err: any) {
      console.warn("Google Books search error, falling back to Open Library:", err.message);
    }

    // Step 2: Fallback to Open Library if Google Books yielded no results
    if (result.books.length === 0) {
      try {
        const olResult = await this.openLibraryProvider.search(cleanQuery, targetPage, targetLimit);
        if (olResult.books.length > 0) {
          result = olResult;
        }
      } catch (err: any) {
        console.warn("Open Library search error, falling back to MongoDB:", err.message);
      }
    }

    // Step 3: Fallback to MongoDB if both external providers fail or yield no results
    if (result.books.length === 0) {
      try {
        const mongoResult = await this.mongoProvider.search(cleanQuery, targetPage, targetLimit);
        result = mongoResult;
      } catch (err: any) {
        console.warn("MongoDB search error:", err.message);
      }
    }

    // Deduplicate and safely cache discovered external books to MongoDB
    result.books = deduplicateBooks(result.books);
    if (result.provider !== "mongo" && result.books.length > 0) {
      this.persistExternalBooksBatch(result.books).catch((err) =>
        console.warn("Async persist warning:", err.message)
      );
    }

    // Update in-memory cache
    if (providerCache.size >= MAX_PROVIDER_CACHE_ENTRIES) {
      const oldestKey = providerCache.keys().next().value;
      if (oldestKey) providerCache.delete(oldestKey);
    }
    providerCache.set(cacheKey, { data: result, cachedAt: now });

    return result;
  }

  /**
   * Discover books by subject/category across the fallback chain:
   * 1. Google Books -> 2. Open Library -> 3. MongoDB
   */
  static async discoverBooksBySubject(
    subject: string,
    limit: number = 15
  ): Promise<NormalizedBookData[]> {
    if (!subject || !subject.trim()) return [];

    const cleanSubject = subject.trim();
    const targetLimit = Math.min(30, Math.max(1, limit));
    const cacheKey = `subject:${cleanSubject.toLowerCase()}:l${targetLimit}`;

    const now = Date.now();
    const cached = providerCache.get(cacheKey);
    if (cached && now - cached.cachedAt < PROVIDER_CACHE_TTL_MS) {
      return cached.data;
    }

    let books: NormalizedBookData[] = [];

    // Step 1: Google Books
    try {
      books = await this.googleProvider.discoverBySubject(cleanSubject, targetLimit);
    } catch (err: any) {
      console.warn(`Google Books discoverBySubject error for '${subject}':`, err.message);
    }

    // Step 2: Open Library
    if (books.length === 0) {
      try {
        books = await this.openLibraryProvider.discoverBySubject(cleanSubject, targetLimit);
      } catch (err: any) {
        console.warn(`Open Library discoverBySubject error for '${subject}':`, err.message);
      }
    }

    // Step 3: MongoDB
    if (books.length === 0) {
      try {
        books = await this.mongoProvider.discoverBySubject(cleanSubject, targetLimit);
      } catch (err: any) {
        console.warn(`MongoDB discoverBySubject error for '${subject}':`, err.message);
      }
    }

    books = deduplicateBooks(books);
    if (books.length > 0) {
      this.persistExternalBooksBatch(books).catch(() => {});
    }

    if (providerCache.size >= MAX_PROVIDER_CACHE_ENTRIES) {
      const oldestKey = providerCache.keys().next().value;
      if (oldestKey) providerCache.delete(oldestKey);
    }
    providerCache.set(cacheKey, { data: books, cachedAt: now });

    return books;
  }

  /**
   * Generates all homepage discovery sections with guaranteed global deduplication.
   */
  static async getHomepageFeeds(): Promise<{
    featured: any[];
    newArrivals: any[];
    popular: any[];
    trending: any[];
    editorsPicks: any[];
  }> {
    const cacheKey = "homepage:feeds:v2";
    const now = Date.now();
    const cached = providerCache.get(cacheKey);
    if (cached && now - cached.cachedAt < PROVIDER_CACHE_TTL_MS) {
      return cached.data;
    }

    // Query diverse subjects across categories in parallel
    const [bestsellers, newReleases, scifi, business, fiction] = await Promise.all([
      this.discoverBooksBySubject("bestsellers", 10),
      this.discoverBooksBySubject("psychology", 10),
      this.discoverBooksBySubject("science_fiction", 10),
      this.discoverBooksBySubject("business", 10),
      this.discoverBooksBySubject("fiction", 10),
    ]);

    // Track globally seen book dedupe keys to prevent repeating any book across sections
    const globalSeenKeys = new Set<string>();

    const filterUnique = (candidateBooks: NormalizedBookData[], targetCount: number = 8) => {
      const section: NormalizedBookData[] = [];
      for (const b of candidateBooks) {
        const keys = getBookDedupeKeys(b);
        const alreadySeen = keys.some((k) => globalSeenKeys.has(k));
        if (!alreadySeen) {
          keys.forEach((k) => globalSeenKeys.add(k));
          section.push(b);
          if (section.length >= targetCount) break;
        }
      }
      return section;
    };

    const rawFeatured = filterUnique(bestsellers, 8);
    const rawNewArrivals = filterUnique(newReleases, 8);
    const rawPopular = filterUnique(scifi, 8);
    const rawTrending = filterUnique(business, 8);
    const rawEditorsPicks = filterUnique(fiction, 8);

    // Persist and enrich with MongoDB IDs
    const [featured, newArrivals, popular, trending, editorsPicks] = await Promise.all([
      this.persistAndHydrateBatch(rawFeatured),
      this.persistAndHydrateBatch(rawNewArrivals),
      this.persistAndHydrateBatch(rawPopular),
      this.persistAndHydrateBatch(rawTrending),
      this.persistAndHydrateBatch(rawEditorsPicks),
    ]);

    const result = {
      featured,
      newArrivals,
      popular,
      trending,
      editorsPicks,
    };

    providerCache.set(cacheKey, { data: result, cachedAt: now });
    return result;
  }

  /**
   * Persists or finds a normalized external book in MongoDB.
   * Preserves any existing store prices and stock.
   */
  static async persistExternalBookToMongo(
    bookData: NormalizedBookData
  ): Promise<any> {
    const cleanTitle = bookData.title.trim();
    const cleanAuthor = bookData.author.trim();
    const cleanIsbn = bookData.isbn ? bookData.isbn.trim() : "";
    const cleanGid = bookData.googleBooksId ? bookData.googleBooksId.trim() : "";
    const cleanOlid = bookData.openLibraryId ? bookData.openLibraryId.trim() : "";

    // 1. Check existing by ISBN
    if (cleanIsbn) {
      const existingByIsbn = await BookModel.findOne({ isbn: cleanIsbn });
      if (existingByIsbn) {
        let needsSave = false;
        if (!existingByIsbn.googleBooksId && cleanGid) {
          existingByIsbn.googleBooksId = cleanGid;
          needsSave = true;
        }
        if (!existingByIsbn.openLibraryId && cleanOlid) {
          existingByIsbn.openLibraryId = cleanOlid;
          needsSave = true;
        }
        if ((!existingByIsbn.image || existingByIsbn.image.includes("unsplash")) && bookData.image) {
          existingByIsbn.image = bookData.image;
          needsSave = true;
        }
        if (needsSave) await existingByIsbn.save();
        return existingByIsbn;
      }
    }

    // 2. Check existing by Google Books ID
    if (cleanGid) {
      const existingByGid = await BookModel.findOne({ googleBooksId: cleanGid });
      if (existingByGid) {
        let needsSave = false;
        if (!existingByGid.isbn && cleanIsbn) {
          existingByGid.isbn = cleanIsbn;
          needsSave = true;
        }
        if ((!existingByGid.image || existingByGid.image.includes("unsplash")) && bookData.image) {
          existingByGid.image = bookData.image;
          needsSave = true;
        }
        if (needsSave) await existingByGid.save();
        return existingByGid;
      }
    }

    // 3. Check existing by Open Library ID
    if (cleanOlid) {
      const existingByOlid = await BookModel.findOne({ openLibraryId: cleanOlid });
      if (existingByOlid) {
        let needsSave = false;
        if (!existingByOlid.googleBooksId && cleanGid) {
          existingByOlid.googleBooksId = cleanGid;
          needsSave = true;
        }
        if (!existingByOlid.isbn && cleanIsbn) {
          existingByOlid.isbn = cleanIsbn;
          needsSave = true;
        }
        if (needsSave) await existingByOlid.save();
        return existingByOlid;
      }
    }

    // 4. Check existing by (Title + Author)
    const existingByTitleAuthor = await BookModel.findOne({
      title: cleanTitle,
      author: cleanAuthor,
    });
    if (existingByTitleAuthor) {
      let needsSave = false;
      if (!existingByTitleAuthor.googleBooksId && cleanGid) {
        existingByTitleAuthor.googleBooksId = cleanGid;
        needsSave = true;
      }
      if (!existingByTitleAuthor.openLibraryId && cleanOlid) {
        existingByTitleAuthor.openLibraryId = cleanOlid;
        needsSave = true;
      }
      if (!existingByTitleAuthor.isbn && cleanIsbn) {
        existingByTitleAuthor.isbn = cleanIsbn;
        needsSave = true;
      }
      if (needsSave) await existingByTitleAuthor.save();
      return existingByTitleAuthor;
    }

    // 5. Create new document
    const newBook = new BookModel({
      title: cleanTitle,
      author: cleanAuthor,
      genre: bookData.genre || "Fiction",
      description: bookData.description || "",
      image: bookData.image || "",
      price: bookData.price,
      discountPercentage: bookData.discountPercentage ?? 0,
      stock: bookData.stock ?? 25,
      isbn: cleanIsbn,
      googleBooksId: cleanGid,
      openLibraryId: cleanOlid,
      coverId: bookData.coverId || "",
      publisher: bookData.publisher || "",
      publicationDate: bookData.firstPublishYear ? String(bookData.firstPublishYear) : "",
      pages: bookData.pages || 0,
      language: bookData.language || "English",
      source: bookData.source || "google_books",
      featured: false,
      isNewArrival: false,
      isAvailableInStore: true,
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
        // Continue on individual duplicate index collisions
      }
    }
    return results;
  }

  /**
   * Persists and returns lean JSON objects including MongoDB _id for frontend components.
   */
  static async persistAndHydrateBatch(
    books: NormalizedBookData[]
  ): Promise<any[]> {
    const docs = await this.persistExternalBooksBatch(books);
    return docs.map((d) => (typeof d.toObject === "function" ? d.toObject() : d));
  }
}

// Backwards compatibility alias
export const BookProviderService = {
  searchExternalBooks: (query: string, page: number = 1, limit: number = 20) =>
    BookDiscoveryService.searchBooks(query, page, limit),
  discoverBooksBySubject: (subject: string, limit: number = 15) =>
    BookDiscoveryService.discoverBooksBySubject(subject, limit),
  persistExternalBookToMongo: (bookData: NormalizedBookData) =>
    BookDiscoveryService.persistExternalBookToMongo(bookData),
  persistExternalBooksBatch: (books: NormalizedBookData[]) =>
    BookDiscoveryService.persistExternalBooksBatch(books),
};
