import axios from "axios";
import { env } from "../../../utils/config";
import { IBookProvider, NormalizedBookData, ProviderSearchResult } from "./types";

/**
 * Calculates a realistic, deterministic store selling price in NPR.
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
  if (
    g.includes("technology") ||
    g.includes("computer") ||
    g.includes("business") ||
    g.includes("investing")
  ) {
    price += 150;
  } else if (g.includes("manga") || g.includes("comic") || g.includes("poetry")) {
    price -= 50;
  }

  // Bound between NPR 449 and NPR 1,899, rounded to nearest 50 minus 1
  const clamped = Math.max(449, Math.min(1899, price));
  const rounded = Math.round(clamped / 50) * 50 - 1;
  return Math.max(449, rounded);
}

/**
 * Normalizes Google Books imageLinks to high-resolution, secure HTTPS URLs.
 */
export function normalizeGoogleBooksCover(
  imageLinks?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    small?: string;
    thumbnail?: string;
    smallThumbnail?: string;
  },
  isbn?: string
): string {
  const candidate =
    imageLinks?.extraLarge ||
    imageLinks?.large ||
    imageLinks?.medium ||
    imageLinks?.thumbnail ||
    imageLinks?.small ||
    imageLinks?.smallThumbnail ||
    "";

  if (candidate) {
    let clean = candidate.trim().replace(/^http:\/\//i, "https://");
    clean = clean.replace(/&edge=curl/gi, "");
    return clean;
  }

  if (isbn) {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, "").trim();
    if (cleanIsbn) {
      return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
    }
  }

  return "";
}

/**
 * Normalizes raw Google Books Volume into standardized bookstore Book format.
 */
