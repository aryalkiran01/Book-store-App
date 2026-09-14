import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import { BookModel } from "../src/modules/book/model";
import { env } from "../src/utils/config";

dotenv.config();

const CURATED_SEARCH_QUERIES = [
  "The Psychology of Money Morgan Housel",
  "Atomic Habits James Clear",
  "Dune Frank Herbert",
  "Project Hail Mary Andy Weir",
  "1984 George Orwell",
  "To Kill a Mockingbird Harper Lee",
  "The Great Gatsby Fitzgerald",
  "The Hobbit Tolkien",
  "Harry Potter Sorcerer's Stone Rowling",
  "The Silent Patient Alex Michaelides",
  "Gone Girl Gillian Flynn",
  "Steve Jobs Walter Isaacson",
  "Educated Tara Westover",
  "Clean Code Robert Martin",
  "The Pragmatic Programmer",
  "Designing Data-Intensive Applications",
  "Meditations Marcus Aurelius",
  "Thinking Fast and Slow Daniel Kahneman",
  "Deep Work Cal Newport",
  "Zero to One Peter Thiel",
  "Pride and Prejudice Jane Austen",
  "Karnali Blues",
  "Palpasa Cafe",
  "Seto Dharti",
];

async function run() {
  console.log("🚀 Connecting to MongoDB...");
  await mongoose.connect(env.DATABASE_URL);
  console.log("✅ Connected to MongoDB.");

  let importedCount = 0;
  let skippedCount = 0;

  for (const query of CURATED_SEARCH_QUERIES) {
    try {
      console.log(`\n🔍 Searching Open Library for: "${query}"...`);
      const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
        query
      )}&page=1&limit=1&fields=key,title,author_name,first_publish_year,isbn,cover_i,subject,number_of_pages_median,publisher,language`;

      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "KitabGhar-Bookstore-App/1.0 (catalog-ingestion)",
        },
      });

      const docs = response.data?.docs;
      if (!docs || docs.length === 0) {
        console.log(`⚠️ No match found on Open Library for "${query}".`);
        continue;
      }

      const doc = docs[0];
      const title = doc.title || query;
      const author = Array.isArray(doc.author_name)
        ? doc.author_name.slice(0, 3).join(", ")
        : doc.author_name || "Unknown Author";

      // Prefer ISBN-13
      let isbn = "";
      if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
        const isbn13 = doc.isbn.find((i: string) => String(i).trim().length === 13 || String(i).startsWith("978") || String(i).startsWith("979"));
        isbn = isbn13 ? String(isbn13).trim() : String(doc.isbn[0]).trim();
      }

      const openLibraryId = (doc.key || "").replace("/works/", "");
      const coverId = doc.cover_i ? String(doc.cover_i) : "";

      // Check if already in MongoDB
      const orClauses: any[] = [{ title }];
      if (isbn) orClauses.push({ isbn });
      if (openLibraryId) orClauses.push({ openLibraryId });

      const existing = await BookModel.findOne({ $or: orClauses });
      if (existing) {
        console.log(`⏭️  Already in database: "${existing.title}". Updating metadata if missing...`);
        let updated = false;
        if (!existing.isbn && isbn) { existing.isbn = isbn; updated = true; }
        if (!existing.openLibraryId && openLibraryId) { existing.openLibraryId = openLibraryId; updated = true; }
        if (!existing.coverId && coverId) { existing.coverId = coverId; updated = true; }
        if (updated) await existing.save();
        skippedCount++;
        continue;
      }

      let coverUrl = "";
      if (isbn) {
        coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      } else if (coverId) {
        coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      } else if (openLibraryId) {
        coverUrl = `https://covers.openlibrary.org/b/olid/${openLibraryId}-L.jpg`;
      } else {
        coverUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80";
      }

      const genre =
        Array.isArray(doc.subject) && doc.subject.length > 0
          ? doc.subject[0].slice(0, 50)
          : "Fiction";

      const publisher =
        Array.isArray(doc.publisher) && doc.publisher.length > 0
          ? doc.publisher[0]
          : "";

      const pages = doc.number_of_pages_median || 300;
      const basePrice = Math.max(499, Math.min(1899, Math.round(((pages || 280) * 2.2 + 250) / 50) * 50 - 1));

      const newBook = await BookModel.create({
        title,
        author,
        genre,
        description: `An acclaimed work by ${author}.`,
        image: coverUrl,
        price: basePrice,
        discountPercentage: Math.floor(Math.random() * 3) * 5, // 0, 5, 10
        stock: 25,
        isbn,
        openLibraryId,
        coverId,
        publisher,
        publicationDate: doc.first_publish_year ? String(doc.first_publish_year) : "",
        pages,
        language: "English",
        featured: importedCount < 6,
        isNewArrival: importedCount >= 6 && importedCount < 12,
      });

      console.log(`✅ [IMPORTED] "${newBook.title}" by ${newBook.author} | NPR ${newBook.price} | ISBN: ${newBook.isbn || "N/A"}`);
      importedCount++;

      // Small delay to be polite to Open Library API
      await new Promise((r) => setTimeout(r, 400));
    } catch (err: any) {
      console.error(`❌ Error importing "${query}":`, err.message);
    }
  }

  console.log(`\n=============================================`);
  console.log(`🎉 Ingestion Finished: ${importedCount} imported, ${skippedCount} already existed.`);
  console.log(`=============================================`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Ingestion script failed:", err);
  process.exit(1);
});
