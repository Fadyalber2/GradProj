import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LikesStore {
  likedIds: string[];
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
}

export const useLikesStore = create<LikesStore>()(
  persist(
    (set, get) => ({
      likedIds: [],
      toggleLike: (id) =>
        set((state) => ({
          likedIds: state.likedIds.includes(id)
            ? state.likedIds.filter((i) => i !== id)
            : [...state.likedIds, id],
        })),
      isLiked: (id) => get().likedIds.includes(id),
    }),
    { name: "axiom-likes" }
  )
);
