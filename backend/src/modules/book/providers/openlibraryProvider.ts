import axios from "axios";
import { env } from "../../../utils/config";
import { IBookProvider, NormalizedBookData, ProviderSearchResult } from "./types";
import { calculateStorePriceNPR } from "./googleBooksProvider";

/**
 * Normalizes raw Open Library document into standardized bookstore Book format.
 */
export function normalizeOpenLibraryBook(doc: any): NormalizedBookData | null {
  if (!doc || typeof doc !== "object") return null;

  const rawTitle = typeof doc.title === "string" ? doc.title.trim() : "";
  if (!rawTitle) return null;

  // Authors
  let author = "Unknown Author";
  if (Array.isArray(doc.author_name) && doc.author_name.length > 0) {
    author = doc.author_name
      .filter((a: any) => typeof a === "string" && a.trim())
      .slice(0, 3)
      .join(", ")
      .trim();
  } else if (typeof doc.author_name === "string" && doc.author_name.trim()) {
    author = doc.author_name.trim();
  } else if (Array.isArray(doc.authors) && doc.authors.length > 0) {
    const names = doc.authors
      .map((a: any) => (typeof a === "string" ? a : a.name))
      .filter(Boolean);
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

  const coverId = doc.cover_i ? String(doc.cover_i) : doc.cover_id ? String(doc.cover_id) : "";

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
    image: coverUrl,
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
    isAvailableInStore: true,
  };
}

export class OpenLibraryProvider implements IBookProvider {
  readonly name = "openlibrary" as const;

  async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProviderSearchResult> {
    if (!query || !query.trim()) {
      return { books: [], total: 0, provider: "openlibrary" };
    }

    const cleanQuery = query.trim();
    const targetPage = Math.max(1, page);
    const targetLimit = Math.min(50, Math.max(1, limit));

    try {
      const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
        cleanQuery
      )}&page=${targetPage}&limit=${targetLimit}&fields=key,title,author_name,first_publish_year,isbn,cover_i,subject,number_of_pages_median,publisher,language`;

      const response = await axios.get(searchUrl, {
        timeout: env.OPEN_LIBRARY_TIMEOUT_MS,
        headers: {
          "User-Agent": "KitabGhar-Bookstore-App/1.0 (catalog-discovery)",
        },
      });

      const resData = response.data as { docs?: any[]; numFound?: number } | undefined;
      const docs = Array.isArray(resData?.docs) ? resData.docs : [];
      const total = resData?.numFound || docs.length;

      const books = docs
        .map(normalizeOpenLibraryBook)
        .filter((b: NormalizedBookData | null): b is NormalizedBookData => b !== null && Boolean(b.title));

      return {
        books,
        total,
        provider: "openlibrary",
      };
    } catch (error: any) {
      console.warn("Open Library search warning:", error.message || error);
      return { books: [], total: 0, provider: "openlibrary" };
    }
  }

  async discoverBySubject(
    subject: string,
    limit: number = 15
  ): Promise<NormalizedBookData[]> {
    if (!subject || !subject.trim()) return [];

    const cleanSubject = subject.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const targetLimit = Math.min(40, Math.max(1, limit));

    try {
      const subjectUrl = `https://openlibrary.org/subjects/${encodeURIComponent(
        cleanSubject
      )}.json?limit=${targetLimit}`;

      const response = await axios.get(subjectUrl, {
        timeout: env.OPEN_LIBRARY_TIMEOUT_MS,
        headers: {
          "User-Agent": "KitabGhar-Bookstore-App/1.0 (subject-discovery)",
        },
      });

      const resData = response.data as { works?: any[] } | undefined;
      const works = Array.isArray(resData?.works) ? resData.works : [];
      const books = works
        .map(normalizeOpenLibraryBook)
        .filter((b: NormalizedBookData | null): b is NormalizedBookData => b !== null && Boolean(b.title));

      return books;
    } catch (error: any) {
      console.warn(`Open Library subject discovery warning for '${subject}':`, error.message || error);
      return [];
    }
  }


  async getByIdOrIsbn(identifier: string): Promise<NormalizedBookData | null> {
    if (!identifier || !identifier.trim()) return null;
    const cleanId = identifier.trim();

    try {
      const searchRes = await this.search(cleanId, 1, 1);
      if (searchRes.books.length > 0) {
        return searchRes.books[0];
      }
    } catch (error: any) {
      console.warn(`Open Library getByIdOrIsbn warning for '${identifier}':`, error.message || error);
    }

    return null;
  }
}
