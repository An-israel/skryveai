// ⚠️  THIS IS A TYPESCRIPT FILE — paste it into your Next.js project at:
//     types/database.ts
// Do NOT run it in the Supabase SQL editor.

export type UserRole = 'talent' | 'client' | 'admin'
export type JobStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted'
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'disputed'
export type MilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert'
export type ProjectType = 'fixed' | 'hourly'
export type NotificationType =
  | 'application_received'
  | 'application_status_changed'
  | 'offer_received'
  | 'offer_status_changed'
  | 'project_update'
  | 'milestone_update'
  | 'message_received'
  | 'payment_update'
  | 'review_received'
  | 'system'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  bio: string | null
  location: string | null
  timezone: string | null
  website: string | null
  is_verified: boolean
  is_active: boolean
  onboarded: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface Skill {
  id: string
  name: string
  slug: string
  category_id: string | null
  created_at: string
}

export interface TalentProfile {
  id: string
  user_id: string
  headline: string | null
  hourly_rate: number | null
  experience_level: ExperienceLevel | null
  availability: string | null
  years_of_experience: number | null
  languages: string[] | null
  response_time_hours: number | null
  total_earnings: number
  completed_projects: number
  avg_rating: number | null
  total_reviews: number
  profile_views: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface TalentSkill {
  id: string
  talent_id: string
  skill_id: string
  level: string | null
  created_at: string
}

export interface Portfolio {
  id: string
  talent_id: string
  title: string
  description: string | null
  cover_url: string | null
  project_url: string | null
  created_at: string
  updated_at: string
}

export interface PortfolioMedia {
  id: string
  portfolio_id: string
  url: string
  media_type: string
  caption: string | null
  sort_order: number
  created_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  company_name: string | null
  company_size: string | null
  industry: string | null
  company_website: string | null
  company_logo_url: string | null
  total_spent: number
  posted_jobs: number
  completed_projects: number
  avg_rating: number | null
  total_reviews: number
  payment_verified: boolean
  created_at: string
  updated_at: string
}

export interface JobPost {
  id: string
  client_id: string
  title: string
  description: string
  category_id: string | null
  project_type: ProjectType
  experience_level: ExperienceLevel | null
  budget_min: number | null
  budget_max: number | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  estimated_hours: number | null
  duration_weeks: number | null
  status: JobStatus
  applicant_count: number
  views: number
  is_featured: boolean
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface JobSkill {
  id: string
  job_id: string
  skill_id: string
  required: boolean
}

export interface SavedJob {
  id: string
  user_id: string
  job_id: string
  created_at: string
}

export interface Application {
  id: string
  job_id: string
  talent_id: string
  cover_letter: string | null
  proposed_rate: number | null
  estimated_weeks: number | null
  status: ApplicationStatus
  client_note: string | null
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  job_id: string | null
  application_id: string | null
  client_id: string
  talent_id: string
  title: string
  description: string | null
  project_type: ProjectType
  amount: number
  duration_weeks: number | null
  status: OfferStatus
  expires_at: string | null
  talent_message: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  offer_id: string | null
  job_id: string | null
  client_id: string
  talent_id: string
  title: string
  description: string | null
  project_type: ProjectType
  total_amount: number | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  project_id: string
  title: string
  description: string | null
  amount: number | null
  due_date: string | null
  status: MilestoneStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  project_id: string
  milestone_id: string | null
  client_id: string
  talent_id: string
  amount: number
  platform_fee: number
  net_amount: number
  status: PaymentStatus
  provider: string | null
  provider_ref: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  project_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface Conversation {
  id: string
  participant_one_id: string
  participant_two_id: string
  job_id: string | null
  project_id: string | null
  last_message_at: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  attachments: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface Cv {
  id: string
  talent_id: string
  title: string
  summary: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface CvSection {
  id: string
  cv_id: string
  type: string
  title: string
  content: Record<string, unknown>
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  creator_id: string
  title: string
  description: string | null
  cover_url: string | null
  category_id: string | null
  price: number
  is_published: boolean
  total_lessons: number
  enrolled_count: number
  avg_rating: number | null
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  content: string | null
  video_url: string | null
  duration_s: number | null
  sort_order: number
  is_free: boolean
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  course_id: string
  user_id: string
  progress: number
  completed_at: string | null
  created_at: string
}

// ── Supabase generic Database type ───────────────────────────
export type Database = {
  public: {
    Tables: {
      users:             { Row: User;            Insert: Partial<User> & Pick<User, 'id' | 'email'>; Update: Partial<User> }
      categories:        { Row: Category;        Insert: Omit<Category, 'id' | 'created_at'>;        Update: Partial<Category> }
      skills:            { Row: Skill;           Insert: Omit<Skill, 'id' | 'created_at'>;           Update: Partial<Skill> }
      talent_profiles:   { Row: TalentProfile;   Insert: Omit<TalentProfile, 'id' | 'created_at' | 'updated_at'>; Update: Partial<TalentProfile> }
      talent_skills:     { Row: TalentSkill;     Insert: Omit<TalentSkill, 'id' | 'created_at'>;     Update: Partial<TalentSkill> }
      portfolios:        { Row: Portfolio;       Insert: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Portfolio> }
      portfolio_media:   { Row: PortfolioMedia;  Insert: Omit<PortfolioMedia, 'id' | 'created_at'>;  Update: Partial<PortfolioMedia> }
      client_profiles:   { Row: ClientProfile;   Insert: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ClientProfile> }
      job_posts:         { Row: JobPost;         Insert: Omit<JobPost, 'id' | 'created_at' | 'updated_at'>; Update: Partial<JobPost> }
      job_skills:        { Row: JobSkill;        Insert: Omit<JobSkill, 'id'>;                        Update: Partial<JobSkill> }
      saved_jobs:        { Row: SavedJob;        Insert: Omit<SavedJob, 'id' | 'created_at'>;         Update: Partial<SavedJob> }
      applications:      { Row: Application;     Insert: Omit<Application, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Application> }
      offers:            { Row: Offer;           Insert: Omit<Offer, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Offer> }
      projects:          { Row: Project;         Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Project> }
      milestones:        { Row: Milestone;       Insert: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Milestone> }
      payments:          { Row: Payment;         Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Payment> }
      reviews:           { Row: Review;          Insert: Omit<Review, 'id' | 'created_at'>;           Update: Partial<Review> }
      conversations:     { Row: Conversation;    Insert: Omit<Conversation, 'id' | 'created_at'>;     Update: Partial<Conversation> }
      messages:          { Row: Message;         Insert: Omit<Message, 'id' | 'created_at'>;          Update: Partial<Message> }
      notifications:     { Row: Notification;    Insert: Omit<Notification, 'id' | 'created_at'>;     Update: Partial<Notification> }
      cvs:               { Row: Cv;              Insert: Omit<Cv, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Cv> }
      cv_sections:       { Row: CvSection;       Insert: Omit<CvSection, 'id' | 'created_at' | 'updated_at'>; Update: Partial<CvSection> }
      courses:           { Row: Course;          Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Course> }
      lessons:           { Row: Lesson;          Insert: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Lesson> }
      enrollments:       { Row: Enrollment;      Insert: Omit<Enrollment, 'id' | 'created_at'>;       Update: Partial<Enrollment> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role:          UserRole
      job_status:         JobStatus
      application_status: ApplicationStatus
      offer_status:       OfferStatus
      project_status:     ProjectStatus
      milestone_status:   MilestoneStatus
      payment_status:     PaymentStatus
      experience_level:   ExperienceLevel
      project_type:       ProjectType
      notification_type:  NotificationType
    }
  }
}

// ── Convenience joined types ──────────────────────────────────
export type TalentProfileWithUser    = TalentProfile & { users: User }
export type TalentProfileWithSkills  = TalentProfile & { talent_skills: (TalentSkill & { skills: Skill })[] }
export type JobPostWithClient        = JobPost        & { client_profiles: ClientProfile & { users: User } }
export type JobPostWithSkills        = JobPost        & { job_skills: (JobSkill & { skills: Skill })[] }
export type ApplicationWithTalent    = Application    & { talent_profiles: TalentProfileWithUser }
export type ProjectWithParties       = Project        & {
  client_profiles: ClientProfile & { users: User }
  talent_profiles: TalentProfile & { users: User }
}
export type ConversationWithMessages = Conversation   & { messages: Message[] }
export type MessageWithSender        = Message        & { users: User }
