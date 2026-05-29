// Skryve Marketplace — TypeScript types
// These extend the existing SkryveAI Supabase types (src/integrations/supabase/types.ts)
// Import these wherever you use the new marketplace tables.

// ── Enums ─────────────────────────────────────────────────────
export type SkryveUserRole        = 'talent' | 'client' | 'admin'
export type ExperienceLevel       = 'entry' | 'mid' | 'senior' | 'expert'
export type AvailabilityStatus    = 'available' | 'busy' | 'not_available'
export type JobType               = 'gig' | 'contract' | 'long_term'
export type BudgetType            = 'fixed' | 'hourly'
export type LocationType          = 'remote' | 'onsite' | 'hybrid'
export type JobStatus             = 'draft' | 'active' | 'paused' | 'closed'
export type ApplicationStatus     = 'pending' | 'viewed' | 'shortlisted' | 'interview' | 'hired' | 'rejected'
export type OfferStatus           = 'pending' | 'accepted' | 'declined' | 'countered' | 'expired'
export type ProjectStatus         = 'active' | 'completed' | 'disputed' | 'cancelled'
export type DeliverableStatus     = 'pending' | 'approved' | 'revision_requested'
export type EventFormat           = 'webinar' | 'workshop' | 'conference' | 'meetup' | 'hackathon'
export type EventPriceType        = 'free' | 'paid'
export type EventStatus           = 'draft' | 'published' | 'cancelled'
export type PaymentStatus         = 'pending' | 'paid' | 'failed' | 'refunded'
export type ContentType           = 'video' | 'text'
export type AggPlatform           = 'upwork' | 'linkedin' | 'indeed' | 'jobberman' | 'freelancer' | 'remoteok' | 'wellfound' | 'glassdoor' | 'toptal' | 'fiverr'
export type JobSource             = 'marketplace' | 'aggregated'

// ── Social Links & JSON shapes ─────────────────────────────────
export interface SocialLinks {
  linkedin?:  string
  github?:    string
  twitter?:   string
  website?:   string
  behance?:   string
  dribbble?:  string
  [key: string]: string | undefined
}

export interface PersonalInfo {
  full_name?:  string
  email?:      string
  phone?:      string
  location?:   string
  website?:    string
  linkedin?:   string
}

export interface CvExperience {
  company:    string
  title:      string
  start_date: string
  end_date?:  string
  current?:   boolean
  description?: string
}

export interface CvEducation {
  institution: string
  degree:      string
  field?:      string
  start_date:  string
  end_date?:   string
}

export interface Milestone {
  title:       string
  description?: string
  amount?:     number
  due_date?:   string
  completed?:  boolean
}

// ── Section 1: Users & Profiles ───────────────────────────────
export interface TalentProfile {
  id:                       string
  user_id:                  string
  full_name:                string | null
  location:                 string | null
  bio:                      string | null
  primary_skill:            string | null
  secondary_skills:         string[]
  experience_level:         ExperienceLevel | null
  hourly_rate:              number | null
  availability_status:      AvailabilityStatus
  languages:                string[]
  social_links:             SocialLinks
  profile_photo_url:        string | null
  is_verified:              boolean
  rating_avg:               number | null
  completed_projects_count: number
  total_reviews:            number
  profile_views:            number
  created_at:               string
  updated_at:               string
}

export interface ClientProfile {
  id:           string
  user_id:      string
  company_name: string | null
  industry:     string | null
  team_size:    string | null
  location:     string | null
  website:      string | null
  logo_url:     string | null
  is_verified:  boolean
  total_hires:  number
  rating_avg:   number | null
  total_reviews: number
  created_at:   string
  updated_at:   string
}

export interface PortfolioItem {
  id:             string
  talent_id:      string
  title:          string
  description:    string | null
  image_url:      string | null
  project_url:    string | null
  skill_category: string | null
  is_featured:    boolean
  created_at:     string
}

// ── Section 2: Jobs & Marketplace ────────────────────────────
export interface JobPost {
  id:              string
  client_id:       string
  title:           string
  description:     string
  skill_category:  string | null
  job_type:        JobType
  budget_type:     BudgetType
  budget_min:      number | null
  budget_max:      number | null
  duration:        string | null
  deadline:        string | null
  location_type:   LocationType
  required_skills: string[]
  status:          JobStatus
  applicant_count: number
  views:           number
  created_at:      string
  updated_at:      string
}

export interface Application {
  id:                 string
  job_id:             string
  talent_id:          string
  proposal_text:      string | null
  proposed_rate:      number | null
  estimated_timeline: string | null
  portfolio_samples:  string[]
  status:             ApplicationStatus
  created_at:         string
  updated_at:         string
}

export interface Offer {
  id:         string
  job_id:     string | null
  client_id:  string
  talent_id:  string
  scope:      string | null
  rate:       number | null
  timeline:   string | null
  milestones: Milestone[]
  terms:      string | null
  status:     OfferStatus
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id:           string
  offer_id:     string | null
  job_id:       string | null
  client_id:    string
  talent_id:    string
  status:       ProjectStatus
  started_at:   string | null
  completed_at: string | null
  created_at:   string
  updated_at:   string
}

