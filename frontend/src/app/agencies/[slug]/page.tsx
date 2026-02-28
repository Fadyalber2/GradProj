import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AgencyHero from "@/components/agency-details/AgencyHero";
import AgencySidebar from "@/components/agency-details/AgencySidebar";
import FeaturedProjects from "@/components/agency-details/FeaturedProjects";
import TopListings from "@/components/agency-details/TopListings";
import { serverFetch } from "@/lib/queries";
import type { ApiAgencyDetail, ProjectBrief, PaginatedListings } from "@/types/api";
import type { AgencyDetail, AgencyProject } from "@/types";

function mapProject(p: ProjectBrief): AgencyProject {
  const statusColor =
    p.status === "completed" ? "text-green-400" : "text-yellow-400";
  return {
    id: p.id,
    title: p.title,
    location: "Egypt",
    image: p.image_url ?? "",
    price: p.starting_price
      ? `EGP ${p.starting_price.toLocaleString()}`
      : "Contact for price",
    priceLabel: "Starting from",
    beds: "Various",
    area: "N/A",
    status: p.status,
    statusColor,
    progressPercent: p.completion_pct,
    progressColor: "bg-primary",
    progressLabel: `${p.completion_pct}% Complete`,
    completionLabel: `${p.completion_pct}%`,
    cta: "Learn More",
  };
}

function buildAgencyDetail(
  agency: ApiAgencyDetail,
  projects: ProjectBrief[],
  listings: PaginatedListings
): AgencyDetail {
  return {
    slug: agency.slug,
    name: agency.name,
    logoText: agency.name.slice(0, 2).toUpperCase(),
    badge: agency.verified ? "Verified Developer" : "Developer",
    location: "Cairo, Egypt",
    bannerImage: agency.banner_url ?? "",
    description: agency.description ?? "",
    trustScore: `${agency.trust_score}`,
    projectsForSale: `${agency.active_projects}`,
    developmentHistory: agency.created_at
      ? `${new Date().getFullYear() - new Date(agency.created_at).getFullYear()} Years`
      : "N/A",
    awards: [],
    featuredProjects: projects.slice(0, 3).map(mapProject),
    topListings: listings.listings.slice(0, 3).map((l) => ({
      id: l.id,
      title: l.title,
      location: l.location,
      image: l.images[0] ?? "",
      price: `EGP ${l.price.toLocaleString()}`,
      priceLabel: `/${l.price_period}`,
      beds: l.bedrooms != null ? `${l.bedrooms}` : "N/A",
      area: l.size_sqm ? `${l.size_sqm} m²` : "N/A",
      status: l.status,
      statusColor: "text-green-400",
      progressPercent: 100,
      progressColor: "bg-primary",
      progressLabel: "Active",
      completionLabel: "Active",
      cta: "View Listing",
    })),
    totalListings: listings.total,
    totalCities: 1,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agency = await serverFetch<ApiAgencyDetail>(`/api/agencies/${slug}`);
  if (!agency) return { title: "Agency — Aqary" };
  return {
    title: `${agency.name} — Aqary`,
    description: agency.description ?? `Explore properties from ${agency.name} on Aqary.`,
  };
}

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [agency, projectsRes, listingsRes] = await Promise.all([
    serverFetch<ApiAgencyDetail>(`/api/agencies/${slug}`),
    serverFetch<{ projects: ProjectBrief[] }>(`/api/agencies/${slug}/projects`),
    serverFetch<PaginatedListings>(`/api/agencies/${slug}/listings`),
  ]);

  if (!agency) notFound();

  const detail = buildAgencyDetail(
    agency,
    projectsRes?.projects ?? [],
    listingsRes ?? { listings: [], total: 0, page: 1, per_page: 10 }
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      <AgencyHero agency={detail} />

      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[30%]">
            <AgencySidebar agency={detail} />
          </div>
          <div className="lg:w-[70%] space-y-12">
            <FeaturedProjects projects={detail.featuredProjects} />
            <TopListings
              listings={detail.topListings}
              totalListings={detail.totalListings}
              totalCities={detail.totalCities}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
