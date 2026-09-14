import { z } from "zod";

export const AddBookControllerSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters")
    .trim(),
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author cannot exceed 100 characters")
    .trim(),
  genre: z
    .string()
    .min(1, "Genre is required")
    .max(100, "Genre cannot exceed 100 characters")
    .trim(),
  description: z.string().max(5000, "Description too long").optional().default(""),
  image: z.string().max(2000, "Image URL too long").optional(),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(1000000, "Price exceeds maximum allowed limit"),
  discountPercentage: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional()
    .default(0),
  stock: z
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative")
    .optional()
    .default(20),
  isbn: z.string().max(50, "ISBN cannot exceed 50 characters").optional().default(""),
  openLibraryId: z.string().max(100).optional().default(""),
  coverId: z.string().max(100).optional().default(""),
  publisher: z.string().max(100, "Publisher cannot exceed 100 characters").optional().default(""),
  publicationDate: z.string().optional().default(""),
  pages: z.number().int().min(0).optional().default(0),
  language: z.string().max(50).optional().default("English"),
  featured: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
});

export const TUpdateBookControllerSchema = AddBookControllerSchema.partial();

export type TAddBookControllerInput = z.TypeOf<typeof AddBookControllerSchema>;
export type TUpdateBookControllerInput = z.TypeOf<
  typeof TUpdateBookControllerSchema
>;

