import { BookModel } from "../modules/book/model";
import { UserModel } from "../modules/auth/model";
import { ReviewModel } from "../modules/review/model";
import { hashPassword } from "./auth";
import { updateBookRatingAggregation } from "../modules/review/service";
import { env } from "./config";

/**
 * Securely initializes a production administrator if configured via environment variables.
 * Never creates hardcoded or default credentials.
 */
export async function initializeProductionAdmin() {
  try {
    const adminExists = await UserModel.exists({ role: "admin" });
    if (adminExists) {
      return;
    }

    const adminEmail = env.INITIAL_ADMIN_EMAIL?.trim();
    const adminPassword = env.INITIAL_ADMIN_PASSWORD?.trim();
    const adminUsername = env.INITIAL_ADMIN_USERNAME?.trim() || "Administrator";

    if (adminEmail && adminPassword) {
      if (adminPassword.length < 8) {
        console.error(
          "⚠️ [SECURITY ERROR] INITIAL_ADMIN_PASSWORD must be at least 8 characters. Administrator account not created."
        );
        return;
      }

      const existingUser = await UserModel.findOne({ email: adminEmail.toLowerCase() });
      if (existingUser) {
        existingUser.role = "admin";
        await existingUser.save();
        console.log(`🛡️ [SECURITY] Promoted existing account '${adminEmail}' to Administrator role.`);
      } else {
        const hashedPassword = await hashPassword(adminPassword);
        await UserModel.create({
          username: adminUsername,
          email: adminEmail.toLowerCase(),
          password: hashedPassword,
          role: "admin",
        });
        console.log(`🛡️ [SECURITY] Initial administrator account provisioned for '${adminEmail}'.`);
      }
    } else {
      console.log(
        "ℹ️ [SECURITY NOTICE] No administrator exists. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in environment or run 'npm run create:admin' to configure an administrator."
      );
    }
  } catch (error) {
    console.error("Error during production admin initialization:", error);
  }
}

/**
 * Seeds initial development/test data.
 * Guarded against unintended production execution.
 */
