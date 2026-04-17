export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      common_code_groups: {
        Row: {
          group_code: string
          group_name: string
          is_system: boolean | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          group_code: string
          group_name: string
          is_system?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          group_code?: string
          group_name?: string
          is_system?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      common_codes: {
        Row: {
          group_code: string
          code_value: string
          code_name_ko: string
          code_name_en: string | null
          code_name_zh: string | null
          code_name_ja: string | null
          sort_order: number | null
          is_active: boolean | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          group_code: string
          code_value: string
          code_name_ko: string
          code_name_en?: string | null
          code_name_zh?: string | null
          code_name_ja?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          group_code?: string
          code_value?: string
          code_name_ko?: string
          code_name_en?: string | null
          code_name_zh?: string | null
          code_name_ja?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      grade_master: {
        Row: {
          grade_code: string
          grade_name_ko: string
          grade_name_en: string | null
          grade_name_zh: string | null
          grade_name_ja: string | null
          discount_rate: number | null
          benefit_desc: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          grade_code: string
          grade_name_ko: string
          grade_name_en?: string | null
          grade_name_zh?: string | null
          grade_name_ja?: string | null
          discount_rate?: number | null
          benefit_desc?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          grade_code?: string
          grade_name_ko?: string
          grade_name_en?: string | null
          grade_name_zh?: string | null
          grade_name_ja?: string | null
          discount_rate?: number | null
          benefit_desc?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      grade_promotion_request: {
        Row: {
          id: string
          user_id: string
          current_grade: string | null
          target_grade: string | null
          request_reason: string | null
          status: string | null
          admin_comment: string | null
          processed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          current_grade?: string | null
          target_grade?: string | null
          request_reason?: string | null
          status?: string | null
          admin_comment?: string | null
          processed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          current_grade?: string | null
          target_grade?: string | null
          request_reason?: string | null
          status?: string | null
          admin_comment?: string | null
          processed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      nations: {
        Row: {
          iso_alpha2: string
          iso_alpha3: string
          nation_name_ko: string
          nation_name_en: string | null
          nation_name_zh: string | null
          nation_name_ja: string | null
          phone_code: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          iso_alpha2: string
          iso_alpha3: string
          nation_name_ko: string
          nation_name_en?: string | null
          nation_name_zh?: string | null
          nation_name_ja?: string | null
          phone_code?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          iso_alpha2?: string
          iso_alpha3?: string
          nation_name_ko?: string
          nation_name_en?: string | null
          nation_name_zh?: string | null
          nation_name_ja?: string | null
          phone_code?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      order_status_master: {
        Row: {
          status_code: string
          status_name_ko: string
          status_name_en: string | null
          status_name_zh: string | null
          status_name_ja: string | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          status_code: string
          status_name_ko: string
          status_name_en?: string | null
          status_name_zh?: string | null
          status_name_ja?: string | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          status_code?: string
          status_name_ko?: string
          status_name_en?: string | null
          status_name_zh?: string | null
          status_name_ja?: string | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      organizations: {
        Row: {
          id: string
          parent_id: string | null
          org_code: string | null
          org_name_ko: string
          org_name_en: string | null
          org_name_zh: string | null
          org_name_ja: string | null
          org_type: string
          registration_no: string | null
          address: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          parent_id?: string | null
          org_code?: string | null
          org_name_ko: string
          org_name_en?: string | null
          org_name_zh?: string | null
          org_name_ja?: string | null
          org_type: string
          registration_no?: string | null
          address?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          parent_id?: string | null
          org_code?: string | null
          org_name_ko?: string
          org_name_en?: string | null
          org_name_zh?: string | null
          org_name_ja?: string | null
          org_type?: string
          registration_no?: string | null
          address?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      ports: {
        Row: {
          port_code: string
          nation_code: string | null
          port_name_ko: string
          port_name_en: string | null
          port_name_zh: string | null
          port_name_ja: string | null
          port_type: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          port_code: string
          nation_code?: string | null
          port_name_ko: string
          port_name_en?: string | null
          port_name_zh?: string | null
          port_name_ja?: string | null
          port_type: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          port_code?: string
          nation_code?: string | null
          port_name_ko?: string
          port_name_en?: string | null
          port_name_zh?: string | null
          port_name_ja?: string | null
          port_type?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string | null
          email: string | null
          full_name: string | null
          role: string | null
          grade_code: string | null
          is_approved: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          org_id?: string | null
          email?: string | null
          full_name?: string | null
          role?: string | null
          grade_code?: string | null
          is_approved?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string | null
          email?: string | null
          full_name?: string | null
          role?: string | null
          grade_code?: string | null
          is_approved?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      standard_code_mapping: {
        Row: {
          id: string
          category: string
          external_org: string
          external_code: string
          internal_code: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category: string
          external_org: string
          external_code: string
          internal_code: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category?: string
          external_org?: string
          external_code?: string
          internal_code?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
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
