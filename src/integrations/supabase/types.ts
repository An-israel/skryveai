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
      autopilot_activity: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          business_name: string | null
          business_location: string | null
          contact_email: string | null
          email_subject: string | null
          email_body: string | null
          status: string
          opened: boolean
          clicked: boolean
          replied: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          business_name?: string | null
          business_location?: string | null
          contact_email?: string | null
          email_subject?: string | null
          email_body?: string | null
          status?: string
          opened?: boolean
          clicked?: boolean
          replied?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          business_name?: string | null
          business_location?: string | null
          contact_email?: string | null
          email_subject?: string | null
          email_body?: string | null
          status?: string
          opened?: boolean
          clicked?: boolean
          replied?: boolean
          created_at?: string
        }
        Relationships: []
      }
      autopilot_configs: {
        Row: {
          id: string
          user_id: string
          is_active: boolean
          expertise: Json
          target_businesses: Json
          locations: Json
          daily_quota: Json
          email_style: Json
          compliance: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          is_active?: boolean
          expertise?: Json
          target_businesses?: Json
          locations?: Json
          daily_quota?: Json
          email_style?: Json
          compliance?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          is_active?: boolean
          expertise?: Json
          target_businesses?: Json
          locations?: Json
          daily_quota?: Json
          email_style?: Json
          compliance?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      autopilot_sessions: {
        Row: {
          id: string
          user_id: string
          date: string
          emails_sent: number
          emails_failed: number
          emails_skipped: number
          status: string
          current_location: string | null
          current_activity: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          emails_sent?: number
          emails_failed?: number
          emails_skipped?: number
          status?: string
          current_location?: string | null
          current_activity?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          emails_sent?: number
          emails_failed?: number
          emails_skipped?: number
          status?: string
          current_location?: string | null
          current_activity?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacted_businesses: {
        Row: {
          id: string
          user_id: string
          domain: string
          contacted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain: string
          contacted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain?: string
          contacted_at?: string
        }
        Relationships: []
      }
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_daily_credits: { Args: never; Returns: undefined }
      get_signup_order: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
