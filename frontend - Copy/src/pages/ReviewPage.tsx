// src/pages/review.tsx
import React from "react";
import Reviews from "../components/review/review"; // Assuming this is where your reviews are defined

export function ReviewPage() {
  const bookId = "bookId";  // Make sure to replace this with an actual book ID or pass it dynamically

  return (
    <div>
      <h1>Reviews Page</h1>
      <Reviews bookId={bookId} />  {/* This will render the reviews */}
    </div>
  );
}
