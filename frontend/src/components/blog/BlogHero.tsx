"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { FEATURED_BLOG } from "@/lib/constants";

export default function BlogHero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative pt-32 pb-20 lg:pt-48 lg:pb-24 overflow-hidden group"
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={FEATURED_BLOG.image}
          alt="Featured Article Background"
          fill
          className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end">
        <div className="max-w-3xl">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Featured
            </span>
            <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {FEATURED_BLOG.date}
            </span>
            <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {FEATURED_BLOG.readTime}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            {FEATURED_BLOG.title}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 font-light leading-relaxed">
            {FEATURED_BLOG.excerpt}
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/blog/featured"
              className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-8 rounded-full transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              Read Article <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center -space-x-3 ml-4">
              <Image
                src={FEATURED_BLOG.authorAvatar}
                alt="Author"
                width={40}
                height={40}
                className="rounded-full border-2 border-background-dark"
              />
              <div className="w-10 h-10 rounded-full border-2 border-background-dark bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                +2
              </div>
            </div>
            <span className="text-sm text-gray-400 ml-2">
              By {FEATURED_BLOG.author}
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
