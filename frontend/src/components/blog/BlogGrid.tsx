"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { BlogPostBrief } from "@/types/api";
import BlogCard from "./BlogCard";

const TABS = ["All", "Market Trends", "Home Decor", "Tech"];

interface BlogGridProps {
  posts: BlogPostBrief[];
  isLoading?: boolean;
}

export default function BlogGrid({ posts, isLoading = false }: BlogGridProps) {
  const [activeTab, setActiveTab] = useState(0);

  const filtered =
    activeTab === 0
      ? posts
      : posts.filter(
          (p) =>
            p.category?.toLowerCase() === TABS[activeTab].toLowerCase()
        );

  return (
    <div>
      {/* Header with tabs */}
      <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white">Latest Articles</h2>
        <div className="flex gap-4 text-sm font-medium text-gray-400">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`pb-4 -mb-4.5 transition-colors ${
                i === activeTab
                  ? "text-primary border-b-2 border-primary"
                  : "hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-16">No articles found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map((post, i) => (
            <BlogCard key={post.id} post={post} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
