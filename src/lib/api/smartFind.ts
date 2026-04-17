import { supabase } from "@/integrations/supabase/client";
import type { ServiceDefinition, SmartScoredBusiness } from "@/types/smartFind";

export interface SmartFindResult {
  businesses: SmartScoredBusiness[];
  total: number;
  analyzedTotal: number;
  serviceDefinition: ServiceDefinition;
}

export const smartFindApi = {
  /**
   * Smart Find across one or more locations. Each location is searched in
   * parallel; results are merged and deduplicated (by placeId, falling
   * back to name|domain). Highest needScore wins on duplicate hits.
   */
  async findBusinesses(
    serviceDefinition: ServiceDefinition,
    locationOrLocations: string | string[],
    campaignId?: string,
  ): Promise<SmartFindResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please log in to use Smart Find.");

    const locations = Array.isArray(locationOrLocations)
      ? locationOrLocations.filter((l) => l.trim())
      : [locationOrLocations].filter((l) => l.trim());

    if (locations.length === 0) {
      throw new Error("At least one location is required");
    }

    const perLocationLimit = Math.max(10, Math.floor(30 / locations.length));

    const settled = await Promise.allSettled(
      locations.map((location) =>
        supabase.functions.invoke<SmartFindResult>("smart-find-businesses", {
          body: { serviceDefinition, location, campaignId, limit: perLocationLimit },
        }),
      ),
    );

    const byKey = new Map<string, SmartScoredBusiness>();
    let analyzedTotal = 0;
    let firstError: string | null = null;

    settled.forEach((res, idx) => {
      if (res.status === "rejected") {
        if (!firstError) firstError = res.reason?.message || "Smart Find failed";
        console.warn(`[smart-find] "${locations[idx]}" failed:`, res.reason);
        return;
      }
      const { data, error } = res.value;
      if (error) {
        if (!firstError) firstError = error.message;
        return;
      }
      if (!data) return;
      analyzedTotal += data.analyzedTotal || 0;
      for (const biz of data.businesses || []) {
        const key =
          biz.placeId ||
          `${biz.name?.toLowerCase().trim()}|${biz.website?.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || ""}`;
        const existing = byKey.get(key);
        if (!existing || (biz.needScore ?? 0) > (existing.needScore ?? 0)) {
          byKey.set(key, biz);
        }
      }
    });

    const merged = Array.from(byKey.values()).sort(
      (a, b) => (b.needScore ?? 0) - (a.needScore ?? 0),
    );

    if (merged.length === 0 && firstError) {
      throw new Error(firstError);
    }

    return {
      businesses: merged,
      total: merged.length,
      analyzedTotal,
      serviceDefinition,
    };
  },
};