export async function seedDatabase() {
  try {
    // Strictly gate seed functionality: never seed in production
    if (env.NODE_ENV === "production") {
      console.warn("🛡️ [SECURITY] Database seeding is strictly disabled in production.");
      return;
    }

    // 1. Admin Provisioning
    const adminUser = await UserModel.findOne({ role: "admin" });
    if (!adminUser) {
      const devAdminEmail = env.INITIAL_ADMIN_EMAIL?.trim() || "admin@bookstore.com";
      const devAdminPassword = env.INITIAL_ADMIN_PASSWORD?.trim() || "Admin@Dev12345!";
      const devAdminUsername = env.INITIAL_ADMIN_USERNAME?.trim() || "Admin";

      const hashedPassword = await hashPassword(devAdminPassword);
      await UserModel.create({
        username: devAdminUsername,
        email: devAdminEmail.toLowerCase(),
        password: hashedPassword,
        role: "admin",
      });
      console.log(`🛡️ [DEV SEED] Development administrator account provisioned for '${devAdminEmail}'.`);
    }

    // 2. Regular Test User
    let sampleUser = await UserModel.findOne({ email: "reader@bookstore.com" });
    if (!sampleUser) {
      const hashedUserPassword = await hashPassword("Reader@Dev12345!");
      sampleUser = await UserModel.create({
        username: "Avid Reader",
        email: "reader@bookstore.com",
        password: hashedUserPassword,
        role: "user",
      });
      console.log("👤 [DEV SEED] Sample reader account provisioned.");
    }

    // 3. Stock Migration
    await BookModel.updateMany({ stock: { $exists: false } }, { $set: { stock: 25 } });

    // 4. Cleanup legacy dummy test artifacts (e.g. timestamp-suffixed titles from past runs)
    await BookModel.deleteMany({
      $or: [
        { title: { $regex: /\d{10,}$/ } },
        { price: { $lt: 100 } },
      ],
    });

    // 5. Sample Catalog & Reviews
    const bookCount = await BookModel.countDocuments();
    if (bookCount < 10) {
      console.log("📚 [DEV SEED] Seeding curated high-quality book collection (25 books)...");
      const sampleBooks = [
        {
          title: "The Psychology of Money",
          author: "Morgan Housel",
          genre: "Business & Investing",
          description:
            "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people. Timeless lessons on wealth, greed, and happiness.",
          isbn: "9780857197689",
          openLibraryId: "OL20668903W",
          image: "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",
          price: 699,
          discountPercentage: 10,
          stock: 35,
          pages: 256,
          publisher: "Harriman House",
          publicationDate: "2020",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Atomic Habits",
          author: "James Clear",
          genre: "Self Improvement",
          description:
            "An Easy & Proven Way to Build Good Habits & Break Bad Ones. No matter your goals, Atomic Habits offers a proven framework for improving every day with compounding micro-habits.",
          isbn: "9780735211292",
          openLibraryId: "OL17930368W",
          image: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
          price: 799,
          discountPercentage: 15,
          stock: 50,
          pages: 320,
          publisher: "Avery",
          publicationDate: "2018",
          language: "English",
          featured: true,
          isNewArrival: true,
        },
        {
          title: "Karnali Blues",
          author: "Buddhisagar",
          genre: "Nepali",
          description:
            "Karnali Blues is an epic journey through the bond between a father and son in rural Nepal, capturing the heart, struggle, and beauty of life in the western hills.",
          isbn: "9789389109962",
          openLibraryId: "OL32478541M",
          image: "https://covers.openlibrary.org/b/isbn/9789389109962-L.jpg",
          price: 550,
          discountPercentage: 0,
          stock: 30,
          pages: 416,
          publisher: "FinePrint",
          publicationDate: "2010",
          language: "Nepali",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Sapiens: A Brief History of Humankind",
          author: "Yuval Noah Harari",
          genre: "History",
          description:
            "From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution—exploring how biology and history have defined us.",
          isbn: "9780062316097",
          openLibraryId: "OL17079250W",
          image: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
          price: 899,
          discountPercentage: 20,
          stock: 25,
          pages: 464,
          publisher: "Harper",
          publicationDate: "2015",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Dune",
          author: "Frank Herbert",
          genre: "Science Fiction",
          description:
            "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is spice.",
          isbn: "9780441172719",
          openLibraryId: "OL17955350W",
          image: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
          price: 849,
          discountPercentage: 10,
          stock: 28,
          pages: 688,
          publisher: "Ace Books",
          publicationDate: "1965",
          language: "English",
          featured: true,
          isNewArrival: true,
        },
        {
          title: "Project Hail Mary",
          author: "Andy Weir",
          genre: "Science Fiction",
          description:
            "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself are doomed.",
          isbn: "9780593135204",
          openLibraryId: "OL24204481W",
          image: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
          price: 949,
          discountPercentage: 12,
          stock: 22,
          pages: 496,
          publisher: "Ballantine Books",
          publicationDate: "2021",
          language: "English",
          featured: false,
          isNewArrival: true,
        },
        {
          title: "1984",
          author: "George Orwell",
          genre: "Fiction",
          description:
            "Winston Smith toes the Party line, rewriting history to satisfy the Ministry of Truth. With each lie he writes, Winston grows to hate the Party that yearns for total power.",
          isbn: "9780451524935",
          openLibraryId: "OL1168007W",
          image: "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
          price: 499,
          discountPercentage: 5,
          stock: 40,
          pages: 328,
          publisher: "Signet Classic",
          publicationDate: "1949",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "To Kill a Mockingbird",
          author: "Harper Lee",
          genre: "Fiction",
          description:
            "A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice.",
          isbn: "9780060935467",
          openLibraryId: "OL17958619W",
          image: "https://covers.openlibrary.org/b/isbn/9780060935467-L.jpg",
          price: 599,
          discountPercentage: 0,
          stock: 30,
          pages: 336,
          publisher: "Harper Perennial",
          publicationDate: "1960",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          genre: "Fiction",
          description:
            "The exemplary novel of the Jazz Age, telling the tragic story of Jay Gatsby and his obsessive quest for the love of Daisy Buchanan.",
          isbn: "9780743273565",
          openLibraryId: "OL468535W",
          image: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
          price: 449,
          discountPercentage: 0,
          stock: 25,
          pages: 180,
          publisher: "Scribner",
          publicationDate: "1925",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "The Hobbit",
          author: "J.R.R. Tolkien",
          genre: "Fantasy",
          description:
            "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life. But his contentment is disturbed when Gandalf the wizard and a company of thirteen dwarves arrive on his doorstep.",
          isbn: "9780547928227",
          openLibraryId: "OL262758W",
          image: "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg",
          price: 799,
          discountPercentage: 10,
          stock: 35,
          pages: 366,
          publisher: "Houghton Mifflin",
          publicationDate: "1937",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Harry Potter and the Sorcerer's Stone",
          author: "J.K. Rowling",
          genre: "Fantasy",
          description:
            "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive. On his eleventh birthday, he discovers his true wizarding heritage.",
          isbn: "9780590353427",
          openLibraryId: "OL82563W",
          image: "https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg",
          price: 899,
          discountPercentage: 15,
          stock: 40,
          pages: 309,
          publisher: "Scholastic",
          publicationDate: "1997",
          language: "English",
          featured: true,
          isNewArrival: true,
        },
        {
          title: "The Name of the Wind",
          author: "Patrick Rothfuss",
          genre: "Fantasy",
          description:
            "The riveting first-person narrative of Kvothe, an infamous wizard, musician, and adventurer whose deeds became legends across the four corners of civilization.",
          isbn: "9780756404741",
          openLibraryId: "OL893415W",
          image: "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
          price: 999,
          discountPercentage: 10,
          stock: 18,
          pages: 662,
          publisher: "DAW Books",
          publicationDate: "2007",
          language: "English",
          featured: false,
          isNewArrival: true,
        },
        {
          title: "The Silent Patient",
          author: "Alex Michaelides",
          genre: "Mystery",
          description:
            "Alicia Berenson’s life is seemingly perfect. One evening she shoots her husband five times in the face and never speaks another word. Theo Faber is a criminal psychotherapist determined to unravel her secret.",
          isbn: "9781250301697",
          openLibraryId: "OL20002131W",
          image: "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg",
          price: 749,
          discountPercentage: 10,
          stock: 26,
          pages: 336,
          publisher: "Celadon Books",
          publicationDate: "2019",
          language: "English",
          featured: true,
          isNewArrival: true,
        },
        {
          title: "Gone Girl",
          author: "Gillian Flynn",
          genre: "Mystery",
          description:
            "On a warm summer morning in North Carthage, Missouri, it is Nick and Amy Dunne’s fifth wedding anniversary. Presents are being wrapped when Nick’s clever and beautiful wife disappears.",
          isbn: "9780307588371",
          openLibraryId: "OL16601446W",
          image: "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
          price: 699,
          discountPercentage: 5,
          stock: 20,
          pages: 432,
          publisher: "Crown",
          publicationDate: "2012",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "Steve Jobs",
          author: "Walter Isaacson",
          genre: "Biography",
          description:
            "Based on more than forty interviews with Jobs conducted over two years, Isaacson tells the astonishing roller-coaster story of the creative entrepreneur whose passion for perfection revolutionized multiple industries.",
          isbn: "9781451648539",
          openLibraryId: "OL16014765W",
          image: "https://covers.openlibrary.org/b/isbn/9781451648539-L.jpg",
          price: 1199,
          discountPercentage: 15,
          stock: 18,
          pages: 656,
          publisher: "Simon & Schuster",
          publicationDate: "2011",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Educated: A Memoir",
          author: "Tara Westover",
          genre: "Biography",
          description:
            "An unforgettable memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.",
          isbn: "9780399590504",
          openLibraryId: "OL19560412W",
          image: "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
          price: 849,
          discountPercentage: 10,
          stock: 24,
          pages: 352,
          publisher: "Random House",
          publicationDate: "2018",
          language: "English",
          featured: false,
          isNewArrival: true,
        },
        {
          title: "Clean Code",
          author: "Robert C. Martin",
          genre: "Technology",
          description:
            "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. A timeless handbook of craftsmanship and software engineering principles.",
          isbn: "9780132350884",
          openLibraryId: "OL3214589W",
          image: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
          price: 1299,
          discountPercentage: 10,
          stock: 25,
          pages: 464,
          publisher: "Prentice Hall",
          publicationDate: "2008",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "The Pragmatic Programmer",
          author: "David Thomas, Andrew Hunt",
          genre: "Technology",
          description:
            "One of the most significant books in computing, exploring modern best practices, code architecture, career tips, and developer mindset for writing resilient software.",
          isbn: "9780135957059",
          openLibraryId: "OL27514316W",
          image: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
          price: 1399,
          discountPercentage: 10,
          stock: 20,
          pages: 352,
          publisher: "Addison-Wesley",
          publicationDate: "2019",
          language: "English",
          featured: true,
          isNewArrival: true,
        },
        {
          title: "Designing Data-Intensive Applications",
          author: "Martin Kleppmann",
          genre: "Technology",
          description:
            "The definitive guide to the principles and architecture behind modern distributed data systems, scalability, consistency models, and transaction management.",
          isbn: "9781449373320",
          openLibraryId: "OL28283407W",
          image: "https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg",
          price: 1699,
          discountPercentage: 10,
          stock: 15,
          pages: 616,
          publisher: "O'Reilly Media",
          publicationDate: "2017",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "Meditations",
          author: "Marcus Aurelius",
          genre: "Philosophy",
          description:
            "Personal writings of the Roman Emperor Marcus Aurelius setting forth his ideas on Stoic philosophy, duty, resilience, and inner tranquility.",
          isbn: "9780140449334",
          openLibraryId: "OL35951W",
          image: "https://covers.openlibrary.org/b/isbn/9780140449334-L.jpg",
          price: 499,
          discountPercentage: 0,
          stock: 35,
          pages: 304,
          publisher: "Penguin Classics",
          publicationDate: "2006",
          language: "English",
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Thinking, Fast and Slow",
          author: "Daniel Kahneman",
          genre: "Philosophy",
          description:
            "Nobel laureate Daniel Kahneman's groundbreaking tour of the mind, explaining the two systems that drive the way we think and make choices.",
          isbn: "9780374533557",
          openLibraryId: "OL16053308W",
          image: "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
          price: 899,
          discountPercentage: 15,
          stock: 30,
          pages: 512,
          publisher: "Farrar, Straus and Giroux",
          publicationDate: "2011",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "Deep Work",
          author: "Cal Newport",
          genre: "Self Improvement",
          description:
            "Rules for Focused Success in a Distracted World. The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable.",
          isbn: "9781455586691",
          openLibraryId: "OL17364650W",
          image: "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
          price: 749,
          discountPercentage: 10,
          stock: 30,
          pages: 304,
          publisher: "Grand Central Publishing",
          publicationDate: "2016",
          language: "English",
          featured: false,
          isNewArrival: true,
        },
        {
          title: "Zero to One",
          author: "Peter Thiel, Blake Masters",
          genre: "Business & Investing",
          description:
            "Notes on Startups, or How to Build the Future. The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create.",
          isbn: "9780804139298",
          openLibraryId: "OL17088168W",
          image: "https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg",
          price: 649,
          discountPercentage: 5,
          stock: 25,
          pages: 224,
          publisher: "Crown Business",
          publicationDate: "2014",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "Pride and Prejudice",
          author: "Jane Austen",
          genre: "Romance",
          description:
            "The romantic clash between the opinionated Elizabeth Bennet and her proud beau, Mr. Darcy, is a splendid performance of civilized sparring in classic English literature.",
          isbn: "9780141439518",
          openLibraryId: "OL14953920W",
          image: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
          price: 499,
          discountPercentage: 0,
          stock: 35,
          pages: 480,
          publisher: "Penguin Classics",
          publicationDate: "1813",
          language: "English",
          featured: false,
          isNewArrival: false,
        },
        {
          title: "Palpasa Cafe",
          author: "Narayan Wagle",
          genre: "Nepali",
          description:
            "Madan Puraskar winning novel narrating the emotional story of an artist, Drishya, during the height of the civil conflict in the picturesque hills of Nepal.",
          isbn: "9789993304531",
          openLibraryId: "OL10321743M",
          image: "https://covers.openlibrary.org/b/isbn/9789993304531-L.jpg",
          price: 550,
          discountPercentage: 0,
          stock: 22,
          pages: 250,
          publisher: "Nepalaya",
          publicationDate: "2005",
          language: "Nepali",
          featured: true,
          isNewArrival: false,
        },
      ];

      const createdBooks: any[] = [];
      for (const b of sampleBooks) {
        const doc = await BookModel.findOneAndUpdate(
          { title: b.title.trim(), author: b.author.trim() },
          { $set: { ...b, source: "seeded" } },
          { upsert: true, new: true }
        );
        createdBooks.push(doc);
      }

      // Seed sample reviews idempotently
      if (createdBooks.length > 0 && sampleUser) {
        await ReviewModel.findOneAndUpdate(
          { bookId: createdBooks[0]._id, userId: sampleUser._id },
          {
            $set: {
              bookId: createdBooks[0]._id,
              userId: sampleUser._id,
              username: sampleUser.username,
              rating: 5,
              reviewText:
                "Absolutely transformative book on financial psychology and understanding human behavior around wealth.",
            },
          },
          { upsert: true, new: true }
        );

        if (createdBooks.length > 1) {
          await ReviewModel.findOneAndUpdate(
            { bookId: createdBooks[1]._id, userId: sampleUser._id },
            {
              $set: {
                bookId: createdBooks[1]._id,
                userId: sampleUser._id,
                username: sampleUser.username,
                rating: 5,
                reviewText:
                  "One of the best books on productivity and building micro-habits that compound over time!",
              },
            },
            { upsert: true, new: true }
          );
        }

        await updateBookRatingAggregation(createdBooks[0]._id.toString());
        if (createdBooks.length > 1) {
          await updateBookRatingAggregation(createdBooks[1]._id.toString());
        }
      }
      console.log("✅ [DEV SEED] Database seeded successfully with 25 curated authentic books and reviews.");
    }
  } catch (error) {
    console.error("Error during database seed:", error);
  }
}
