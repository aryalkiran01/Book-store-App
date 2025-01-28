import { HomeReviewBook } from "../review/homeReview";

export function Homebooks({ bookId }: { bookId: string }) {
  return (
    <div className="flex justify-between items-center mt-auto pt-4">
      <button>
        <HomeReviewBook bookId={bookId} />
      </button>
    </div>
  );
}
