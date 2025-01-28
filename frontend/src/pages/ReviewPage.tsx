// import { useParams } from "react-router-dom";
// import { AppShell } from "../components/AppShell";
// import { Reviews } from "../components/review/review";
// import { Footer } from "./Footer";

// export function ReviewPage() {
//   const { bookId, reviewId } = useParams();

//   return (
//     <div className="flex flex-col min-h-screen">
//       <AppShell>
//         {/* Main Content */}
//         <div className="flex flex-col items-center p-6">
//           <h1 className="text-2xl font-bold text-gray-800 mb-4">Book Reviews</h1>
//           {/* Pass the dynamic bookId and reviewId */}
//           {bookId && reviewId ? (
//             <Reviews bookId={bookId}  />
//           ) 
        
//           : (
//             <p className="text-gray-500">Invalid book or review ID.</p>
//           )}
//         </div>
//       </AppShell>
//       <Footer />
//     </div>
//   );
// }
