import { supabase } from "@/integrations/supabase/client";
import type { Business, WebsiteAnalysis, GeneratedPitch, AnalysisIssue } from "@/types/campaign";

export interface SearchBusinessesResult {
  businesses: Business[];
  total: number;
}

export interface AnalyzeWebsiteResult {
  issues: AnalysisIssue[];
  overallScore: number;
  email: string | null;
  analyzed: boolean;
  analyzedAt: string;
}

export interface GeneratePitchResult {
  subject: string;
  body: string;
  edited: boolean;
  approved: boolean;
}

export interface SendEmailResult {
  success: boolean;
  emailId: string;
  resendId?: string;
}

export const campaignApi = {
  /**
   * Search businesses across one or more locations and return a single
   * deduplicated list (by placeId, falling back to name|domain).
   */
  async searchBusinesses(
    businessType: string,
    locationOrLocations: string | string[],
  ): Promise<SearchBusinessesResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Please log in to search for businesses");
    }

    const locations = Array.isArray(locationOrLocations)
      ? locationOrLocations.filter((l) => l.trim())
      : [locationOrLocations].filter((l) => l.trim());

    if (locations.length === 0) {
      throw new Error("At least one location is required");
    }

    // Per-location limit shrinks slightly as we add locations so total
    // result set stays manageable; minimum 12 per location.
    const perLocationLimit = Math.max(12, Math.floor(30 / locations.length));

    const settled = await Promise.allSettled(
      locations.map((location) =>
        supabase.functions.invoke<SearchBusinessesResult>("search-businesses", {
          body: { businessType, location, limit: perLocationLimit },
        }),
      ),
    );

    const merged: Business[] = [];
    const seen = new Set<string>();
    let firstError: string | null = null;

    settled.forEach((res, idx) => {
      if (res.status === "rejected") {
        if (!firstError) firstError = res.reason?.message || "Search failed";
        console.warn(`[search] location "${locations[idx]}" failed:`, res.reason);
        return;
      }
      const { data, error } = res.value;
      if (error) {
        if (!firstError) firstError = error.message;
        if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
          throw new Error("Session expired. Please log in again.");
        }
        return;
      }
      if (!data?.businesses) return;
      for (const biz of data.businesses) {
        const key =
          biz.placeId ||
          `${biz.name?.toLowerCase().trim()}|${biz.website?.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(biz);
      }
    });

    if (merged.length === 0 && firstError) {
      throw new Error(firstError);
    }

    return { businesses: merged, total: merged.length };
  },

  async analyzeWebsite(
    url: string,
    businessName: string,
    options?: {
      socialOnly?: boolean;
      socialHandles?: { linkedin?: string; instagram?: string; facebook?: string; tiktok?: string; twitter?: string };
      expertise?: string;
      cta?: string;
      deep?: boolean;
      detectedSignals?: Record<string, boolean>;
      evidence?: Record<string, string>;
    }
  ): Promise<AnalyzeWebsiteResult> {
    const { data, error } = await supabase.functions.invoke<AnalyzeWebsiteResult>("analyze-website", {
      body: {
        url: url || undefined,
        businessName,
        socialOnly: options?.socialOnly,
        socialHandles: options?.socialHandles,
        expertise: options?.expertise,
        cta: options?.cta,
        deep: options?.deep,
        detectedSignals: options?.detectedSignals,
        evidence: options?.evidence,
      },
    });

    if (error) {
      console.error("Analyze website error:", error);
      throw new Error(error.message || "Failed to analyze website");
    }

    if (!data) {
      throw new Error("No data returned from analysis");
    }

    return data;
  },

  async generatePitch(
    businessName: string,
    website: string,
    issues: AnalysisIssue[],
    freelancerService?: string,
    expertise?: string,
    cta?: string
  ): Promise<GeneratePitchResult> {
    const { data, error } = await supabase.functions.invoke<GeneratePitchResult>("generate-pitch", {
      body: { businessName, website, issues, freelancerService, expertise, cta },
    });

    if (error) {
      console.error("Generate pitch error:", error);
      throw new Error(error.message || "Failed to generate pitch");
    }

    if (!data) {
      throw new Error("No data returned from pitch generation");
    }

    return data;
  },

  async generateInvestorPitch(
    investorName: string,
    investorData: {
      industry: string;
      businessName: string;
      businessDescription: string;
      fundingAmount: string;
      traction: string;
      useOfFunds: string;
    }
  ): Promise<GeneratePitchResult> {
    const { data, error } = await supabase.functions.invoke<GeneratePitchResult>("generate-pitch", {
      body: {
        businessName: investorName,
        website: "",
        issues: [],
        investorPitch: investorData,
      },
    });

    if (error) {
      console.error("Generate pitch error:", error);
      throw new Error(error.message || "Failed to generate pitch");
    }

    if (!data) {
      throw new Error("No data returned from pitch generation");
    }

    return data;
  },

  async sendEmail(params: {
    campaignId: string;
    businessId: string;
    pitchId: string;
    toEmail: string;
    subject: string;
    body: string;
    fromName?: string;
    fromEmail?: string;
  }): Promise<SendEmailResult> {
    const { data, error } = await supabase.functions.invoke<SendEmailResult>("send-email", {
      body: params,
    });

    if (error) {
      console.error("Send email error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    if (!data) {
      throw new Error("No data returned from email sending");
    }

    return data;
  },
};
