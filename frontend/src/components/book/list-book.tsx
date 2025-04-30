import { useGetBooksQuery } from "../../api/book/query";
import { useState } from "react";


import { useNavigate } from "react-router-dom";
export function UserListBooks() {
  const { data, isLoading, isError, error } = useGetBooksQuery();
  const [visibleBooks, setVisibleBooks] = useState(6);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    [key: string]: boolean;
  }>({});



 const navigate = useNavigate();
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
    <div className="text-center py-12 ">
        <h1 className="text-5xl text-blue-950 tracking-wide drop-shadow-lg font-serif">
          What do you want to read?
        </h1>
        <p className="text-xl text-amber-950 mt-2">
          Find Your Next Great Read Among Our Best Sellers.
        </p>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500 transform">
          {bookData.slice(0, visibleBooks).map((book) => {
            const isDescriptionExpanded = expandedDescriptions[book._id];
 
            return (
              
              <div
              key={book._id}
              className="group  from- via-slate-100 to-blue-950 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-transform duration-500 transform hover:scale-105"
              onClick={() => navigate(`memes`)} 
          >
              {/* Image Section */}
              <div className="relative h-96">
                <img
                  src={
                    book.image ||
                    "https://static-01.daraz.com.np/p/813072290c5c5d1e80d9c1c7794e2b8f.jpg"
                  }
                  alt={book.title}
                  className="w-full h-full object-contain transition-transform duration-700 "
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-75"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-xl font-bold text-white">
                    {book.title}
                  </h2>
                  <p className="text-sm text-amber-200">by {book.author}</p>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
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
                    <div className="text-sm mb-4">
                      <p
                        className={isDescriptionExpanded ? "" : "line-clamp-2"}
                      >
                        {book.description}
                      </p>
                      <button
                        className="text-black text-xs mt-2"
                        onClick={() => toggleDescription(book._id)}
                      >
                        {isDescriptionExpanded ? "Show Less" : "Show More"}
                      </button>
                    </div>
                
                
                  </div>
                  
            </div>
            
            )
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
          {visibleBooks > 4 && (
            <button
              className="px-6 py-2 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition duration-200"
              onClick={handleShowLess}
            >
              Show Less
            </button>
          )}
        </div >
      </div>

     
    </div>
  );
}

export default UserListBooks;
