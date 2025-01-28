import { useGetBooksQuery } from "../../api/book/query";
import { useState } from "react";
import { CreateReview } from "../review/create-review";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Homebooks } from "../auth/home";
import { DeleteBooks } from "./delete-book";
import { UpdateBook } from "./update-book";

export function UserListBooks() {
  const { data, isLoading, isError, error } = useGetBooksQuery();
  const [visibleBooks, setVisibleBooks] = useState(6);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const handleLoadMore = () => setVisibleBooks((prev) => prev + 3);
  const handleShowLess = () => setVisibleBooks((prev) => prev - 3);

  const toggleDescription = (bookId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [bookId]: !prev[bookId],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-purple-700">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-800 to-pink-500">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg shadow">
          {error.message}
        </div>
      </div>
    );
  }

  const bookData = data?.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-purple-400 via-white-600 to-black">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {bookData.slice(0, visibleBooks).map((book) => {
            const isDescriptionExpanded = expandedDescriptions[book._id];

            return (
              <div
                key={book._id}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-transform duration-500 transform hover:scale-105 relative"
              >
                {/* Update/Delete Buttons at the top-right corner */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <UpdateBook book={book} />
                  <DeleteBooks bookId={book._id} />
                </div>

                {/* Image Section */}
                <div className={`relative h-64 w-full flex items-center justify-center bg-[url('${book.image}')]`}>
                  <img
                    src={book.image || "https://static-01.daraz.com.np/p/813072290c5c5d1e80d9c1c7794e2b8f.jpg width=200 height=200"}
                    alt={book.title}
                    className="w-72 h-full transition-transform duration-700"
                  />
                  <div className={`w-full h-full absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-75`}></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-xl font-bold text-white">{book.title}</h2>
                    <p className="text-sm text-amber-200">by {book.author}</p>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  {/* Genres */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {book.genre.split(",").map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-medium text-purple-900 bg-purple-100 rounded-full"
                      >
                        {genre.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                      <BookOpen size={16} />
                      Description
                    </h3>
                    <div className="relative">
                      <p
                        className={`text-sm text-gray-600 leading-relaxed ${
                          !isDescriptionExpanded && "line-clamp-3"
                        }`}
                      >
                        {book.description || "No description available."}
                      </p>
                      {book.description && book.description.length > 25 && (
                        <button
                          className="mt-2 text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-800 transition"
                          onClick={() => toggleDescription(book._id)}
                        >
                          {isDescriptionExpanded ? (
                            <>
                              Show Less <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              Read More <ChevronDown size={14} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Review Button */}
                  <div className="flex justify-end mt-1">
                    <Homebooks bookId={book._id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More / Show Less Buttons */}
        <div className="flex justify-center gap-4 mt-12">
          {visibleBooks < bookData.length && (
            <button
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-slate-900 text-white font-medium rounded-lg hover:opacity-90 transition duration-200"
              onClick={handleLoadMore}
            >
              Load More
            </button>
          )}
          {visibleBooks > 6 && (
            <button
              className="px-6 py-2 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition duration-200"
              onClick={handleShowLess}
            >
              Show Less
            </button>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedBook && (
        <CreateReview
          bookId={selectedBook._id}
          title={selectedBook.title}
          author={selectedBook.author}
          genres={selectedBook.genres}
          description={selectedBook.description}
          imageUrl={selectedBook.image || "/Defaultbook.png"}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}

export default UserListBooks;
