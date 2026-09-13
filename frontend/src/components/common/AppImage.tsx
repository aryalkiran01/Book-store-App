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
  containerClassName?: string;
  aspectRatio?: string;
}

const DEFAULT_FALLBACK_BOOK_COVER = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80";

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
  className = "",
  containerClassName = "",
  aspectRatio,
  onError,
  onLoad,
  ...rest
}) => {
  const initialSrc = normalizeImageUrl(src);
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialSrc);
  const [hasError, setHasError] = useState(!initialSrc);
  const [triedBackup, setTriedBackup] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(initialSrc));

  const displayTitle = fallbackTitle || fallbackText || alt || "";

  useEffect(() => {
    const freshSrc = normalizeImageUrl(src);
    setCurrentSrc(freshSrc);
    setTriedBackup(false);
    if (!freshSrc) {
      setHasError(true);
      setIsLoading(false);
    } else {
      setHasError(false);
      setIsLoading(true);
    }
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // If it's a book image and haven't tried fallback cover yet, attempt standard high-quality book image
    if (fallbackType === "book" && !triedBackup && currentSrc !== DEFAULT_FALLBACK_BOOK_COVER) {
      setTriedBackup(true);
      setCurrentSrc(DEFAULT_FALLBACK_BOOK_COVER);
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

  if (hasError || !currentSrc) {
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
          className={`relative flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-indigo-950/40 text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-slate-800 shadow-inner select-none w-full h-full ${containerClassName || className}`}
          style={aspectRatio ? { aspectRatio } : undefined}
          title={alt}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold line-clamp-2 px-1 text-slate-700 dark:text-slate-300">
            {displayTitle || "Book Cover"}
          </span>
          <span className="text-[9px] text-indigo-500/80 dark:text-indigo-400/80 font-semibold uppercase tracking-wider mt-1">
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
