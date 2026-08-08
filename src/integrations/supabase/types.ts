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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          cities: string[]
          countries: string[]
          created_at: string
          is_super_admin: boolean
          modules: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          cities?: string[]
          countries?: string[]
          created_at?: string
          is_super_admin?: boolean
          modules?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          cities?: string[]
          countries?: string[]
          created_at?: string
          is_super_admin?: boolean
          modules?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          ambassador_fee_amount: number
          ambassador_fee_currency: string
          auto_status_enabled: boolean
          created_at: string
          dues_period_months: number
          grace_period_days: number
          id: boolean
          last_status_run_at: string | null
          reminder_days_before: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ambassador_fee_amount?: number
          ambassador_fee_currency?: string
          auto_status_enabled?: boolean
          created_at?: string
          dues_period_months?: number
          grace_period_days?: number
          id?: boolean
          last_status_run_at?: string | null
          reminder_days_before?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ambassador_fee_amount?: number
          ambassador_fee_currency?: string
          auto_status_enabled?: boolean
          created_at?: string
          dues_period_months?: number
          grace_period_days?: number
          id?: boolean
          last_status_run_at?: string | null
          reminder_days_before?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      benefit_usage: {
        Row: {
          benefit_id: string
          feedback: string | null
          id: string
          note: string | null
          rating: number | null
          used_at: string
          user_id: string
        }
        Insert: {
          benefit_id: string
          feedback?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          used_at?: string
          user_id: string
        }
        Update: {
          benefit_id?: string
          feedback?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_usage_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          access_conditions: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          link_url: string | null
          position: number
          status: string
          target_categories: string[]
          target_cities: string[]
          target_countries: string[]
          target_membership_types: string[]
          target_statuses: string[]
          title: string
          updated_at: string
        }
        Insert: {
          access_conditions?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          link_url?: string | null
          position?: number
          status?: string
          target_categories?: string[]
          target_cities?: string[]
          target_countries?: string[]
          target_membership_types?: string[]
          target_statuses?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          access_conditions?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          link_url?: string | null
          position?: number
          status?: string
          target_categories?: string[]
          target_cities?: string[]
          target_countries?: string[]
          target_membership_types?: string[]
          target_statuses?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          formation_id: string
          formation_title: string | null
          holder_name: string | null
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          code: string
          formation_id: string
          formation_title?: string | null
          holder_name?: string | null
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          code?: string
          formation_id?: string
          formation_title?: string | null
          holder_name?: string | null
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string | null
          role: string
          subscribed: boolean
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          role?: string
          subscribed?: boolean
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          role?: string
          subscribed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          last_message_at: string
          status: string
          subject: string | null
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          last_message_at?: string
          status?: string
          subject?: string | null
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payment_status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payment_status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payment_status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_resources: {
        Row: {
          category: string
          created_at: string
          event_id: string
          id: string
          kind: string
          mime_type: string | null
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          event_id: string
          id?: string
          kind?: string
          mime_type?: string | null
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          event_id?: string
          id?: string
          kind?: string
          mime_type?: string | null
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_resources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string
          currency: string
          description: string | null
          event_date: string
          id: string
          location: string | null
          price: number
          status: string
          target_categories: string[]
          target_cities: string[]
          target_countries: string[]
          target_membership_types: string[]
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          price?: number
          status?: string
          target_categories?: string[]
          target_cities?: string[]
          target_countries?: string[]
          target_membership_types?: string[]
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          price?: number
          status?: string
          target_categories?: string[]
          target_cities?: string[]
          target_countries?: string[]
          target_membership_types?: string[]
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      formation_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          formation_id: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          formation_id: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          formation_id?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_enrollments_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_module_progress: {
        Row: {
          completed: boolean
          completed_at: string
          formation_id: string
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string
          formation_id: string
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string
          formation_id?: string
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_module_progress_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "formation_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_modules: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          formation_id: string
          id: string
          position: number
          resource_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          formation_id: string
          id?: string
          position?: number
          resource_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          formation_id?: string
          id?: string
          position?: number
          resource_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          instructor: string | null
          prerequisites: string | null
          resource_url: string | null
          schedule: string | null
          starts_on: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor?: string | null
          prerequisites?: string | null
          resource_url?: string | null
          schedule?: string | null
          starts_on?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor?: string | null
          prerequisites?: string | null
          resource_url?: string | null
          schedule?: string | null
          starts_on?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_session_registrations: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          reminder_opt_in: boolean
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          reminder_opt_in?: boolean
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          reminder_opt_in?: boolean
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_resources: {
        Row: {
          created_at: string
          id: string
          kind: string
          mime_type: string | null
          session_id: string
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          session_id: string
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          session_id?: string
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_session_resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          host: string | null
          id: string
          meeting_url: string | null
          notes_url: string | null
          recording_url: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          host?: string | null
          id?: string
          meeting_url?: string | null
          notes_url?: string | null
          recording_url?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          host?: string | null
          id?: string
          meeting_url?: string | null
          notes_url?: string | null
          recording_url?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_status_history: {
        Row: {
          automatic: boolean
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          profile_id: string
          reason: string | null
        }
        Insert: {
          automatic?: boolean
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          profile_id: string
          reason?: string | null
        }
        Update: {
          automatic?: boolean
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          profile_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          on_behalf_of_presidency: boolean
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          on_behalf_of_presidency?: boolean
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          on_behalf_of_presidency?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      presidency_history: {
        Row: {
          assigned_by: string | null
          created_at: string
          ended_at: string | null
          id: string
          note: string | null
          revoked_by: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          revoked_by?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          revoked_by?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      presidency_team: {
        Row: {
          added_by: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_place: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          membership_type: string
          phone: string | null
          sex: string | null
          status: string
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          membership_type?: string
          phone?: string | null
          sex?: string | null
          status?: string
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          membership_type?: string
          phone?: string | null
          sex?: string | null
          status?: string
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          method: string | null
          occurred_at: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          occurred_at?: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          occurred_at?: string
          reason?: string
          status?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_certificate: {
        Args: { _code: string }
        Returns: {
          code: string
          formation_title: string
          holder_name: string
          issued_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "membre"
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
      app_role: ["admin", "membre"],
    },
  },
} as const
