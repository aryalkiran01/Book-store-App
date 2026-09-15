export type BookSource = "google_books" | "openlibrary" | "manual" | "seeded";

export interface NormalizedBookData {
  googleBooksId?: string;
  openLibraryId?: string;
  title: string;
  author: string;
  isbn: string;
  coverId?: string;
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
  source: BookSource;
  isAvailableInStore?: boolean;
}

export interface ProviderSearchResult {
  books: NormalizedBookData[];
  total: number;
  provider: "google_books" | "openlibrary" | "mongo";
}

export interface IBookProvider {
  readonly name: "google_books" | "openlibrary" | "mongo";
  search(query: string, page: number, limit: number): Promise<ProviderSearchResult>;
  discoverBySubject(subject: string, limit: number): Promise<NormalizedBookData[]>;
  getByIdOrIsbn(identifier: string): Promise<NormalizedBookData | null>;
}