export interface Deliverable {
  id:          string
  project_id:  string
  talent_id:   string
  file_url:    string | null
  note:        string | null
  status:      DeliverableStatus
  submitted_at: string
  reviewed_at: string | null
}

export interface Review {
  id:          string
  project_id:  string
  reviewer_id: string
  reviewee_id: string
  rating:      number
  review_text: string | null
  created_at:  string
}

// ── Section 3: Job Aggregator ─────────────────────────────────
export interface AggregatedJob {
  id:           string
  external_id:  string
  platform:     AggPlatform
  title:        string
  description:  string | null
  budget:       string | null
  job_type:     string | null
  location:     string | null
  posted_at:    string | null
  external_url: string
  skill_tags:   string[]
  is_active:    boolean
  scraped_at:   string
}

export interface JobPreferences {
  id:                  string
  talent_id:           string
  primary_skill:       string | null
  secondary_skills:    string[]
  experience_level:    ExperienceLevel | null
  budget_min:          number | null
  job_types:           string[]
  location_preference: LocationType | null
  preferred_platforms: string[]
  digest_enabled:      boolean
  created_at:          string
  updated_at:          string
}

export interface SavedJob {
  id:         string
  talent_id:  string
  job_id:     string | null
  agg_job_id: string | null
  source:     JobSource
  saved_at:   string
}

export interface ApplicationTracker {
  id:             string
  talent_id:      string
  job_title:      string
  platform:       string | null
  external_url:   string | null
  proposal_sent:  boolean
  status:         ApplicationStatus
  applied_at:     string
  follow_up_date: string | null
  notes:          string | null
  created_at:     string
  updated_at:     string
}

// ── Section 4: Events ─────────────────────────────────────────
export interface SkryveEvent {
  id:               string
  organizer_id:     string
  title:            string
  description:      string | null
  banner_url:       string | null
  format:           EventFormat
  niche_category:   string | null
  date_time:        string
  timezone:         string
  duration_minutes: number | null
  platform_name:    string | null
  event_link:       string | null
  location_address: string | null
  price_type:       EventPriceType
  ticket_price:     number | null
  max_attendees:    number | null
  attendee_count:   number
  status:           EventStatus
  created_at:       string
  updated_at:       string
}

export interface EventRsvp {
  id:             string
  event_id:       string
  user_id:        string
  payment_status: PaymentStatus
  registered_at:  string
}

// ── Section 5: Learning ───────────────────────────────────────
export interface Course {
  id:             string
  title:          string
  description:    string | null
  skill_category: string | null
  level:          ExperienceLevel | null
  duration_hours: number | null
  lesson_count:   number
  price:          number
  thumbnail_url:  string | null
  is_published:   boolean
  enrolled_count: number
  avg_rating:     number | null
  created_at:     string
  updated_at:     string
}

export interface CourseLesson {
  id:               string
  course_id:        string
  module_name:      string | null
  title:            string
  content_type:     ContentType
  content_url:      string | null
  duration_minutes: number | null
  order_index:      number
  is_free_preview:  boolean
  created_at:       string
}

export interface Enrollment {
  id:               string
  course_id:        string
  talent_id:        string
  payment_status:   PaymentStatus
  progress_percent: number
  completed_at:     string | null
  created_at:       string
}

export interface LessonProgress {
  id:            string
  enrollment_id: string
  lesson_id:     string
  is_completed:  boolean
  completed_at:  string | null
}

export interface Certificate {
  id:              string
  course_id:       string
  talent_id:       string
  issued_at:       string
  certificate_url: string | null
}

// ── Section 6: CV Builder ─────────────────────────────────────
export interface SkryveCv {
  id:                 string
  talent_id:          string
  title:              string
  template_name:      string
  personal_info:      PersonalInfo
  summary:            string | null
  experiences:        CvExperience[]
  education:          CvEducation[]
  skills:             string[]
  certifications:     string[]
  projects:           { title: string; description?: string; url?: string }[]
  last_downloaded_at: string | null
  created_at:         string
  updated_at:         string
}

// ── Section 7: Messaging ──────────────────────────────────────
export interface MarketplaceConversation {
  id:              string
  talent_id:       string
  client_id:       string
  job_id:          string | null
  last_message_at: string | null
  created_at:      string
}

export interface MarketplaceMessage {
  id:              string
  conversation_id: string
  sender_id:       string
  content:         string
  attachment_url:  string | null
  is_read:         boolean
  sent_at:         string
}

// ── Joined / enriched types ───────────────────────────────────
export type TalentProfileWithPortfolio = TalentProfile & {
  portfolio_items: PortfolioItem[]
}

export type JobPostWithClient = JobPost & {
  client_profiles: ClientProfile
}

export type ApplicationWithTalent = Application & {
  talent_profiles: TalentProfile
}

export type ProjectWithParties = Project & {
  client_profiles: ClientProfile
  talent_profiles: TalentProfile
}

export type ConversationWithMessages = MarketplaceConversation & {
  marketplace_messages: MarketplaceMessage[]
}

export type SkryveEventWithRsvp = SkryveEvent & {
  my_rsvp?: EventRsvp | null
}

export type EnrollmentWithCourse = Enrollment & {
  courses: Course
}

export type EnrollmentWithProgress = Enrollment & {
  lesson_progress: LessonProgress[]
  courses: Course & { course_lessons: CourseLesson[] }
}
