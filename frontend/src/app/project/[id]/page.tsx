import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectHero from "@/components/project-details/ProjectHero";
import ProjectInfo from "@/components/project-details/ProjectInfo";
import ResidencesGrid from "@/components/project-details/ResidencesGrid";
import ProjectSidebar from "@/components/project-details/ProjectSidebar";
import { serverFetch } from "@/lib/queries";
import type { ApiProjectDetail } from "@/types/api";
import type { ProjectDetail } from "@/types";

function mapProject(data: ApiProjectDetail): ProjectDetail {
  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle ?? "",
    image: data.image_url ?? "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200",
    developerName: data.agency_name ?? "Agency",
    developerVerified: data.agency_verified,
    description: data.description ?? "",
    completion: `${data.completion_pct}%`,
    unitsTotal: `${data.units_total ?? 0}`,
    startingPrice: data.starting_price
      ? `EGP ${data.starting_price.toLocaleString()}`
      : "Contact for price",
    status: data.status,
    keyFeatures: data.key_features.map((f) => ({ icon: "CheckCircle", label: f })),
    residences: [],
    salesAgent: { name: "Sales Team", role: "Sales Agent", avatar: "" },
    residenceOptions: [],
    documents: [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await serverFetch<ApiProjectDetail>(`/api/projects/${id}`);
  if (!data) return { title: "Project — Aqary" };
  return {
    title: `${data.title} — Aqary`,
    description: data.subtitle ?? data.title,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await serverFetch<ApiProjectDetail>(`/api/projects/${id}`);
  if (!data) notFound();

  const project = mapProject(data);

  return (
    <>
      <ProjectHero project={project} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-12">
            <ProjectInfo project={project} />
            <ResidencesGrid project={project} />
          </div>
          <aside className="w-full lg:w-80 shrink-0">
            <ProjectSidebar project={project} />
          </aside>
        </div>
      </div>
    </>
  );
}
