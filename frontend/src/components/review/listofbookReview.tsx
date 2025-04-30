// import { useGetReviewQuery, useDeleteReviewBookMutation } from "../../api/review/query";
// import { Updatereview } from "../review/update-review";
// import { useDeleteReview } from "../review/delete-review";
// export function ListReviews() {
//   const { data, isLoading, isError, error } = useGetReviewQuery();

//   if (isLoading) {
//     return <div>Loading...</div>;
//   }

//   if (isError) {
//     return <div>{error?.message || "Error fetching reviews"}</div>;
//   }

//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mt-4">
//       {data?.data.map((review) => (
//         <div
//           key={review.reviewId}
//           className="border rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300"
//         >
//           <div className="flex justify-end gap-2 mb-4">
//             {/* Update Review Button */}

            
//             <Updatereview
//               review={{
//                 bookId: review.bookId,
//                 reviewId: review.reviewId,
//                 rating: review.rating,
//                 reviewText: review.reviewText,
//               }}
//               onUpdateSuccess={() => console.log("Review updated successfully")}
//             />

            

//             {/* Delete Review Button */}
//                <useDeleteReview reviewId={review._id} />
//           </div>

//           <div>
//             <p className="text-gray-700">{review.reviewText}</p>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
