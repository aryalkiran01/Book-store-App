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
import { successToast, errorToast } from "../toaster";
import { useAddBookMutation } from "../../api/book/query";

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  genre: z.string().min(1),
  description: z.string(),
  image: z.string().optional(),
  price: z.string().min(1), // Price as a string to handle form input
});

export function CreateBook() {
  const [open, setOpen] = useState(false);

  const openModal = () => {
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  return (
    <div className="max-w-3xl pl-8">
      <button
        onClick={openModal}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:from-indigo-600 hover:to-blue-500 
        transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        Create Book
      </button>
      <CreateBookModal
        open={open}
        openModal={openModal}
        closeModal={closeModal}
      />
    </div>
  );
}

export function CreateBookModal({
  open,
  closeModal,
}: {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      title: "",
      author: "",
      genre: "",
      description: "",
      image: "",
      price: "",
    },
    resolver: zodResolver(createBookSchema),
  });

  const addBookMutation = useAddBookMutation();

  const onSubmit: SubmitHandler<z.infer<typeof createBookSchema>> = (data) => {
    try {
      // Parse price to float
      const price = parseFloat(data.price);

      // Check if price is valid (a number)
      if (isNaN(price)) {
        errorToast("Invalid price value");
        return;
      }

      addBookMutation.mutateAsync(
        {
          title: data.title,
          author: data.author,
          genre: data.genre,
          description: data.description,
          image: data.image, // Image URL or path
          price, // Price
        },
        {
          onSuccess(data) {
            successToast(data.message);
            reset();
          },
          onError(error) {
            console.error("error", error);
            errorToast(error.message);
          },
        }
      );
    } catch (error) {
      console.error("error", error);
      errorToast("Something went wrong");
    }
  };

  return (
    <Dialog open={open} onClose={closeModal} className="relative z-10">
      <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                    Create Book
                  </DialogTitle>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="border-b border-gray-900/10 pb-12">
                      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                        {/* Title Field */}
                        <div className="sm:col-span-3">
                          <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">
                            Title
                          </label>
                          <div className="mt-2">
                            <input
                              id="title"
                              type="text"
                              placeholder="Enter the title"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              {...register("title")}
                            />
                            {errors.title && <p className="text-red-500">{errors.title.message}</p>}
                          </div>
                        </div>

                        {/* Author Field */}
                        <div className="sm:col-span-3">
                          <label htmlFor="author" className="block text-sm font-medium leading-6 text-gray-900">
                            Author
                          </label>
                          <div className="mt-2">
                            <input
                              id="author"
                              type="text"
                              placeholder="Enter the author's name"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              {...register("author")}
                            />
                            {errors.author && <p className="text-red-500">{errors.author.message}</p>}
                          </div>
                        </div>

                        {/* Genre Field */}
                        <div className="sm:col-span-3">
                          <label htmlFor="genre" className="block text-sm font-medium leading-6 text-gray-900">
                            Genre
                          </label>
                          <div className="mt-2">
                            <input
                              id="genre"
                              type="text"
                              placeholder="Enter the genre"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              {...register("genre")}
                            />
                            {errors.genre && <p className="text-red-500">{errors.genre.message}</p>}
                          </div>
                        </div>

                        {/* Description Field */}
                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
                            Description
                          </label>
                          <div className="mt-2">
                            <textarea
                              id="description"
                              placeholder="Enter a brief description"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              {...register("description")}
                            />
                            {errors.description && <p className="text-red-500">{errors.description.message}</p>}
                          </div>
                        </div>

                        {/* Price Field */}
                        <div className="sm:col-span-3">
                          <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900">
                            Price
                          </label>
                          <div className="mt-2">
                            <input
                              id="price"
                              type="text"
                              placeholder="Enter the price"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              {...register("price")}
                            />
                            {errors.price && <p className="text-red-500">{errors.price.message}</p>}
                          </div>
                        </div>

                        {/* Image Field (Optional) */}
                        <div className="sm:col-span-3">
                          <label htmlFor="image" className="block text-sm font-medium leading-6 text-gray-900">
                            Image URL (Optional)
                          </label>
                          <div className="mt-2">
                            <input
                              id="image"
                              type="text"
                              placeholder="Enter the image URL"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              {...register("image")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                      <button
                        type="submit"
                        className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
