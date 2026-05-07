"use client";

import { Heart } from "lucide-react";
import { useLikesStore } from "@/stores/likesStore";

interface LikeButtonProps {
  id: string;
  size?: "sm" | "lg";
  className?: string;
}

export default function LikeButton({ id, size = "sm", className = "" }: LikeButtonProps) {
  const { isLiked, toggleLike } = useLikesStore();
  const liked = isLiked(id);

  const isLg = size === "lg";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleLike(id);
      }}
      aria-label={liked ? "Remove from favourites" : "Add to favourites"}
      className={`
        ${isLg
          ? "w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10"
          : "w-8 h-8 rounded-full bg-black/50 hover:bg-white"}
        flex items-center justify-center backdrop-blur-sm transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
        ${liked ? "text-red-500" : isLg ? "text-white hover:text-red-500" : "text-white hover:text-red-500"}
        ${className}
      `}
    >
      <Heart
        className={isLg ? "h-5 w-5" : "h-3.5 w-3.5"}
        fill={liked ? "currentColor" : "none"}
      />
    </button>
  );
}
