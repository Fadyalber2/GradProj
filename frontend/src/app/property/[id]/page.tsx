import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import PropertyHero from "@/components/property/PropertyHero";
import PropertyInfo from "@/components/property/PropertyInfo";
import PropertySidebar from "@/components/property/PropertySidebar";
import SharedHousingHero from "@/components/shared-housing/SharedHousingHero";
import SharedHousingStats from "@/components/shared-housing/SharedHousingStats";
import AboutHouse from "@/components/shared-housing/AboutHouse";
import HousematesSection from "@/components/shared-housing/HousematesSection";
import SharedAmenities from "@/components/shared-housing/SharedAmenities";
import SharedHousingSidebar from "@/components/shared-housing/SharedHousingSidebar";
import MobilePropertyCTA from "@/components/property/MobilePropertyCTA";
import { getListing } from "@/lib/supabase-queries";
import type { ListingDetailWithSimilar } from "@/types/api";
import type { PropertyDetail, SharedHousingDetail, SharedAmenity } from "@/types";

function mapProperty(data: ListingDetailWithSimilar): PropertyDetail {
  const categoryMap: Record<string, PropertyDetail["type"]> = {
    for_rent: "For Rent",
    for_sale: "For Sale",
    shared_housing: "Shared Housing",
  };

  return {
    id: data.id,
    ownerId: data.owner_id,
    title: data.title,
    location: data.location,
    fullAddress: data.full_address ?? data.location,
    price: data.price,
    rating: 4.5,
    reviewCount: 0,
    verified: data.verified,
    isNew: data.is_new,
    available: data.status === "active",
    images: data.images.length
      ? data.images
      : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"],
    type: categoryMap[data.category] ?? "For Rent",
    size: data.size_sqm ? `${data.size_sqm} m²` : "N/A",
    bedrooms: data.bedrooms != null ? `${data.bedrooms} Beds` : "N/A",
    bathrooms: data.bathrooms != null ? `${data.bathrooms} Baths` : "N/A",
    description: data.description ? [data.description] : [],
    amenities: (data.amenities ?? []).map((a) => ({ icon: "CheckCircle", label: a })),
    similarProperties: (data.similar_listings ?? []).slice(0, 3).map((s) => ({
      id: s.id,
      title: s.title,
      location: s.location,
      price: s.price,
      image: s.images[0] ?? "",
    })),
    category: data.category,
    totalSpots: data.total_spots ?? undefined,
    filledSpots: data.filled_spots ?? undefined,
    availability: data.availability ?? undefined,
    availableDate: data.available_date ?? undefined,
    furnishing: data.furnishing ?? undefined,
    utilitiesIncluded: data.utilities_included,
    bathroomType: data.bathroom_type ?? undefined,
    privateAmenities: (data.private_amenities ?? []).map((a) => ({ icon: "CheckCircle", label: a })),
    sharedAmenities: (data.shared_amenities ?? []).map((a) => ({ icon: "CheckCircle", label: a })),
    housemates: (data.housemates ?? []).map((h) => ({
      name: h.name,
      age: h.age ?? 0,
      occupation: h.occupation ?? "Professional",
      avatar: h.avatar_url ?? "",
      tags: h.tags,
    })),
    contactPhone: data.contact_phone ?? null,
    contactName: data.contact_name ?? null,
  };
}

function mapSharedHousing(property: PropertyDetail): SharedHousingDetail {
  const toAmenity = (a: SharedAmenity) => a;
  return {
    id: property.id,
    ownerId: property.ownerId,
    title: property.title,
    location: property.location,
    image: property.images[0] ?? "",
    images: property.images,
    verified: property.verified,
    price: property.price,
    utilitiesIncluded: property.utilitiesIncluded ?? false,
    availableDate: property.availableDate ?? "Available Now",
    availability: property.availability ?? "available",
    occupancy: `${property.filledSpots ?? 0}/${property.totalSpots ?? 0}`,
    bathroom: property.bathroomType ?? "Private",
    furnishing: property.furnishing ?? "Furnished",
    description: property.description,
    housemates: property.housemates ?? [],
    privateAmenities: (property.privateAmenities ?? []).map(toAmenity),
    sharedAmenities: (property.sharedAmenities ?? []).map(toAmenity),
    similarRooms: [],
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await getListing(id);
  if (!data) notFound();

  const property = mapProperty(data);

  // Shared housing layout
  if (property.category === "shared_housing") {
    const housing = mapSharedHousing(property);
    return (
      <div className="max-w-[1600px] mx-auto pb-28 md:pb-20">
        <SharedHousingHero housing={housing} />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-[70%] space-y-12">
              <SharedHousingStats housing={housing} />
              <AboutHouse descriptions={housing.description} />
              <HousematesSection housemates={housing.housemates} />
              <SharedAmenities
                privateAmenities={housing.privateAmenities}
                sharedAmenities={housing.sharedAmenities}
              />
            </div>
            <div className="lg:w-[30%]">
              <SharedHousingSidebar
                housing={housing}
                contactPhone={property.contactPhone}
                contactName={property.contactName}
              />
            </div>
          </div>
        </div>
        <MobilePropertyCTA
          price={property.price}
          category={property.category}
          listingId={property.id}
          contactPhone={property.contactPhone}
          contactName={property.contactName}
        />
      </div>
    );
  }

  // Regular property layout
  return (
    <main className="max-w-[1600px] mx-auto pb-28 md:pb-20">
      <PropertyHero property={property} />
      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-12">
          <PropertyInfo property={property} />
          <PropertySidebar property={property} />
        </div>
      </div>
      <MobilePropertyCTA
        price={property.price}
        category={property.category}
        listingId={property.id}
        contactPhone={property.contactPhone}
        contactName={property.contactName}
      />
    </main>
  );
}
