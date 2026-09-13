import { BookModel } from "../modules/book/model";
import { UserModel } from "../modules/auth/model";
import { ReviewModel } from "../modules/review/model";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    // Check if admin user exists
    const adminUser = await UserModel.findOne({ role: "admin" });
    let adminId: any = adminUser?._id;

    if (!adminUser) {
      const hashedPassword = await hashPassword("admin123");
      const newAdmin = await UserModel.create({
        username: "Admin",
        email: "admin@bookstore.com",
        password: hashedPassword,
        role: "admin",
      });
      adminId = newAdmin._id;
      console.log("Default admin account created: admin@bookstore.com / admin123");
    }

    // Check if sample regular user exists
    let sampleUser = await UserModel.findOne({ email: "reader@bookstore.com" });
    if (!sampleUser) {
      const hashedUserPassword = await hashPassword("reader123");
      sampleUser = await UserModel.create({
        username: "Avid Reader",
        email: "reader@bookstore.com",
        password: hashedUserPassword,
        role: "user",
      });
    }

    // Check if books exist
    const bookCount = await BookModel.countDocuments();
    if (bookCount === 0) {
      console.log("Seeding initial books collection...");
      const sampleBooks = [
        {
          title: "The Psychology of Money",
          author: "Morgan Housel",
          genre: "Business & Investing, Self Improvement",
          description:
            "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people. Money—investing, personal finance, and business decisions—is typically taught as a math-based field.",
          image: "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&w=600&q=80",
          price: 650,
        },
        {
          title: "Atomic Habits",
          author: "James Clear",
          genre: "Self Improvement, Lifestyle & Wellness",
          description:
            "An Easy & Proven Way to Build Good Habits & Break Bad Ones. No matter your goals, Atomic Habits offers a proven framework for improving--every day.",
          image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
          price: 750,
        },
        {
          title: "Karnali Blues",
          author: "Buddhisagar",
          genre: "Nepali, Fiction & Literature",
          description:
            "Karnali Blues is an epic journey through the bond between a father and son in rural Nepal, capturing the heart, struggle, and beauty of life in the western hills.",
          image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
          price: 550,
        },
        {
          title: "Rich Dad Poor Dad",
          author: "Robert T. Kiyosaki",
          genre: "Business & Investing",
          description:
            "What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not! An iconic guide to financial literacy and independence.",
          image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80",
          price: 490,
        },
        {
          title: "Seto Dharti",
          author: "Amar Neupane",
          genre: "Nepali, History & Memoir",
          description:
            "Madan Puraskar winning novel reflecting the deep agony, customs, and resilience of child widows in traditional Nepalese society.",
          image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80",
          price: 520,
        },
        {
          title: "Sapiens: A Brief History of Humankind",
          author: "Yuval Noah Harari",
          genre: "History & Memoir, Technology",
          description:
            "From a renowned historian comes a groundbreaking narrative of humanity’s creation and evolution—exploring how biology and history have defined us.",
          image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
          price: 890,
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
      }
      console.log("Database seeded successfully with initial catalog and reviews.");
    }
  } catch (error) {
    console.error("Error during database seed:", error);
  }
}
