"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { BlogPostBrief } from "@/types/api";

interface BlogCardProps {
  post: BlogPostBrief;
  index: number;
}

export default function BlogCard({ post, index }: BlogCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Link href={`/blog/${post.slug}`} className="block h-full">
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group flex flex-col h-full bg-card-dark rounded-2xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 shadow-lg"
    >
      <div className="relative h-60 overflow-hidden">
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-gray-600 text-sm">No image</span>
          </div>
        )}
        {post.category && (
          <div className="absolute top-4 left-4">
            <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
              {post.category}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {date && <span>{date}</span>}
          {post.read_time && (
            <>
              <span>·</span>
              <span>{post.read_time}</span>
            </>
          )}
          {post.author_name && (
            <>
              <span>·</span>
              <span>{post.author_name}</span>
            </>
          )}
        </div>

        <h3 className="text-white font-bold text-lg mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>

        {post.subtitle && (
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-4">
            {post.subtitle}
          </p>
        )}

        <span className="mt-auto flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
          Read More <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </motion.article>
    </Link>
  );
}
