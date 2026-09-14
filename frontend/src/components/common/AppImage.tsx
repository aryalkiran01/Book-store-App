import React, { useState, useEffect } from "react";
import { BookOpen, User as UserIcon, Image as ImageIcon } from "lucide-react";

import { env } from "../../config";

export type ImageFallbackType = "book" | "avatar" | "generic";

export interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: any;
  alt?: string;
  fallbackType?: ImageFallbackType;
  fallbackTitle?: string;
  fallbackText?: string;
  isbn?: string | null;
  coverId?: string | number | null;
  openLibraryId?: string | null;
  author?: string;
  genre?: string;
  containerClassName?: string;
  aspectRatio?: string;
}

export function normalizeImageUrl(input: any): string | null {
  if (!input) return null;

  let rawUrl = "";
  if (typeof input === "string") {
    rawUrl = input.trim();
  } else if (typeof input === "object") {
    if (Array.isArray(input)) {
      rawUrl = input[0] ? String(input[0]).trim() : "";
    } else if (input.url && typeof input.url === "string") {
      rawUrl = input.url.trim();
    } else if (input.src && typeof input.src === "string") {
      rawUrl = input.src.trim();
    } else if (input.image && typeof input.image === "string") {
      rawUrl = input.image.trim();
    }
  }

  if (!rawUrl || rawUrl === "null" || rawUrl === "undefined" || rawUrl === "[object Object]") {
    return null;
  }

  // Replace known broken/deleted unsplash ID
  if (rawUrl.includes("photo-1532012164546-f432f2e3edd3")) {
    return "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80";
  }

  // If it is a relative upload path like "/uploads/..." or "uploads/...", prefix with backend URL if applicable
  if (rawUrl.startsWith("/uploads/") || rawUrl.startsWith("uploads/")) {
    const backendUrl = env.BACKEND_URL || "http://localhost:4000";
    const cleanPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${backendUrl.replace(/\/$/, "")}${cleanPath}`;
  }

  // Ensure Unsplash images have required format and sizing parameters
  if (rawUrl.includes("images.unsplash.com") && !rawUrl.includes("auto=format")) {
    const delimiter = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${delimiter}auto=format&fit=crop&w=600&q=80`;
  }

  return rawUrl;
}

export const AppImage: React.FC<AppImageProps> = ({
  src,
  alt = "Image",
  fallbackType = "book",
  fallbackTitle,
  fallbackText,
  isbn,
  coverId,
  openLibraryId,
  author,
  genre,
  className = "",
  containerClassName = "",
  aspectRatio,
  onError,
  onLoad,
  ...rest
}) => {
  // Candidate fallback URLs
  const candidateUrls = React.useMemo(() => {
    const urls: string[] = [];
    const normalized = normalizeImageUrl(src);
    if (normalized) urls.push(normalized);

    if (fallbackType === "book") {
      const cleanIsbn = (isbn || "").replace(/[^0-9X]/gi, "").trim();
      if (cleanIsbn) {
        urls.push(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`);
      }
      const cleanCoverId = String(coverId || "").trim();
      if (cleanCoverId && cleanCoverId !== "0" && cleanCoverId !== "null") {
        urls.push(`https://covers.openlibrary.org/b/id/${cleanCoverId}-L.jpg?default=false`);
      }
      const cleanOlid = (openLibraryId || "").trim();
      if (cleanOlid) {
        urls.push(`https://covers.openlibrary.org/b/olid/${cleanOlid}-L.jpg?default=false`);
      }
    }
    return urls;
  }, [src, isbn, coverId, openLibraryId, fallbackType]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(candidateUrls.length === 0);
  const [isLoading, setIsLoading] = useState(candidateUrls.length > 0);

  const displayTitle = fallbackTitle || fallbackText || alt || "";

  useEffect(() => {
    setCurrentIndex(0);
    if (candidateUrls.length > 0) {
      setHasError(false);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [candidateUrls]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (currentIndex + 1 < candidateUrls.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsLoading(true);
      return;
    }

    setHasError(true);
    setIsLoading(false);
    if (onError) onError(e);
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    if (onLoad) onLoad(e);
  };

  // Helper for title initials
  const initials = displayTitle
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (hasError || candidateUrls.length === 0) {
    if (fallbackType === "avatar") {
      return (
        <div
          className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none w-full h-full ${containerClassName || className}`}
          title={alt}
        >
          {initials ? (
            <span className="font-bold text-xs">{initials}</span>
          ) : (
            <UserIcon className="w-1/2 h-1/2" />
          )}
        </div>
      );
    }

    if (fallbackType === "book") {
      return (
        <div
          className={`relative flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-slate-200 border border-indigo-500/20 shadow-inner select-none w-full h-full ${containerClassName || className}`}
          style={aspectRatio ? { aspectRatio } : undefined}
          title={alt}
        >
          {/* Spine crease shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md text-indigo-400 flex items-center justify-center mb-2 shadow-sm border border-white/10">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold line-clamp-2 px-1 text-slate-100 drop-shadow">
            {displayTitle || "Book Cover"}
          </span>
          {author && (
            <span className="text-[9px] text-slate-400 italic line-clamp-1 mt-0.5">
              {author}
            </span>
          )}
          <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider mt-2 border-t border-white/10 pt-1 w-full">
            KitabGhar
          </span>
        </div>
      );
    }

    // Generic fallback
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 w-full h-full ${containerClassName || className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
        <span className="text-[10px] font-medium">Image unavailable</span>
      </div>
    );
  }

  const currentSrc = candidateUrls[currentIndex];

  return (
    <div className={`relative overflow-hidden w-full h-full ${containerClassName}`}>
      {isLoading && (
        <div
          className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse z-10"
          style={aspectRatio ? { aspectRatio } : undefined}
        />
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        {...rest}
      />
    </div>
  );
};
