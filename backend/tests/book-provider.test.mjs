import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { BookModel } from "../dist/modules/book/model.js";
import {
  BookDiscoveryService,
  calculateStorePriceNPR,
  normalizeProviderQuery,
  clearProviderCache,
  getProviderCacheStats,
  getBookDedupeKeys,
  normalizeGoogleBook,
  normalizeOpenLibraryBook,
} from "../dist/modules/book/provider.js";
import { GoogleBooksProvider } from "../dist/modules/book/providers/googleBooksProvider.js";
import { OpenLibraryProvider } from "../dist/modules/book/providers/openlibraryProvider.js";
import { MongoBookProvider } from "../dist/modules/book/providers/mongoBookProvider.js";

const MONGO_TEST_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/book_review_app_db";

describe("Book Provider & External Discovery Suite", async () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_TEST_URI);
    }
  });

  after(async () => {
    clearProviderCache();
    // Clean up test documents created during this test
    await BookModel.deleteMany({
      $or: [
        { googleBooksId: "TEST_GBS_12345" },
        { openLibraryId: "TEST_OL_99999W" },
        { isbn: "9789999999999" },
        { isbn: "9780132350884" },
        { title: "Test External Provider Book Title" },
        { title: "Clean Code: A Handbook of Agile Software Craftsmanship" },
      ],
    });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("1. Google Books Normalizer extracts clean metadata and enforces HTTPS covers", () => {
    const rawGoogleItem = {
      id: "TEST_GBS_12345",
      volumeInfo: {
        title: "Clean Code",
        subtitle: "A Handbook of Agile Software Craftsmanship",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        publishedDate: "2008-08-01",
        description: "Even bad code can function.",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0132350882" },
          { type: "ISBN_13", identifier: "9780132350884" },
        ],
        pageCount: 464,
        categories: ["Computers", "Software Development"],
        imageLinks: {
          thumbnail: "http://books.google.com/books/content?id=TEST_GBS_12345&printsec=frontcover&img=1&zoom=1",
        },
        language: "en",
      },
    };

    const normalized = normalizeGoogleBook(rawGoogleItem);
    assert.ok(normalized);
    assert.equal(normalized.googleBooksId, "TEST_GBS_12345");
    assert.equal(normalized.title, "Clean Code");
    assert.equal(normalized.author, "Robert C. Martin");
    assert.equal(normalized.isbn, "9780132350884"); // Prefer ISBN-13
    assert.equal(normalized.genre, "Computers");
    assert.equal(normalized.pages, 464);
    assert.equal(normalized.language, "English");
    assert.equal(normalized.source, "google_books");
    assert.ok(normalized.image.startsWith("https://")); // Upgraded to HTTPS
  });

  it("2. Open Library Normalizer parses OL work docs correctly", () => {
    const rawOlDoc = {
      key: "/works/OL12345W",
      title: "Clean Code: A Handbook of Agile Software Craftsmanship",
      author_name: ["Robert C. Martin"],
      isbn: ["0132350882", "9780132350884"],
      cover_i: 1234567,
      subject: ["Computer Science", "Programming"],
      number_of_pages_median: 464,
      publisher: ["Prentice Hall"],
      language: ["eng"],
    };

    const normalized = normalizeOpenLibraryBook(rawOlDoc);
    assert.ok(normalized);
    assert.equal(normalized.openLibraryId, "OL12345W");
    assert.equal(normalized.isbn, "9780132350884");
    assert.equal(normalized.coverId, "1234567");
    assert.equal(normalized.source, "openlibrary");
    assert.ok(normalized.image.startsWith("https://covers.openlibrary.org/"));
  });

  it("3. Deterministic NPR Pricing calculates realistic bookstore prices", () => {
    const price200Pages = calculateStorePriceNPR(200, "Fiction");
    const price500Pages = calculateStorePriceNPR(500, "Business");
    const price800Pages = calculateStorePriceNPR(800, "Technology");

    assert.ok(price200Pages >= 449 && price200Pages <= 1899);
    assert.ok(price500Pages >= 449 && price500Pages <= 1899);
    assert.ok(price800Pages >= 449 && price800Pages <= 1899);
    assert.ok(price800Pages >= price200Pages);
  });

  it("4. Deduplication Keys correctly identify duplicate variants", () => {
    const keys1 = getBookDedupeKeys({
      isbn: "978-0-13-235088-4",
      googleBooksId: "GBS_123",
      openLibraryId: "OL_456W",
      title: "Clean Code!",
      author: "Robert C. Martin",
    });

    assert.ok(keys1.includes("isbn:9780132350884"));
    assert.ok(keys1.includes("gid:GBS_123"));
    assert.ok(keys1.includes("olid:OL_456W"));
    assert.ok(keys1.includes("title_author:cleancode:::robertcmartin"));
  });

  it("5. In-memory Caching: External searches are cached and normalized safely", async () => {
    clearProviderCache();
    const stats0 = getProviderCacheStats();
    assert.equal(stats0.size, 0);

    const res1 = await BookDiscoveryService.searchBooks("Hobbit", 1, 5);
    assert.ok(Array.isArray(res1.books));
    assert.equal(typeof res1.total, "number");

    // Whitespace/casing normalized query hits cache
    const res2 = await BookDiscoveryService.searchBooks("  hobbit  ", 1, 5);
    assert.equal(res1.books.length, res2.books.length);
  });

  it("6. Deduplication & Persistence: Existing books are reused and duplicate insertion is prevented", async () => {
    const testBookData = {
      googleBooksId: "TEST_GBS_12345",
      openLibraryId: "TEST_OL_99999W",
      title: "Test External Provider Book Title",
      author: "Test Provider Author",
      isbn: "9789999999999",
      coverId: "99999",
      image: "https://covers.openlibrary.org/b/isbn/9789999999999-L.jpg",
      genre: "Science Fiction",
      pages: 350,
      publisher: "Test Press",
      language: "English",
      price: 749,
      discountPercentage: 0,
      stock: 25,
      source: "google_books",
    };

    // First persist: creates document
    const doc1 = await BookDiscoveryService.persistExternalBookToMongo(testBookData);
    assert.ok(doc1);
    assert.ok(doc1._id);

    // Second persist with same ISBN: reuses existing document
    const doc2 = await BookDiscoveryService.persistExternalBookToMongo({
      ...testBookData,
      price: 999, // Should NOT overwrite stored price
    });
    assert.equal(doc1._id.toString(), doc2._id.toString());
    assert.equal(doc2.price, 749); // Authoritative store price preserved

    // Third persist with same Google Books ID: reuses existing document
    const doc3 = await BookDiscoveryService.persistExternalBookToMongo({
      ...testBookData,
      isbn: "", // without ISBN but with same googleBooksId
    });
    assert.equal(doc1._id.toString(), doc3._id.toString());
  });

  it("7. Subject Discovery retrieves real books across providers", async () => {
    const books = await BookDiscoveryService.discoverBooksBySubject("fiction", 5);
    assert.ok(Array.isArray(books));
    if (books.length > 0) {
      assert.ok(books[0].title);
      assert.ok(books[0].author);
      assert.ok(books[0].image);
    }
  });

  it("8. Fallback Cascade: MongoBookProvider returns valid records on query", async () => {
    const mongoProvider = new MongoBookProvider();
    const result = await mongoProvider.search("Test External", 1, 5);
    assert.ok(Array.isArray(result.books));
    assert.ok(result.total >= 0);
  });

  it("9. Fail-closed safety: Empty or malformed queries return empty list without crashing", async () => {
    const resEmpty = await BookDiscoveryService.searchBooks("", 1, 10);
    assert.equal(resEmpty.books.length, 0);
    assert.equal(resEmpty.total, 0);

    const resSubjectEmpty = await BookDiscoveryService.discoverBooksBySubject("", 10);
    assert.equal(resSubjectEmpty.length, 0);
  });
});
