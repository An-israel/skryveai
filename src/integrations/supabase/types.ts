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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