export function normalizeGoogleBook(volume: any): NormalizedBookData | null {
  if (!volume || typeof volume !== "object") return null;

  const info = volume.volumeInfo || {};
  const rawTitle = typeof info.title === "string" ? info.title.trim() : "";
  if (!rawTitle) return null;

  const googleBooksId = typeof volume.id === "string" ? volume.id.trim() : "";

  // Authors
  let author = "Unknown Author";
  if (Array.isArray(info.authors) && info.authors.length > 0) {
    author = info.authors
      .filter((a: any) => typeof a === "string" && a.trim())
      .slice(0, 3)
      .join(", ")
      .trim();
  } else if (typeof info.authors === "string" && info.authors.trim()) {
    author = info.authors.trim();
  }

  // Extract ISBN (prefer ISBN-13 over ISBN-10)
  let isbn = "";
  if (Array.isArray(info.industryIdentifiers) && info.industryIdentifiers.length > 0) {
    const isbn13 = info.industryIdentifiers.find(
      (id: any) => id.type === "ISBN_13" || (typeof id.identifier === "string" && id.identifier.length === 13)
    );
    const isbn10 = info.industryIdentifiers.find(
      (id: any) => id.type === "ISBN_10" || (typeof id.identifier === "string" && id.identifier.length === 10)
    );
    if (isbn13?.identifier) {
      isbn = String(isbn13.identifier).trim();
    } else if (isbn10?.identifier) {
      isbn = String(isbn10.identifier).trim();
    } else if (info.industryIdentifiers[0]?.identifier) {
      isbn = String(info.industryIdentifiers[0].identifier).trim();
    }
  }

  // Genre / Category
  let genre = "Fiction";
  if (Array.isArray(info.categories) && info.categories.length > 0) {
    const rawCat = info.categories[0];
    if (typeof rawCat === "string" && rawCat.trim()) {
      // Split hierarchies like "Fiction / Science Fiction / Space Opera"
      const parts = rawCat.split("/").map((p) => p.trim()).filter(Boolean);
      genre = parts[parts.length - 1] || parts[0] || "Fiction";
    }
  }

  const pages = typeof info.pageCount === "number" && info.pageCount > 0 ? info.pageCount : 0;
  const publisher = typeof info.publisher === "string" ? info.publisher.trim() : "";
  const publicationDate = typeof info.publishedDate === "string" ? info.publishedDate.trim() : "";
  const language = typeof info.language === "string" ? info.language.toUpperCase().trim() : "English";

  let description = "";
  if (typeof info.description === "string") {
    // Strip raw HTML tags if returned by Google Books
    description = info.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const image = normalizeGoogleBooksCover(info.imageLinks, isbn);
  const price = calculateStorePriceNPR(pages, genre);

  let firstPublishYear: string | number | undefined;
  if (publicationDate) {
    const match = publicationDate.match(/\d{4}/);
    if (match) firstPublishYear = match[0];
  }

  return {
    googleBooksId,
    title: rawTitle,
    author: author || "Unknown Author",
    isbn,
    image,
    firstPublishYear,
    genre,
    pages,
    publisher,
    language: language === "EN" ? "English" : language === "NE" ? "Nepali" : language || "English",
    description,
    price,
    discountPercentage: pages > 400 ? 10 : 0,
    stock: 25,
    source: "google_books",
    isAvailableInStore: true,
  };
}

export class GoogleBooksProvider implements IBookProvider {
  readonly name = "google_books" as const;

  private getBaseUrl(): string {
    return "https://www.googleapis.com/books/v1/volumes";
  }

  private buildRequestConfig(params: Record<string, any>) {
    const apiKey = env.GOOGLE_BOOKS_API_KEY;
    const finalParams = { ...params };
    if (apiKey) {
      finalParams.key = apiKey;
    }
    return {
      params: finalParams,
      timeout: env.GOOGLE_BOOKS_TIMEOUT_MS,
      headers: {
        "User-Agent": "KitabGhar-Bookstore-App/1.0 (google-books-catalog)",
      },
    };
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProviderSearchResult> {
    if (!query || !query.trim()) {
      return { books: [], total: 0, provider: "google_books" };
    }

    const cleanQuery = query.trim();
    const targetPage = Math.max(1, page);
    const targetLimit = Math.min(40, Math.max(1, limit)); // Google Books API max is 40
    const startIndex = (targetPage - 1) * targetLimit;

    try {
      const response = await axios.get(
        this.getBaseUrl(),
        this.buildRequestConfig({
          q: cleanQuery,
          startIndex,
          maxResults: targetLimit,
          printType: "books",
          orderBy: "relevance",
        })
      );

      const resData = response.data as { items?: any[]; totalItems?: number } | undefined;
      const items = Array.isArray(resData?.items) ? resData.items : [];
      const total = typeof resData?.totalItems === "number" ? resData.totalItems : items.length;

      const books = items
        .map(normalizeGoogleBook)
        .filter((b: NormalizedBookData | null): b is NormalizedBookData => b !== null && Boolean(b.title));

      return {
        books,
        total,
        provider: "google_books",
      };
    } catch (error: any) {
      console.warn("Google Books API query warning:", error.message || error);
      return { books: [], total: 0, provider: "google_books" };
    }
  }

  async discoverBySubject(
    subject: string,
    limit: number = 15
  ): Promise<NormalizedBookData[]> {
    if (!subject || !subject.trim()) return [];

    const cleanSubject = subject.trim();
    const targetLimit = Math.min(40, Math.max(1, limit));

    try {
      const response = await axios.get(
        this.getBaseUrl(),
        this.buildRequestConfig({
          q: `subject:"${cleanSubject}"`,
          startIndex: 0,
          maxResults: targetLimit,
          printType: "books",
          orderBy: "relevance",
        })
      );

      const resData = response.data as { items?: any[] } | undefined;
      const items = Array.isArray(resData?.items) ? resData.items : [];
      const books = items
        .map(normalizeGoogleBook)
        .filter((b: NormalizedBookData | null): b is NormalizedBookData => b !== null && Boolean(b.title));

      return books;
    } catch (error: any) {
      console.warn(`Google Books subject discovery warning for '${subject}':`, error.message || error);
      return [];
    }
  }

  async getByIdOrIsbn(identifier: string): Promise<NormalizedBookData | null> {
    if (!identifier || !identifier.trim()) return null;
    const cleanId = identifier.trim();

    try {
      // 1. Try direct volume ID lookup
      if (!cleanId.startsWith("978") && !cleanId.startsWith("979") && cleanId.length < 20) {
        try {
          const directUrl = `${this.getBaseUrl()}/${encodeURIComponent(cleanId)}`;
          const response = await axios.get(directUrl, this.buildRequestConfig({}));
          if (response.data) {
            const normalized = normalizeGoogleBook(response.data);
            if (normalized) return normalized;
          }
        } catch {
          // Continue to ISBN query
        }
      }

      // 2. Try ISBN lookup
      const isbnClean = cleanId.replace(/[^0-9X]/gi, "");
      const query = isbnClean.length === 10 || isbnClean.length === 13 ? `isbn:${isbnClean}` : cleanId;

      const response = await axios.get(
        this.getBaseUrl(),
        this.buildRequestConfig({
          q: query,
          maxResults: 1,
          printType: "books",
        })
      );

      const resData = response.data as { items?: any[] } | undefined;
      const items = Array.isArray(resData?.items) ? resData.items : [];
      if (items.length > 0) {
        return normalizeGoogleBook(items[0]);
      }
    } catch (error: any) {
      console.warn(`Google Books getByIdOrIsbn warning for '${identifier}':`, error.message || error);
    }

    return null;
  }
}

