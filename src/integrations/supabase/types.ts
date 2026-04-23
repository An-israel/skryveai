export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_email_replies: {
        Row: {
          admin_email_id: string
          created_at: string
          id: string
          logged_by: string
          received_at: string
          reply_content: string
        }
        Insert: {
          admin_email_id: string
          created_at?: string
          id?: string
          logged_by: string
          received_at?: string
          reply_content: string
        }
        Update: {
          admin_email_id?: string
          created_at?: string
          id?: string
          logged_by?: string
          received_at?: string
          reply_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_email_replies_admin_email_id_fkey"
            columns: ["admin_email_id"]
            isOneToOne: false
            referencedRelation: "admin_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_emails: {
        Row: {
          body: string
          created_at: string
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_by: string
          status: string
          subject: string
          template_type: string | null
          to_email: string
          to_user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_by: string
          status?: string
          subject: string
          template_type?: string | null
          to_email: string
          to_user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_by?: string
          status?: string
          subject?: string
          template_type?: string | null
          to_email?: string
          to_user_id?: string | null
        }
        Relationships: []
      }
      autopilot_activity: {
        Row: {
          business_location: string | null
          business_name: string | null
          clicked: boolean | null
          contact_email: string | null
          created_at: string | null
          email_body: string | null
          email_subject: string | null
          id: string
          opened: boolean | null
          replied: boolean | null
          session_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          business_location?: string | null
          business_name?: string | null
          clicked?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          opened?: boolean | null
          replied?: boolean | null
          session_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          business_location?: string | null
          business_name?: string | null
          clicked?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          opened?: boolean | null
          replied?: boolean | null
          session_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_activity_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "autopilot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_configs: {
        Row: {
          compliance: Json | null
          created_at: string | null
          daily_quota: Json | null
          email_style: Json | null
          expertise: Json | null
          id: string
          is_active: boolean | null
          locations: Json | null
          target_businesses: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          compliance?: Json | null
          created_at?: string | null
          daily_quota?: Json | null
          email_style?: Json | null
          expertise?: Json | null
          id?: string
          is_active?: boolean | null
          locations?: Json | null
          target_businesses?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          compliance?: Json | null
          created_at?: string | null
          daily_quota?: Json | null
          email_style?: Json | null
          expertise?: Json | null
          id?: string
          is_active?: boolean | null
          locations?: Json | null
          target_businesses?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      autopilot_sessions: {
        Row: {
          current_activity: string | null
          current_location: string | null
          date: string
          emails_failed: number | null
          emails_sent: number | null
          emails_skipped: number | null
          id: string
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_activity?: string | null
          current_location?: string | null
          date: string
          emails_failed?: number | null
          emails_sent?: number | null
          emails_skipped?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_activity?: string | null
          current_location?: string | null
          date?: string
          emails_failed?: number | null
          emails_sent?: number | null
          emails_skipped?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          cover_image: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured: boolean
          id: string
          keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          published: boolean
          published_at: string | null
          read_time: number
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author?: string
          category?: string
          content: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured?: boolean
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          read_time?: number
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author?: string
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured?: boolean
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          read_time?: number
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      business_email_enrichment: {
        Row: {
          attempted_at: string | null
          business_id: string
          campaign_id: string
          confidence: number | null
          created_at: string
          enriched_email: string | null
          id: string
          original_email: string | null
          sources: Json | null
          status: string
          updated_at: string
          user_id: string
          verification: Json | null
        }
        Insert: {
          attempted_at?: string | null
          business_id: string
          campaign_id: string
          confidence?: number | null
          created_at?: string
          enriched_email?: string | null
          id?: string
          original_email?: string | null
          sources?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          verification?: Json | null
        }
        Update: {
          attempted_at?: string | null
          business_id?: string
          campaign_id?: string
          confidence?: number | null
          created_at?: string
          enriched_email?: string | null
          id?: string
          original_email?: string | null
          sources?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          verification?: Json | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string
          campaign_id: string
          category: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          place_id: string | null
          rating: number | null
          review_count: number | null
          selected: boolean
          website: string | null
        }
        Insert: {
          address: string
          campaign_id: string
          category?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          review_count?: number | null
          selected?: boolean
          website?: string | null
        }
        Update: {
          address?: string
          campaign_id?: string
          category?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          review_count?: number | null
          selected?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_type: string
          campaign_type: string
          created_at: string
          emails_opened: number
          emails_sent: number
          id: string
          location: string
          name: string
          replies: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type: string
          campaign_type?: string
          created_at?: string
          emails_opened?: number
          emails_sent?: number
          id?: string
          location: string
          name: string
          replies?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string
          campaign_type?: string
          created_at?: string
          emails_opened?: number
          emails_sent?: number
          id?: string
          location?: string
          name?: string
          replies?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string
          unread_by_admin: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          unread_by_admin?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          unread_by_admin?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          message: string
          read_by_admin: boolean | null
          read_by_user: boolean | null
          sender_type: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          message: string
          read_by_admin?: boolean | null
          read_by_user?: boolean | null
          sender_type: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          message?: string
          read_by_admin?: boolean | null
          read_by_user?: boolean | null
          sender_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_images: {
        Row: {
          alt_text: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          context: Json | null
          credits_used: number | null
          id: string
          is_proactive: boolean
          message_text: string
          message_type: string
          sent_at: string
          sent_by: string
          user_id: string
          user_learning_id: string | null
          user_read: boolean
          user_replied: boolean
        }
        Insert: {
          context?: Json | null
          credits_used?: number | null
          id?: string
          is_proactive?: boolean
          message_text: string
          message_type?: string
          sent_at?: string
          sent_by?: string
          user_id: string
          user_learning_id?: string | null
          user_read?: boolean
          user_replied?: boolean
        }
        Update: {
          context?: Json | null
          credits_used?: number | null
          id?: string
          is_proactive?: boolean
          message_text?: string
          message_type?: string
          sent_at?: string
          sent_by?: string
          user_id?: string
          user_learning_id?: string | null
          user_read?: boolean
          user_replied?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_user_learning_id_fkey"
            columns: ["user_learning_id"]
            isOneToOne: false
            referencedRelation: "user_learning"
            referencedColumns: ["id"]
          },
        ]
      }
      contacted_businesses: {
        Row: {
          contacted_at: string | null
          domain: string
          id: string
          user_id: string
        }
        Insert: {
          contacted_at?: string | null
          domain: string
          id?: string
          user_id: string
        }
        Update: {
          contacted_at?: string | null
          domain?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_email_log: {
        Row: {
          created_at: string
          id: string
          sent_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sent_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sent_date?: string
          user_id?: string
        }
        Relationships: []
      }
      email_finder_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          found_count: number
          id: string
          input_rows: Json
          processed_rows: number
          progress: number
          results: Json
          status: string
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          found_count?: number
          id?: string
          input_rows?: Json
          processed_rows?: number
          progress?: number
          results?: Json
          status?: string
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          found_count?: number
          id?: string
          input_rows?: Json
          processed_rows?: number
          progress?: number
          results?: Json
          status?: string
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_finder_searches: {
        Row: {
          company: string | null
          confidence: number | null
          created_at: string
          domain: string | null
          first_name: string | null
          found_email: string | null
          id: string
          job_title: string | null
          last_name: string | null
          sources: Json | null
          status: string | null
          user_id: string
          verification: Json | null
        }
        Insert: {
          company?: string | null
          confidence?: number | null
          created_at?: string
          domain?: string | null
          first_name?: string | null
          found_email?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          sources?: Json | null
          status?: string | null
          user_id: string
          verification?: Json | null
        }
        Update: {
          company?: string | null
          confidence?: number | null
          created_at?: string
          domain?: string | null
          first_name?: string | null
          found_email?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          sources?: Json | null
          status?: string | null
          user_id?: string
          verification?: Json | null
        }
        Relationships: []
      }
      email_followups: {
        Row: {
          body: string
          business_id: string
          campaign_id: string
          created_at: string
          email_id: string
          followup_number: number
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          business_id: string
          campaign_id: string
          created_at?: string
          email_id: string
          followup_number: number
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          business_id?: string
          campaign_id?: string
          created_at?: string
          email_id?: string
          followup_number?: number
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_followups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_followups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_followups_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_patterns: {
        Row: {
          confidence: number
          created_at: string
          domain: string
          id: string
          pattern: string
          sample_count: number
          samples: Json
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          domain: string
          id?: string
          pattern: string
          sample_count?: number
          samples?: Json
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          domain?: string
          id?: string
          pattern?: string
          sample_count?: number
          samples?: Json
          updated_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          body: string
          business_id: string
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          pitch_id: string
          processed_at: string | null
          scheduled_for: string
          sender_email: string | null
          sender_name: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          business_id: string
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          pitch_id: string
          processed_at?: string | null
          scheduled_for?: string
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          business_id?: string
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          pitch_id?: string
          processed_at?: string | null
          scheduled_for?: string
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_replies: {
        Row: {
          created_at: string
          email_id: string
          from_email: string | null
          id: string
          received_at: string | null
          reply_content: string | null
          reply_to_address: string
        }
        Insert: {
          created_at?: string
          email_id: string
          from_email?: string | null
          id?: string
          received_at?: string | null
          reply_content?: string | null
          reply_to_address: string
        }
        Update: {
          created_at?: string
          email_id?: string
          from_email?: string | null
          id?: string
          received_at?: string | null
          reply_content?: string | null
          reply_to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_replies_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          business_id: string
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          opened_at: string | null
          pitch_id: string
          replied_at: string | null
          sent_at: string | null
          status: string
          to_email: string
        }
        Insert: {
          business_id: string
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          pitch_id: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          to_email: string
        }
        Update: {
          business_id?: string
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          pitch_id?: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          gmail_email: string
          id: string
          refresh_token: string
          token_expiry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          gmail_email: string
          id?: string
          refresh_token: string
          token_expiry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          gmail_email?: string
          id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string | null
          achievement_type: string
          badge_image_url: string | null
          earned_at: string
          id: string
          skill_name: string | null
          user_id: string
          user_learning_id: string | null
        }
        Insert: {
          achievement_description?: string | null
          achievement_name?: string | null
          achievement_type: string
          badge_image_url?: string | null
          earned_at?: string
          id?: string
          skill_name?: string | null
          user_id: string
          user_learning_id?: string | null
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string | null
          achievement_type?: string
          badge_image_url?: string | null
          earned_at?: string
          id?: string
          skill_name?: string | null
          user_id?: string
          user_learning_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_achievements_user_learning_id_fkey"
            columns: ["user_learning_id"]
            isOneToOne: false
            referencedRelation: "user_learning"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assignments: {
        Row: {
          created_at: string
          credits_cost: number | null
          description: string
          due_after_hours: number | null
          example_solution_url: string | null
          id: string
          instructions: string
          lesson_id: string
          max_revisions: number | null
          passing_criteria: string | null
          submission_type: string
          title: string
        }
        Insert: {
          created_at?: string
          credits_cost?: number | null
          description: string
          due_after_hours?: number | null
          example_solution_url?: string | null
          id?: string
          instructions: string
          lesson_id: string
          max_revisions?: number | null
          passing_criteria?: string | null
          submission_type?: string
          title: string
        }
        Update: {
          created_at?: string
          credits_cost?: number | null
          description?: string
          due_after_hours?: number | null
          example_solution_url?: string | null
          id?: string
          instructions?: string
          lesson_id?: string
          max_revisions?: number | null
          passing_criteria?: string | null
          submission_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learning_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_lessons: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          credits_cost: number | null
          description: string | null
          estimated_minutes: number | null
          has_assignment: boolean | null
          id: string
          learning_path_id: string
          lesson_number: number
          module_id: string
          order_index: number | null
          required_for_next: boolean | null
          title: string
        }
        Insert: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          credits_cost?: number | null
          description?: string | null
          estimated_minutes?: number | null
          has_assignment?: boolean | null
          id?: string
          learning_path_id: string
          lesson_number: number
          module_id: string
          order_index?: number | null
          required_for_next?: boolean | null
          title: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          credits_cost?: number | null
          description?: string | null
          estimated_minutes?: number | null
          has_assignment?: boolean | null
          id?: string
          learning_path_id?: string
          lesson_number?: number
          module_id?: string
          order_index?: number | null
          required_for_next?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_lessons_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_modules: {
        Row: {
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          learning_path_id: string
          module_number: number
          order_index: number | null
          title: string
          unlock_level: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          learning_path_id: string
          module_number: number
          order_index?: number | null
          title: string
          unlock_level?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          learning_path_id?: string
          module_number?: number
          order_index?: number | null
          title?: string
          unlock_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_modules_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          display_name: string
          estimated_weeks: number | null
          icon_url: string | null
          id: string
          is_active: boolean
          popular_rank: number | null
          short_description: string | null
          skill_name: string
          total_lessons: number
          total_modules: number
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          display_name: string
          estimated_weeks?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          popular_rank?: number | null
          short_description?: string | null
          skill_name: string
          total_lessons?: number
          total_modules?: number
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          display_name?: string
          estimated_weeks?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          popular_rank?: number | null
          short_description?: string | null
          skill_name?: string
          total_lessons?: number
          total_modules?: number
          updated_at?: string
        }
        Relationships: []
      }
      learning_submissions: {
        Row: {
          ai_feedback: string | null
          assignment_id: string
          created_at: string
          file_path: string | null
          id: string
          improvements: string[] | null
          passed_at: string | null
          reviewed_at: string | null
          revision_count: number
          score: number | null
          status: string
          strengths: string[] | null
          submission_data: string | null
          submission_url: string | null
          submitted_at: string
          user_id: string
          user_learning_id: string | null
        }
        Insert: {
          ai_feedback?: string | null
          assignment_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          improvements?: string[] | null
          passed_at?: string | null
          reviewed_at?: string | null
          revision_count?: number
          score?: number | null
          status?: string
          strengths?: string[] | null
          submission_data?: string | null
          submission_url?: string | null
          submitted_at?: string
          user_id: string
          user_learning_id?: string | null
        }
        Update: {
          ai_feedback?: string | null
          assignment_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          improvements?: string[] | null
          passed_at?: string | null
          reviewed_at?: string | null
          revision_count?: number
          score?: number | null
          status?: string
          strengths?: string[] | null
          submission_data?: string | null
          submission_url?: string | null
          submitted_at?: string
          user_id?: string
          user_learning_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "learning_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_submissions_user_learning_id_fkey"
            columns: ["user_learning_id"]
            isOneToOne: false
            referencedRelation: "user_learning"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paystack_reference: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          paystack_reference?: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paystack_reference?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          approved: boolean
          body: string
          business_id: string
          created_at: string
          edited: boolean
          id: string
          subject: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          body: string
          business_id: string
          created_at?: string
          edited?: boolean
          id?: string
          subject: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          body?: string
          business_id?: string
          created_at?: string
          edited?: boolean
          id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          confirmation_reminder_sent: boolean | null
          country: string | null
          created_at: string
          cv_url: string | null
          email: string
          expertise: string[] | null
          full_name: string
          id: string
          last_active_at: string | null
          phone: string | null
          portfolio_url: string | null
          referral_code: string | null
          referred_by: string | null
          signup_ip: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          confirmation_reminder_sent?: boolean | null
          country?: string | null
          created_at?: string
          cv_url?: string | null
          email: string
          expertise?: string[] | null
          full_name: string
          id?: string
          last_active_at?: string | null
          phone?: string | null
          portfolio_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          confirmation_reminder_sent?: boolean | null
          country?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string
          expertise?: string[] | null
          full_name?: string
          id?: string
          last_active_at?: string | null
          phone?: string | null
          portfolio_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_config: {
        Row: {
          created_at: string
          id: number
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: number
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string
          id?: number
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_amount: number | null
          commission_currency: string | null
          commission_rate: number
          completed_at: string | null
          created_at: string
          id: string
          paid_at: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission_amount?: number | null
          commission_currency?: string | null
          commission_rate?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission_amount?: number | null
          commission_currency?: string | null
          commission_rate?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      signup_ips: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          user_id?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          name: string
          route: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          name: string
          route: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          name?: string
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      smart_find_signals: {
        Row: {
          business_id: string
          campaign_id: string
          created_at: string
          evidence: Json | null
          id: string
          score: number
          screenshot_url: string | null
          service_definition: Json | null
          signals: Json | null
        }
        Insert: {
          business_id: string
          campaign_id: string
          created_at?: string
          evidence?: Json | null
          id?: string
          score?: number
          screenshot_url?: string | null
          service_definition?: Json | null
          signals?: Json | null
        }
        Update: {
          business_id?: string
          campaign_id?: string
          created_at?: string
          evidence?: Json | null
          id?: string
          score?: number
          screenshot_url?: string | null
          service_definition?: Json | null
          signals?: Json | null
        }
        Relationships: []
      }
      smtp_credentials: {
        Row: {
          app_password: string
          created_at: string
          email_address: string
          id: string
          imap_host: string
          imap_port: number
          is_verified: boolean
          last_verified_at: string | null
          provider_type: string
          smtp_host: string
          smtp_port: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_password: string
          created_at?: string
          email_address: string
          id?: string
          imap_host?: string
          imap_port?: number
          is_verified?: boolean
          last_verified_at?: string | null
          provider_type?: string
          smtp_host?: string
          smtp_port?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_password?: string
          created_at?: string
          email_address?: string
          id?: string
          imap_host?: string
          imap_port?: number
          is_verified?: boolean
          last_verified_at?: string | null
          provider_type?: string
          smtp_host?: string
          smtp_port?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_reports: {
        Row: {
          blockers: string | null
          created_at: string
          highlights: string | null
          id: string
          metrics: Json
          notes: string | null
          report_period: string
          report_type: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          highlights?: string | null
          id?: string
          metrics?: Json
          notes?: string | null
          report_period: string
          report_type?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blockers?: string | null
          created_at?: string
          highlights?: string | null
          id?: string
          metrics?: Json
          notes?: string | null
          report_period?: string
          report_type?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          campaign_limit: number | null
          created_at: string
          credits: number
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_daily_credit: string | null
          paystack_authorization_code: string | null
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          reminder_sent: boolean | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          campaign_limit?: number | null
          created_at?: string
          credits?: number
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_daily_credit?: string | null
          paystack_authorization_code?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          reminder_sent?: boolean | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          campaign_limit?: number | null
          created_at?: string
          credits?: number
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_daily_credit?: string | null
          paystack_authorization_code?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          reminder_sent?: boolean | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string
          joined_at: string | null
          role: string
          status: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_profiles: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          cv_url: string | null
          expertise: string[] | null
          id: string
          name: string
          portfolio_url: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          cv_url?: string | null
          expertise?: string[] | null
          id?: string
          name: string
          portfolio_url?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          cv_url?: string | null
          expertise?: string[] | null
          id?: string
          name?: string
          portfolio_url?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          credits: number
          id: string
          max_members: number
          max_profiles: number
          name: string
          owner_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          max_members?: number
          max_profiles?: number
          name: string
          owner_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          max_members?: number
          max_profiles?: number
          name?: string
          owner_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      tool_usage: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      trial_tracking: {
        Row: {
          created_at: string
          id: string
          signup_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          signup_order: number
        }
        Update: {
          created_at?: string
          id?: string
          signup_order?: number
        }
        Relationships: []
      }
      user_learning: {
        Row: {
          coach_tone: string
          completed_at: string | null
          completed_lesson_ids: string[] | null
          completed_lessons: number
          created_at: string
          current_lesson: number
          current_level: number
          current_module: number
          id: string
          is_active: boolean
          last_activity_date: string | null
          learning_pace: string | null
          learning_path_id: string
          pause_reason: string | null
          paused_at: string | null
          started_at: string
          streak_days: number
          target_completion_date: string | null
          total_lessons: number
          total_time_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_tone?: string
          completed_at?: string | null
          completed_lesson_ids?: string[] | null
          completed_lessons?: number
          created_at?: string
          current_lesson?: number
          current_level?: number
          current_module?: number
          id?: string
          is_active?: boolean
          last_activity_date?: string | null
          learning_pace?: string | null
          learning_path_id: string
          pause_reason?: string | null
          paused_at?: string | null
          started_at?: string
          streak_days?: number
          target_completion_date?: string | null
          total_lessons?: number
          total_time_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_tone?: string
          completed_at?: string | null
          completed_lesson_ids?: string[] | null
          completed_lessons?: number
          created_at?: string
          current_lesson?: number
          current_level?: number
          current_module?: number
          id?: string
          is_active?: boolean
          last_activity_date?: string | null
          learning_pace?: string | null
          learning_path_id?: string
          pause_reason?: string | null
          paused_at?: string | null
          started_at?: string
          streak_days?: number
          target_completion_date?: string | null
          total_lessons?: number
          total_time_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          calendly_url: string | null
          company_name: string | null
          created_at: string
          daily_send_limit: number | null
          delay_between_emails: number | null
          email_signature: string | null
          emails_sent_today: number | null
          id: string
          last_send_date: string | null
          sender_email: string | null
          sender_name: string | null
          service_description: string | null
          updated_at: string
          user_id: string
          warmup_daily_increase: number | null
          warmup_enabled: boolean | null
          warmup_start_volume: number | null
          warmup_started_at: string | null
        }
        Insert: {
          calendly_url?: string | null
          company_name?: string | null
          created_at?: string
          daily_send_limit?: number | null
          delay_between_emails?: number | null
          email_signature?: string | null
          emails_sent_today?: number | null
          id?: string
          last_send_date?: string | null
          sender_email?: string | null
          sender_name?: string | null
          service_description?: string | null
          updated_at?: string
          user_id: string
          warmup_daily_increase?: number | null
          warmup_enabled?: boolean | null
          warmup_start_volume?: number | null
          warmup_started_at?: string | null
        }
        Update: {
          calendly_url?: string | null
          company_name?: string | null
          created_at?: string
          daily_send_limit?: number | null
          delay_between_emails?: number | null
          email_signature?: string | null
          emails_sent_today?: number | null
          id?: string
          last_send_date?: string | null
          sender_email?: string | null
          sender_name?: string | null
          service_description?: string | null
          updated_at?: string
          user_id?: string
          warmup_daily_increase?: number | null
          warmup_enabled?: boolean | null
          warmup_start_volume?: number | null
          warmup_started_at?: string | null
        }
        Relationships: []
      }
      website_analyses: {
        Row: {
          analyzed: boolean
          analyzed_at: string | null
          business_id: string
          created_at: string
          id: string
          issues: Json
          overall_score: number
        }
        Insert: {
          analyzed?: boolean
          analyzed_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          issues?: Json
          overall_score?: number
        }
        Update: {
          analyzed?: boolean
          analyzed_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          issues?: Json
          overall_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "website_analyses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_email_log: {
        Row: {
          context: Json | null
          created_at: string
          email: string
          error_message: string | null
          full_name: string | null
          id: string
          resend_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          email: string
          error_message?: string | null
          full_name?: string | null
          id?: string
          resend_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          email?: string
          error_message?: string | null
          full_name?: string | null
          id?: string
          resend_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_daily_credits: { Args: never; Returns: undefined }
      award_learning_achievement: {
        Args: {
          _achievement_description: string
          _achievement_name: string
          _achievement_type: string
          _skill_name: string
          _user_id: string
          _user_learning_id: string
        }
        Returns: string
      }
      get_signup_order: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view_count: {
        Args: { post_slug: string }
        Returns: undefined
      }
      increment_campaign_emails_opened: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_emails_sent: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_replies: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      is_active_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "content_editor" | "support_agent" | "staff"
      subscription_plan: "monthly" | "yearly" | "lifetime"
      subscription_status: "trial" | "active" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "content_editor", "support_agent", "staff"],
      subscription_plan: ["monthly", "yearly", "lifetime"],
      subscription_status: ["trial", "active", "expired", "cancelled"],
    },
  },
} as const
