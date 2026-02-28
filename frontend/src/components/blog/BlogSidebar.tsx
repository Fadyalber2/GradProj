"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { POPULAR_POSTS, BLOG_TOPICS } from "@/lib/constants";

export default function BlogSidebar() {
  return (
    <div className="space-y-12">
      {/* Search */}
      <div className="bg-card-dark p-6 rounded-2xl border border-white/5">
        <h3 className="text-white font-bold text-lg mb-4">Search</h3>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-500" />
          </span>
          <input
            type="text"
            placeholder="Type keywords..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Popular Posts */}
      <div>
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" /> Popular Posts
        </h3>
        <div className="space-y-6">
          {POPULAR_POSTS.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="group flex gap-4 items-start"
            >
              <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden relative">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="80px"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </div>
              <div>
                <span className="text-primary text-[10px] font-bold uppercase tracking-wide mb-1 block">
                  {post.category}
                </span>
                <h4 className="text-white text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </h4>
                <span className="text-gray-500 text-xs mt-1 block">
                  {post.timeAgo}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div>
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" /> Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {BLOG_TOPICS.map((topic) => (
            <Link
              key={topic}
              href={`/blog?topic=${topic.toLowerCase().replace(/\s+/g, "-")}`}
              className="px-3 py-1.5 bg-card-dark border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white hover:border-primary hover:bg-white/5 transition-all"
            >
              {topic}
            </Link>
          ))}
        </div>
      </div>

      {/* Newsletter CTA */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] p-8 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        <h3 className="text-white font-bold text-xl mb-2 relative z-10">
          Join the Circle
        </h3>
        <p className="text-gray-400 text-sm mb-6 relative z-10 leading-relaxed">
          Get the latest market insights and exclusive property listings
          delivered to your inbox weekly.
        </p>
        <form
          className="space-y-3 relative z-10"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-primary/25"
          >
            Subscribe
          </button>
        </form>
        <p className="text-[10px] text-gray-500 mt-4 text-center relative z-10">
          No spam, unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
