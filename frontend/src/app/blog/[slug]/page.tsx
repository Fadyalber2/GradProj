import { notFound } from "next/navigation";
import ArticleHero from "@/components/blog-article/ArticleHero";
import ArticleBody from "@/components/blog-article/ArticleBody";
import ArticleSidebar from "@/components/blog-article/ArticleSidebar";
import NewsletterCTA from "@/components/blog-article/NewsletterCTA";
import RelatedArticles from "@/components/blog-article/RelatedArticles";
import { serverFetch } from "@/lib/queries";
import type { BlogPostDetail, BlogPostBrief } from "@/types/api";
import type { BlogArticle, RelatedArticle, ArticleBlock } from "@/types";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function mapArticle(post: BlogPostDetail): BlogArticle {
  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle ?? undefined,
    image: post.image_url ?? "",
    category: post.category ?? "General",
    date: formatDate(post.published_at),
    readTime: post.read_time ?? "5 min read",
    author: {
      name: post.author_name ?? "Aqary Team",
      role: post.author_role ?? "Editor",
      avatar: post.author_avatar ?? "",
    },
    lead: post.lead ?? "",
    content: (post.content ?? []) as ArticleBlock[],
    tags: post.tags ?? [],
  };
}

function mapRelated(post: BlogPostBrief): RelatedArticle {
  return {
    slug: post.slug,
    title: post.title,
    image: post.image_url ?? "",
    category: post.category ?? "General",
    date: formatDate(post.published_at),
    readTime: post.read_time ?? "5 min read",
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post, related] = await Promise.all([
    serverFetch<BlogPostDetail>(`/api/blog/${slug}`),
    serverFetch<BlogPostBrief[]>(`/api/blog/${slug}/related`),
  ]);

  if (!post) notFound();

  const article = mapArticle(post);
  const relatedArticles = (related ?? []).map(mapRelated);

  return (
    <>
      <ArticleHero article={article} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 py-4">
        <ArticleBody article={article} />
        <ArticleSidebar article={article} />
      </div>
      <NewsletterCTA />
      <RelatedArticles articles={relatedArticles} />
    </>
  );
}
