import { connection } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// The app serves a single business (see ROADMAP.md), so pages look it up
// rather than taking it from the URL. Cached per request: the layout and the
// page both need it.
export const getBusiness = cache(async () => {
  // Without this, pages that read nothing but the business (the service list)
  // are prerendered at build time and never show later edits.
  await connection();
  return prisma.business.findFirst({
    include: { services: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
});

/** An active service with its business, or null. */
export const findService = async (serviceId: string) => {
  const business = await getBusiness();
  const service = business?.services.find((candidate) => candidate.id === serviceId);
  return business && service ? { business, service } : null;
};
