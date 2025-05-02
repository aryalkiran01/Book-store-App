import { z } from "zod";

export const AddBookControllerSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  genre: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.number(),
});
export const TUpdateBookControllerSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  genre: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.number(),
});

export type TAddBookControllerInput = z.TypeOf<typeof AddBookControllerSchema>;
export type TUpdateBookControllerInput = z.TypeOf<
  typeof TUpdateBookControllerSchema
>;
