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

    // 4. Sample Catalog & Reviews
    const bookCount = await BookModel.countDocuments();
    if (bookCount === 0) {
      console.log("📚 [DEV SEED] Seeding initial book collection...");
      const sampleBooks = [
        {
          title: "The Psychology of Money",
          author: "Morgan Housel",
          genre: "Business & Investing",
          description:
            "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people. Money—investing, personal finance, and business decisions—is typically taught as a math-based field.",
          isbn: "9780857197689",
          openLibraryId: "OL20668903W",
          image: "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",
          price: 650,
          discountPercentage: 10,
          stock: 30,
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Atomic Habits",
          author: "James Clear",
          genre: "Self Improvement",
          description:
            "An Easy & Proven Way to Build Good Habits & Break Bad Ones. No matter your goals, Atomic Habits offers a proven framework for improving--every day.",
          isbn: "9780735211292",
          openLibraryId: "OL17930368W",
          image: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
          price: 750,
          discountPercentage: 15,
          stock: 45,
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
          stock: 20,
          featured: true,
          isNewArrival: false,
        },
        {
          title: "Rich Dad Poor Dad",
          author: "Robert T. Kiyosaki",
          genre: "Business & Investing",
          description:
            "What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not! An iconic guide to financial literacy and independence.",
          isbn: "9781612680194",
          openLibraryId: "OL3377770W",
          image: "https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg",
          price: 490,
          discountPercentage: 5,
          stock: 15,
          featured: false,
          isNewArrival: false,
        },
        {
          title: "Seto Dharti",
          author: "Amar Neupane",
          genre: "Nepali",
          description:
            "Madan Puraskar winning novel reflecting the deep agony, customs, and resilience of child widows in traditional Nepalese society.",
          isbn: "9789937856416",
          openLibraryId: "OL25439401M",
          image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80",
          price: 520,
          discountPercentage: 0,
          stock: 12,
          featured: false,
          isNewArrival: true,
        },
        {
          title: "Sapiens: A Brief History of Humankind",
          author: "Yuval Noah Harari",
          genre: "History & Memoir",
          description:
            "From a renowned historian comes a groundbreaking narrative of humanity’s creation and evolution—exploring how biology and history have defined us.",
          isbn: "9780062316097",
          openLibraryId: "OL17079250W",
          image: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
          price: 890,
          discountPercentage: 20,
          stock: 25,
          featured: true,
          isNewArrival: true,
        },
      ];

      const createdBooks = await BookModel.insertMany(sampleBooks);

      // Seed sample reviews
      if (createdBooks.length > 0 && sampleUser) {
        await ReviewModel.create({
          bookId: createdBooks[0]._id,
          userId: sampleUser._id,
          username: sampleUser.username,
          rating: 5,
          reviewText:
            "Absolutely transformative book on financial psychology and understanding human behavior around wealth.",
        });

        await ReviewModel.create({
          bookId: createdBooks[1]._id,
          userId: sampleUser._id,
          username: sampleUser.username,
          rating: 5,
          reviewText:
            "One of the best books on productivity and building micro-habits that compound over time!",
        });

        await updateBookRatingAggregation(createdBooks[0]._id.toString());
        await updateBookRatingAggregation(createdBooks[1]._id.toString());
      }
      console.log("✅ [DEV SEED] Database seeded successfully with initial catalog and reviews.");
    }
  } catch (error) {
    console.error("Error during database seed:", error);
  }
}
