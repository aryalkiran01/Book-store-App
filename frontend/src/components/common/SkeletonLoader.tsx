import type { FC } from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular" | "card";
  count?: number;
}

export const SkeletonLoader: FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  count = 1,
}) => {
  const getBaseClasses = () => {
    switch (variant) {
      case "text":
        return "h-4 w-full rounded";
      case "circular":
        return "rounded-full";
      case "card":
        return "h-64 w-full rounded-2xl";
      case "rectangular":
      default:
        return "rounded-xl";
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          aria-hidden="true"
          className={`animate-pulse bg-muted/60 ${getBaseClasses()} ${className}`}
        />
      ))}
    </>
  );
};

export default SkeletonLoader;
