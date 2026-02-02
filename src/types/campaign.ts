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
  category: 'seo' | 'copywriting' | 'design' | 'social' | 'cta' | 'performance';
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

export type CampaignStep = 'search' | 'select' | 'analyze' | 'pitch' | 'send' | 'complete';
