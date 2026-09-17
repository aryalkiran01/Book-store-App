import React from "react";
import clsx from "clsx";

export type LogoVariant = "full" | "icon-only" | "stacked";
export type LogoTheme = "dark" | "light" | "auto";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface KitabGharLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: LogoSize;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
}

const sizeClasses: Record<LogoSize, { full: string; icon: string; stacked: string }> = {
  xs: {
    full: "h-6 max-w-[120px]",
    icon: "h-6 w-6",
    stacked: "h-12 w-auto",
  },
  sm: {
    full: "h-8 max-w-[150px]",
    icon: "h-8 w-8",
    stacked: "h-16 w-auto",
  },
  md: {
    full: "h-10 max-w-[180px]",
    icon: "h-10 w-10",
    stacked: "h-20 w-auto",
  },
  lg: {
    full: "h-12 max-w-[210px]",
    icon: "h-12 w-12",
    stacked: "h-24 w-auto",
  },
  xl: {
    full: "h-16 max-w-[260px]",
    icon: "h-16 w-16",
    stacked: "h-32 w-auto",
  },
};

export const KitabGharLogo: React.FC<KitabGharLogoProps> = ({
  variant = "full",
  theme = "auto",
  size = "md",
  className = "",
  alt = "Kitab Ghar",
  loading = "eager",
}) => {
  const currentSizeClass = sizeClasses[size][variant === "icon-only" ? "icon" : variant === "stacked" ? "stacked" : "full"];

  if (variant === "icon-only") {
    if (theme === "auto") {
      return (
        <span className={clsx("inline-flex items-center justify-center relative flex-shrink-0", currentSizeClass, className)}>
          {/* Light Mode Icon */}
          <img
            src="/assets/icon-mark.png"
            alt={alt}
            loading={loading}
            className="w-full h-full object-contain dark:hidden transition-transform duration-200"
          />
          {/* Dark Mode Icon */}
          <img
            src="/assets/icon-mark.png"
            alt={alt}
            loading={loading}
            className="w-full h-full object-contain hidden dark:block brightness-150 contrast-125 transition-transform duration-200"
          />
        </span>
      );
    }

    const src = "/assets/icon-mark.png";
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={clsx(
          "object-contain flex-shrink-0 transition-transform duration-200",
          theme === "light" && "brightness-150 contrast-125",
          currentSizeClass,
          className
        )}
      />
    );
  }

  if (variant === "stacked") {
    return (
      <div className={clsx("inline-flex flex-col items-center justify-center text-center", className)}>
        <img
          src="/assets/logo-stacked-dark.png"
          alt={alt}
          loading={loading}
          className={clsx(
            "object-contain transition-transform duration-200",
            theme === "auto" && "dark:hidden",
            theme === "light" && "brightness-150 contrast-125",
            currentSizeClass
          )}
        />
        {theme === "auto" && (
          <img
            src="/assets/logo-stacked-dark.png"
            alt={alt}
            loading={loading}
            className={clsx(
              "object-contain hidden dark:block brightness-150 contrast-125 transition-transform duration-200",
              currentSizeClass
            )}
          />
        )}
      </div>
    );
  }

  // Full Horizontal Lockup
  if (theme === "auto") {
    return (
      <span className={clsx("inline-flex items-center flex-shrink-0 relative", currentSizeClass, className)}>
        {/* Light Mode (Dark Logo on light background) */}
        <img
          src="/assets/logo-main-dark.png"
          alt={alt}
          loading={loading}
          className="h-full w-auto object-contain dark:hidden transition-opacity duration-200"
        />
        {/* Dark Mode (Light Logo on dark background) */}
        <img
          src="/assets/logo-main-light.png"
          alt={alt}
          loading={loading}
          className="h-full w-auto object-contain hidden dark:block transition-opacity duration-200"
        />
      </span>
    );
  }

  const src = theme === "light" ? "/assets/logo-main-light.png" : "/assets/logo-main-dark.png";

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={clsx("object-contain flex-shrink-0", currentSizeClass, className)}
    />
  );
};

export default KitabGharLogo;
