import bookreview from "../../src/assets/book review.jpg";

export function MemesPage() {
  return (
    <div className="relative w-full h-screen">
      <img
        src={bookreview}
        alt="Book Review"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <p className="text-white text-4xl font-bold">HAHAHA!!! This is Demo Project</p>
      </div>
    </div>
  );
}
