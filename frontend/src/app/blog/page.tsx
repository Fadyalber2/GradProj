"use client";

import { useQuery } from "@tanstack/react-query";
import BlogHero from "@/components/blog/BlogHero";
import BlogGrid from "@/components/blog/BlogGrid";
import BlogSidebar from "@/components/blog/BlogSidebar";
import { blogQueries } from "@/lib/queries";

export default function BlogPage() {
  const { data, isLoading } = useQuery({
    ...blogQueries.list({ per_page: 20 }),
  });

  return (
    <>
      <BlogHero />
      <section className="py-12 bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-3/4">
              <BlogGrid posts={data?.posts ?? []} isLoading={isLoading} />
            </div>
            <div className="lg:w-1/4">
              <BlogSidebar />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
