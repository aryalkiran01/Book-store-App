import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, BookPlus, X } from "lucide-react";
import { successToast, errorToast } from "../toaster";
import { useAddBookMutation } from "../../api/book/query";

const createBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  genre: z.string().min(1, "Genre / Category is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  discountPercentage: z.coerce.number().min(0).max(100).optional().default(0),
  stock: z.coerce.number().int().min(0).optional().default(10),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publicationDate: z.string().optional(),
  pages: z.coerce.number().int().positive().optional(),
  language: z.string().optional(),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  featured: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
});

type CreateBookFormData = z.infer<typeof createBookSchema>;

export function CreateBook() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white shadow-lg bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <Plus className="w-4 h-4" />
        Add New Book
      </button>
      <CreateBookModal
        open={open}
        openModal={() => setOpen(true)}
        closeModal={() => setOpen(false)}
      />
    </div>
  );
}

export function CreateBookModal({
  open,
  closeModal,
}: {
  open: boolean;
  openModal?: () => void;
  closeModal: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookFormData>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: "",
      author: "",
      genre: "Fiction",
      description: "",
      price: 19.99,
      discountPercentage: 0,
      stock: 15,
      isbn: "",
      publisher: "",
      publicationDate: new Date().toISOString().split("T")[0],
      pages: 300,
      language: "English",
      image: "",
      featured: false,
      isNewArrival: true,
    },
  });

  const previewImage = watch("image");
  const addBookMutation = useAddBookMutation();

  const onSubmit: SubmitHandler<CreateBookFormData> = async (data) => {
    try {
      await addBookMutation.mutateAsync(
        {
          title: data.title.trim(),
          author: data.author.trim(),
          genre: data.genre.trim(),
          description: data.description?.trim(),
          price: Number(data.price),
          discountPercentage: Number(data.discountPercentage || 0),
          stock: Number(data.stock ?? 10),
          isbn: data.isbn?.trim() || undefined,
          publisher: data.publisher?.trim() || undefined,
          publicationDate: data.publicationDate || undefined,
          pages: data.pages ? Number(data.pages) : undefined,
          language: data.language?.trim() || "English",
          image: data.image?.trim() || undefined,
          featured: Boolean(data.featured),
          isNewArrival: Boolean(data.isNewArrival),
        },
        {
          onSuccess(res) {
            successToast(res.message || "Book created successfully!");
            reset();
            closeModal();
          },
          onError(error) {
            errorToast(error.message || "Failed to create book");
          },
        }
      );
    } catch (err: any) {
      errorToast(err.message || "Failed to submit book");
    }
  };

  return (
    <Dialog open={open} onClose={closeModal} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <BookPlus className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Add New Book
                  </DialogTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fill in the book catalog metadata and publishing details
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Book Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Midnight Library"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>
                  )}
                </div>

                {/* Author */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Author *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Matt Haig"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("author")}
                  />
                  {errors.author && (
                    <p className="text-xs text-rose-500 mt-1">{errors.author.message}</p>
                  )}
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Genre / Category *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fiction, Fantasy"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("genre")}
                  />
                  {errors.genre && (
                    <p className="text-xs text-rose-500 mt-1">{errors.genre.message}</p>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="24.99"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("price")}
                  />
                  {errors.price && (
                    <p className="text-xs text-rose-500 mt-1">{errors.price.message}</p>
                  )}
                </div>

                {/* Discount Percentage */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("discountPercentage")}
                  />
                  {errors.discountPercentage && (
                    <p className="text-xs text-rose-500 mt-1">{errors.discountPercentage.message}</p>
                  )}
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stock Inventory
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="20"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("stock")}
                  />
                  {errors.stock && (
                    <p className="text-xs text-rose-500 mt-1">{errors.stock.message}</p>
                  )}
                </div>

                {/* ISBN */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    placeholder="978-0143127741"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("isbn")}
                  />
                </div>

                {/* Publisher */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    placeholder="Penguin Books"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("publisher")}
                  />
                </div>

                {/* Publication Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("publicationDate")}
                  />
                </div>

                {/* Pages */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Page Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="320"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("pages")}
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    placeholder="English"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("language")}
                  />
                </div>

                {/* Cover Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    {...register("image")}
                  />
                  {errors.image && (
                    <p className="text-xs text-rose-500 mt-1">{errors.image.message}</p>
                  )}
                  {previewImage && (
                    <div className="mt-2 flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-10 h-14 object-cover rounded shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="text-xs text-slate-500 truncate">{previewImage}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Description / Synopsis
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter an engaging synopsis of the book..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
                    {...register("description")}
                  />
                </div>

                {/* Flags */}
                <div className="md:col-span-2 flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                      {...register("featured")}
                    />
                    Mark as Featured Book
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                      {...register("isNewArrival")}
                    />
                    Mark as New Arrival
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition shadow-md hover:shadow-amber-500/25"
                >
                  {isSubmitting ? "Creating..." : "Save to Catalog"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
