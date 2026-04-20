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
      common_code_groups: {
        Row: {
          created_at: string | null
          description: string | null
          group_code: string
          group_name: string
          is_system: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_code: string
          group_name: string
          is_system?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_code?: string
          group_name?: string
          is_system?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      common_codes: {
        Row: {
          code_name_en: string | null
          code_name_ja: string | null
          code_name_ko: string
          code_name_zh: string | null
          code_value: string
          created_at: string | null
          description: string | null
          group_code: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code_name_en?: string | null
          code_name_ja?: string | null
          code_name_ko: string
          code_name_zh?: string | null
          code_value: string
          created_at?: string | null
          description?: string | null
          group_code: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code_name_en?: string | null
          code_name_ja?: string | null
          code_name_ko?: string
          code_name_zh?: string | null
          code_value?: string
          created_at?: string | null
          description?: string | null
          group_code?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "common_codes_group_code_fkey"
            columns: ["group_code"]
            isOneToOne: false
            referencedRelation: "common_code_groups"
            referencedColumns: ["group_code"]
          },
        ]
      }
      grade_master: {
        Row: {
          benefit_desc: string | null
          created_at: string | null
          discount_rate: number | null
          grade_code: string
          grade_name_en: string | null
          grade_name_ja: string | null
          grade_name_ko: string
          grade_name_zh: string | null
          updated_at: string | null
        }
        Insert: {
          benefit_desc?: string | null
          created_at?: string | null
          discount_rate?: number | null
          grade_code: string
          grade_name_en?: string | null
          grade_name_ja?: string | null
          grade_name_ko: string
          grade_name_zh?: string | null
          updated_at?: string | null
        }
        Update: {
          benefit_desc?: string | null
          created_at?: string | null
          discount_rate?: number | null
          grade_code?: string
          grade_name_en?: string | null
          grade_name_ja?: string | null
          grade_name_ko?: string
          grade_name_zh?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      grade_promotion_request: {
        Row: {
          admin_comment: string | null
          created_at: string | null
          current_grade: string | null
          id: string
          processed_at: string | null
          request_reason: string | null
          status: string | null
          target_grade: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string | null
          current_grade?: string | null
          id?: string
          processed_at?: string | null
          request_reason?: string | null
          status?: string | null
          target_grade?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string | null
          current_grade?: string | null
          id?: string
          processed_at?: string | null
          request_reason?: string | null
          status?: string | null
          target_grade?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_promotion_request_current_grade_fkey"
            columns: ["current_grade"]
            isOneToOne: false
            referencedRelation: "grade_master"
            referencedColumns: ["grade_code"]
          },
          {
            foreignKeyName: "grade_promotion_request_target_grade_fkey"
            columns: ["target_grade"]
            isOneToOne: false
            referencedRelation: "grade_master"
            referencedColumns: ["grade_code"]
          },
          {
            foreignKeyName: "grade_promotion_request_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nations: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          iso_alpha2: string
          iso_alpha3: string
          nation_name_en: string | null
          nation_name_ja: string | null
          nation_name_ko: string
          nation_name_zh: string | null
          phone_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          iso_alpha2: string
          iso_alpha3: string
          nation_name_en?: string | null
          nation_name_ja?: string | null
          nation_name_ko: string
          nation_name_zh?: string | null
          phone_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          iso_alpha2?: string
          iso_alpha3?: string
          nation_name_en?: string | null
          nation_name_ja?: string | null
          nation_name_ko?: string
          nation_name_zh?: string | null
          phone_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_status_master: {
        Row: {
          created_at: string | null
          description: string | null
          status_code: string
          status_name_en: string | null
          status_name_ja: string | null
          status_name_ko: string
          status_name_zh: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          status_code: string
          status_name_en?: string | null
          status_name_ja?: string | null
          status_name_ko: string
          status_name_zh?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          status_code?: string
          status_name_en?: string | null
          status_name_ja?: string | null
          status_name_ko?: string
          status_name_zh?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          org_code: string | null
          org_name_en: string | null
          org_name_ja: string | null
          org_name_ko: string
          org_name_zh: string | null
          org_type: string
          parent_id: string | null
          registration_no: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          org_code?: string | null
          org_name_en?: string | null
          org_name_ja?: string | null
          org_name_ko: string
          org_name_zh?: string | null
          org_type: string
          parent_id?: string | null
          registration_no?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          org_code?: string | null
          org_name_en?: string | null
          org_name_ja?: string | null
          org_name_ko?: string
          org_name_zh?: string | null
          org_type?: string
          parent_id?: string | null
          registration_no?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ports: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          nation_code: string | null
          port_code: string
          port_name_en: string | null
          port_name_ja: string | null
          port_name_ko: string
          port_name_zh: string | null
          port_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          nation_code?: string | null
          port_code: string
          port_name_en?: string | null
          port_name_ja?: string | null
          port_name_ko: string
          port_name_zh?: string | null
          port_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          nation_code?: string | null
          port_code?: string
          port_name_en?: string | null
          port_name_ja?: string | null
          port_name_ko?: string
          port_name_zh?: string | null
          port_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ports_nation_code_fkey"
            columns: ["nation_code"]
            isOneToOne: false
            referencedRelation: "nations"
            referencedColumns: ["iso_alpha2"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          grade_code: string | null
          id: string
          is_approved: boolean | null
          org_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          grade_code?: string | null
          id: string
          is_approved?: boolean | null
          org_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          grade_code?: string | null
          id?: string
          is_approved?: boolean | null
          org_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_grade_code_fkey"
            columns: ["grade_code"]
            isOneToOne: false
            referencedRelation: "grade_master"
            referencedColumns: ["grade_code"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_code_mapping: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          external_code: string
          external_org: string
          id: string
          internal_code: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          external_code: string
          external_org: string
          id?: string
          internal_code: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          external_code?: string
          external_org?: string
          id?: string
          internal_code?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      zen_contracts: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          end_date: string
          id: string
          shipper_id: string | null
          start_date: string
          status: string | null
          terms_metadata: Json | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          shipper_id?: string | null
          start_date: string
          status?: string | null
          terms_metadata?: Json | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          shipper_id?: string | null
          start_date?: string
          status?: string | null
          terms_metadata?: Json | null
        }
        Relationships: []
      }
      zen_orders: {
        Row: {
          cargo_details: Json
          created_at: string | null
          dest_port_id: string | null
          id: string
          order_no: string
          origin_port_id: string | null
          shipper_id: string | null
          status: string | null
        }
        Insert: {
          cargo_details: Json
          created_at?: string | null
          dest_port_id?: string | null
          id?: string
          order_no: string
          origin_port_id?: string | null
          shipper_id?: string | null
          status?: string | null
        }
        Update: {
          cargo_details?: Json
          created_at?: string | null
          dest_port_id?: string | null
          id?: string
          order_no?: string
          origin_port_id?: string | null
          shipper_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_orders_dest_port_id_fkey"
            columns: ["dest_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_orders_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_orders_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_organizations: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          parent_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_organizations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_ports: {
        Row: {
          code: string
          country_code: string
          created_at: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          code: string
          country_code: string
          created_at?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      zen_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          org_id: string | null
          role: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          org_id?: string | null
          role: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: string
          status?: string | null
        }
        Relationships: []
      }
      zen_rate_cards: {
        Row: {
          created_at: string | null
          currency: string | null
          dest_code: string
          id: string
          mode: string
          org_id: string | null
          origin_code: string
          unit_price: number
          unit_type: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          dest_code: string
          id?: string
          mode: string
          org_id?: string | null
          origin_code: string
          unit_price: number
          unit_type: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          dest_code?: string
          id?: string
          mode?: string
          org_id?: string | null
          origin_code?: string
          unit_price?: number
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_rate_cards_dest_code_fkey"
            columns: ["dest_code"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "zen_rate_cards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_rate_cards_origin_code_fkey"
            columns: ["origin_code"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["code"]
          },
        ]
      }
      zen_transport_schedules: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          destination_port_id: string | null
          eta: string | null
          etd: string | null
          id: string
          mode: string
          origin_port_id: string | null
          schedule_metadata: Json | null
          vessel_flight_no: string | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          destination_port_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          mode: string
          origin_port_id?: string | null
          schedule_metadata?: Json | null
          vessel_flight_no?: string | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          destination_port_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          mode?: string
          origin_port_id?: string | null
          schedule_metadata?: Json | null
          vessel_flight_no?: string | null
        }
        Relationships: []
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
