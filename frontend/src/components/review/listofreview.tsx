// import { useGetBooksQuery } from "../../api/book/query";
// import { useEffect, useState } from "react";
// import { GetReviews } from "../review/getreview";

// // Reviews Component - Styled Card for Review
// const Reviews = ({ bookId }: { bookId: string }) => {
//   const [reviews, setReviews] = useState<any[]>([]);
//   const [error, setError] = useState<string>("");

//   useEffect(() => {
//     const fetchReviews = async () => {
//       try {
//         const fetchedReviews = await GetReviews({ bookId, refetch: () => fetchReviews() });
//         if (Array.isArray(fetchedReviews)) {
//           setReviews(fetchedReviews);
//         } else {
//           setError("Failed to load reviews");
//         }
//       } catch (error: any) {
//         setError(`Failed to load reviews: ${error.message}`);
//       }
//     };

//     fetchReviews();
//   }, [bookId]);

//   return (
//     <div className="reviews-section mt-4">
//       {error && <p className="text-red-500 text-sm">{error}</p>}
//       {reviews.length === 0 ? (
//         <p className="text-gray-500 text-sm">No reviews yet. Be the first to review this book!</p>
//       ) : (
//         reviews.map((review) => (
//           <div key={review._id} className="review-item p-4 rounded-lg mt-4 bg-gray-100 shadow">
//             <div className="flex items-center justify-between">
//               <div className="rating flex items-center">
//                 <span className="font-semibold text-lg">Rating:</span>
//                 <span className="ml-2 text-yellow-500 font-bold">{review.rating} ★</span>
//               </div>
//               <span className="text-xs text-gray-400">
//                 {new Date(review.created_at).toLocaleDateString()}
//               </span>
//             </div>
//             <p className="mt-2 text-gray-800 text-sm">{review.reviewText}</p>
//             <p className="mt-1 text-xs text-gray-500">By: {review.userId}</p>
//           </div>
//         ))
//       )}
//     </div>
//   );
// };

// // ListReviewsUpdate Component - Styled Book Card
// export function ListReviewsUpdate() {
//   const { data, isLoading, isError, error } = useGetBooksQuery();

//   if (isLoading) {
//     return (
//       <div className="flex justify-center items-center">
//         <div className="spinner-border text-blue-500" role="status">
//           <span className="sr-only">Loading...</span>
//         </div>
//       </div>
//     );
//   }

//   if (isError) {
//     return (
//       <div className="text-center text-red-600">
//         {error?.message || "Something went wrong while fetching the books."}
//       </div>
//     );
//   }

//   if (!data?.data || data.data.length === 0) {
//     return <div className="text-center text-gray-700">No books found.</div>;
//   }

//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
//       {data.data.map((book) => (
//         <div
//           key={book._id}
//           className="border rounded-lg p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 w-72"
//         >
//           {/* Book Card */}
//           <div className="mb-6">
//             <p className="font-semibold text-xl text-gray-800">{book.title}</p>
//             <p className="text-sm italic text-gray-600">Author: {book.author}</p>
//             <p className="text-sm italic text-gray-600">Genre: {book.genre}</p>
//             <p className="mt-2 text-gray-700">{book.description}</p>
//           </div>

//           {/* Review Card for this Book */}
//           <Reviews bookId={book._id} />
//         </div>
//       ))}
//     </div>
//   );
// }
