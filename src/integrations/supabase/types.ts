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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
