import { supabase } from "@/integrations/supabase/client";
import type { ServiceDefinition, SmartScoredBusiness } from "@/types/smartFind";

export interface SmartFindResult {
  businesses: SmartScoredBusiness[];
  total: number;
  analyzedTotal: number;
  serviceDefinition: ServiceDefinition;
}

export const smartFindApi = {
  async findBusinesses(
    serviceDefinition: ServiceDefinition,
    location: string,
    campaignId?: string,
  ): Promise<SmartFindResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please log in to use Smart Find.");

    const { data, error } = await supabase.functions.invoke<SmartFindResult>("smart-find-businesses", {
      body: { serviceDefinition, location, campaignId, limit: 30 },
    });

    if (error) {
      console.error("Smart Find error:", error);
      throw new Error(error.message || "Smart Find failed");
    }
    if (!data) throw new Error("No data returned");
    return data;
  },
};
