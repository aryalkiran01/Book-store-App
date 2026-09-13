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
  description: z.string().max(5000, "Description too long").optional(),
  image: z.string().max(2000, "Image URL too long").optional(),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(1000000, "Price exceeds maximum allowed limit"),
});

export const TUpdateBookControllerSchema = AddBookControllerSchema;

export type TAddBookControllerInput = z.TypeOf<typeof AddBookControllerSchema>;
export type TUpdateBookControllerInput = z.TypeOf<
  typeof TUpdateBookControllerSchema
>;

