"use client";

import { useQuery } from "@tanstack/react-query";
import AgenciesHero from "@/components/agencies/AgenciesHero";
import DevelopersSection from "@/components/agencies/DevelopersSection";
import UniversitiesSection from "@/components/agencies/UniversitiesSection";
import { agenciesQueries } from "@/lib/queries";

export default function AgenciesPage() {
  const { data, isLoading } = useQuery({
    ...agenciesQueries.list({ per_page: 12 }),
  });

  return (
    <>
      <AgenciesHero />
      <DevelopersSection
        agencies={data?.agencies ?? []}
        isLoading={isLoading}
      />
      <UniversitiesSection />
    </>
  );
}
