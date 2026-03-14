export interface Business {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  placeId?: string;
  email?: string;
  emailVerified?: boolean;
  selected?: boolean;
}

export interface WebsiteAnalysis {
  businessId: string;
  issues: AnalysisIssue[];
  overallScore: number;
  analyzed: boolean;
  analyzedAt?: string;
}

export interface AnalysisIssue {
  category: 'website_copy' | 'linkedin' | 'instagram' | 'facebook' | 'branding' | 'cta' | 'seo' | 'design' | 'social' | 'copywriting' | 'performance';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

export interface GeneratedPitch {
  businessId: string;
  subject: string;
  body: string;
  edited?: boolean;
  approved?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  businessType: string;
  location: string;
  status: 'draft' | 'searching' | 'analyzing' | 'pitching' | 'sending' | 'completed';
  createdAt: string;
  businesses: Business[];
  analyses: Record<string, WebsiteAnalysis>;
  pitches: Record<string, GeneratedPitch>;
  emailsSent: number;
  emailsOpened: number;
  replies: number;
}

export type EmailSource = 'job_page' | 'employer_site' | 'search_snippet' | 'none';
export type EmailConfidence = 'high' | 'medium' | 'low';

export interface JobListing {
  id: string;
  jobTitle: string;
  company: string;
  platform: string;
  url: string;
  description: string;
  fullContent?: string;
  location: string;
  postedDate: string;
  selected: boolean;
  email?: string;
  emailVerified?: boolean;
  emailSource?: EmailSource;
  emailConfidence?: EmailConfidence;
  employerDomain?: string;
}

export interface JobApplication {
  jobId: string;
  subject: string;
  body: string;
  keyMatchingSkills: string[];
  extractedEmail: string | null;
  edited: boolean;
  approved: boolean;
}

export type CampaignStep = 'search' | 'select' | 'analyze' | 'pitch' | 'send' | 'complete';
