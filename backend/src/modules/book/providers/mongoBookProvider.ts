import { BookModel } from "../model";
import { IBookProvider, NormalizedBookData, ProviderSearchResult } from "./types";

export class MongoBookProvider implements IBookProvider {
  readonly name = "mongo" as const;

  async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProviderSearchResult> {
    const cleanQuery = query?.trim() || "";
    const targetPage = Math.max(1, page);
    const targetLimit = Math.min(50, Math.max(1, limit));
    const skip = (targetPage - 1) * targetLimit;

    const filter: Record<string, any> = {};
    if (cleanQuery) {
      const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { title: regex },
        { author: regex },
        { genre: regex },
        { isbn: regex },
        { description: regex },
      ];
    }

    try {
      const [total, docs] = await Promise.all([
        BookModel.countDocuments(filter),
        BookModel.find(filter)
          .sort({ averageRating: -1, totalReviews: -1, createdAt: -1 })
          .skip(skip)
          .limit(targetLimit)
          .lean(),
      ]);

      const books: NormalizedBookData[] = docs.map((d: any) => ({
        googleBooksId: d.googleBooksId || "",
        openLibraryId: d.openLibraryId || "",
        title: d.title,
        author: d.author,
        isbn: d.isbn || "",
        coverId: d.coverId || "",
        image: d.image || "",
        firstPublishYear: d.publicationDate,
        genre: d.genre || "Fiction",
        pages: d.pages || 0,
        publisher: d.publisher || "",
        language: d.language || "English",
        description: d.description || "",
        price: d.price,
        discountPercentage: d.discountPercentage || 0,
        stock: d.stock ?? 25,
        source: d.source || "manual",
        isAvailableInStore: d.isAvailableInStore ?? true,
      }));

      return {
        books,
        total,
        provider: "mongo",
      };
    } catch (err: any) {
      console.warn("MongoBookProvider search warning:", err.message);
      return { books: [], total: 0, provider: "mongo" };
    }
  }

  async discoverBySubject(
    subject: string,
    limit: number = 15
  ): Promise<NormalizedBookData[]> {
    if (!subject || !subject.trim()) return [];

    try {
      const regex = new RegExp(subject.trim(), "i");
      const docs = await BookModel.find({ genre: regex })
        .sort({ averageRating: -1, totalReviews: -1 })
        .limit(limit)
        .lean();

      return docs.map((d: any) => ({
        googleBooksId: d.googleBooksId || "",
        openLibraryId: d.openLibraryId || "",
        title: d.title,
        author: d.author,
        isbn: d.isbn || "",
        coverId: d.coverId || "",
        image: d.image || "",
        firstPublishYear: d.publicationDate,
        genre: d.genre || "Fiction",
        pages: d.pages || 0,
        publisher: d.publisher || "",
        language: d.language || "English",
        description: d.description || "",
        price: d.price,
        discountPercentage: d.discountPercentage || 0,
        stock: d.stock ?? 25,
        source: d.source || "manual",
        isAvailableInStore: d.isAvailableInStore ?? true,
      }));
    } catch (err: any) {
      console.warn("MongoBookProvider discoverBySubject warning:", err.message);
      return [];
    }
  }

  async getByIdOrIsbn(identifier: string): Promise<NormalizedBookData | null> {
    if (!identifier || !identifier.trim()) return null;
    const cleanId = identifier.trim();

    try {
      const orClauses: any[] = [{ isbn: cleanId }, { googleBooksId: cleanId }, { openLibraryId: cleanId }];
      const doc = await BookModel.findOne({ $or: orClauses }).lean();
      if (!doc) return null;

      const d: any = doc;
      return {
        googleBooksId: d.googleBooksId || "",
        openLibraryId: d.openLibraryId || "",
        title: d.title,
        author: d.author,
        isbn: d.isbn || "",
        coverId: d.coverId || "",
        image: d.image || "",
        firstPublishYear: d.publicationDate,
        genre: d.genre || "Fiction",
        pages: d.pages || 0,
        publisher: d.publisher || "",
        language: d.language || "English",
        description: d.description || "",
        price: d.price,
        discountPercentage: d.discountPercentage || 0,
        stock: d.stock ?? 25,
        source: d.source || "manual",
        isAvailableInStore: d.isAvailableInStore ?? true,
      };
    } catch (err: any) {
      console.warn("MongoBookProvider getByIdOrIsbn warning:", err.message);
      return null;
    }
  }
}
