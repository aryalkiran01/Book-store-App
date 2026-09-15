import React, { useState, useEffect, useMemo } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { normalizeImageUrl } from "./AppImage";

export interface BookCoverImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  isbn?: string | null;
  googleBooksId?: string | null;
  coverId?: string | number | null;
  openLibraryId?: string | null;
  title?: string;
  author?: string;
  genre?: string;
  containerClassName?: string;
  aspectRatioClass?: string; // e.g. "aspect-[2/3]" or "aspect-[3/4]"
  showFallbackBadge?: boolean;
}

// Deterministic aesthetic palette selector for typographic fallback covers
const COVER_PALETTES = [
  { bg: "from-slate-900 via-indigo-950 to-slate-900", accent: "text-indigo-400", border: "border-indigo-500/30", badge: "bg-indigo-500/20 text-indigo-300" },
  { bg: "from-emerald-950 via-slate-900 to-teal-950", accent: "text-emerald-400", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300" },
  { bg: "from-amber-950 via-slate-900 to-stone-900", accent: "text-amber-400", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-300" },
  { bg: "from-purple-950 via-slate-900 to-indigo-950", accent: "text-purple-400", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-300" },
  { bg: "from-rose-950 via-slate-900 to-red-950", accent: "text-rose-400", border: "border-rose-500/30", badge: "bg-rose-500/20 text-rose-300" },
  { bg: "from-cyan-950 via-slate-900 to-blue-950", accent: "text-cyan-400", border: "border-cyan-500/30", badge: "bg-cyan-500/20 text-cyan-300" },
];

function getPaletteForTitle(title: string = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COVER_PALETTES.length;
  return COVER_PALETTES[index];
}

export const BookCoverImage: React.FC<BookCoverImageProps> = ({
  src,
  isbn,
  googleBooksId,
  coverId,
  openLibraryId,
  title = "Book",
  author = "Author",
  genre = "Fiction",
  className = "",
  containerClassName = "",
  aspectRatioClass = "aspect-[2/3]",
  showFallbackBadge = true,
  alt,
  ...rest
}) => {
  // Build fallback candidate queue with priority
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    const normalizedPrimary = normalizeImageUrl(src);
    if (normalizedPrimary) {
      urls.push(normalizedPrimary);
    }

    const cleanIsbn = (isbn || "").replace(/[^0-9X]/gi, "").trim();
    if (cleanIsbn) {
      const isbnUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
      if (!urls.includes(isbnUrl)) urls.push(isbnUrl);
    }

    const cleanCoverId = String(coverId || "").trim();
    if (cleanCoverId && cleanCoverId !== "0" && cleanCoverId !== "null" && cleanCoverId !== "undefined") {
      const coverIdUrl = `https://covers.openlibrary.org/b/id/${cleanCoverId}-L.jpg?default=false`;
      if (!urls.includes(coverIdUrl)) urls.push(coverIdUrl);
    }

    const cleanOlid = (openLibraryId || "").trim();
    if (cleanOlid) {
      const olidUrl = `https://covers.openlibrary.org/b/olid/${cleanOlid}-L.jpg?default=false`;
      if (!urls.includes(olidUrl)) urls.push(olidUrl);
    }

    const cleanGid = (googleBooksId || "").trim();
    if (cleanGid) {
      const gbUrl = `https://books.google.com/books/content?id=${cleanGid}&printsec=frontcover&img=1&zoom=1`;
      if (!urls.includes(gbUrl)) urls.push(gbUrl);
    }

    return urls;
  }, [src, isbn, googleBooksId, coverId, openLibraryId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(candidateUrls.length > 0);
  const [allFailed, setAllFailed] = useState(candidateUrls.length === 0);

  useEffect(() => {
    setCurrentIndex(0);
    if (candidateUrls.length > 0) {
      setIsLoading(true);
      setAllFailed(false);
    } else {
      setIsLoading(false);
      setAllFailed(true);
    }
  }, [candidateUrls]);

  const handleImageError = () => {
    if (currentIndex + 1 < candidateUrls.length) {
      // Try next fallback URL in cascade
      setCurrentIndex((prev) => prev + 1);
      setIsLoading(true);
    } else {
      // Exhausted all URL candidates, trigger professional typographic book jacket fallback
      setAllFailed(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const palette = useMemo(() => getPaletteForTitle(title), [title]);
  const meaningfulAlt = alt || `${title} by ${author} book cover`;

  // Dynamic Typographic Book Jacket Fallback
  if (allFailed || candidateUrls.length === 0) {
    return (
      <div
        className={`relative w-full ${aspectRatioClass} rounded-2xl overflow-hidden shadow-lg border ${palette.border} bg-gradient-to-br ${palette.bg} text-white p-4 flex flex-col justify-between select-none ${containerClassName}`}
        title={meaningfulAlt}
        aria-label={meaningfulAlt}
      >
        {/* Book Spine Crease Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10 pointer-events-none" />

        {/* Top Header: Genre Tag & Emblem */}
        <div className="flex items-center justify-between z-10 pl-2">
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${palette.badge} border border-white/10 backdrop-blur-md truncate max-w-[120px]`}
          >
            {genre || "Classic"}
          </span>
          <Sparkles className={`w-3.5 h-3.5 ${palette.accent} opacity-80`} />
        </div>

        {/* Center: Typographic Title & Author */}
        <div className="my-auto text-center px-1.5 z-10">
          <div className="w-8 h-8 mx-auto mb-2.5 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-inner">
            <BookOpen className={`w-4 h-4 ${palette.accent}`} />
          </div>
          <h3 className="font-serif font-black text-sm sm:text-base leading-tight tracking-tight line-clamp-3 text-slate-100 drop-shadow-md">
            {title}
          </h3>
          <div className="w-8 h-0.5 mx-auto my-2 bg-white/20 rounded-full" />
          <p className="text-[11px] font-medium text-slate-300/90 line-clamp-1 italic">
            {author}
          </p>
        </div>

        {/* Bottom Seal */}
        <div className="text-center z-10 border-t border-white/10 pt-2 flex items-center justify-between px-1">
          <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">
            KitabGhar Edition
          </span>
          {showFallbackBadge && (
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">
              Classic Cover
            </span>
          )}
        </div>
      </div>
    );
  }

  const activeSrc = candidateUrls[currentIndex];

  return (
    <div
      className={`relative w-full ${aspectRatioClass} rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm ${containerClassName}`}
    >
      {/* Skeleton Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse z-10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-slate-400 dark:text-slate-600 animate-pulse" />
        </div>
      )}

      {/* Actual Book Cover Image */}
      <img
        src={activeSrc}
        alt={meaningfulAlt}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        } ${className}`}
        {...rest}
      />
    </div>
  );
};
