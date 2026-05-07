export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      customs_adapters: {
        Row: {
          adapter_code: string
          adapter_name: string
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          adapter_code: string
          adapter_name: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          adapter_code?: string
          adapter_name?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customs_declarations: {
        Row: {
          adapter_type: string
          admin_note: string | null
          cargo_description: string | null
          created_at: string | null
          currency_code: string | null
          declaration_no: string | null
          declared_value: number | null
          id: string
          order_id: string
          resolved_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          adapter_type?: string
          admin_note?: string | null
          cargo_description?: string | null
          created_at?: string | null
          currency_code?: string | null
          declaration_no?: string | null
          declared_value?: number | null
          id?: string
          order_id: string
          resolved_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          adapter_type?: string
          admin_note?: string | null
          cargo_description?: string | null
          created_at?: string | null
          currency_code?: string | null
          declaration_no?: string | null
          declared_value?: number | null
          id?: string
          order_id?: string
          resolved_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_declarations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
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
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          next_status: string
          order_id: string
          prev_status: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          next_status: string
          order_id: string
          prev_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          next_status?: string
          order_id?: string
          prev_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
        ]
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
          approval_comment: string | null
          approval_date: string | null
          biz_no: string | null
          corporate_id: string | null
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
          rejection_reason: string | null
          rep_name: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          approval_comment?: string | null
          approval_date?: string | null
          biz_no?: string | null
          corporate_id?: string | null
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
          rejection_reason?: string | null
          rep_name?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          approval_comment?: string | null
          approval_date?: string | null
          biz_no?: string | null
          corporate_id?: string | null
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
          rejection_reason?: string | null
          rep_name?: string | null
          status?: string | null
          type?: string | null
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
          preferred_language: string | null
          role: string | null
          status: string | null
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
          preferred_language?: string | null
          role?: string | null
          status?: string | null
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
          preferred_language?: string | null
          role?: string | null
          status?: string | null
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
      rate_card_logs: {
        Row: {
          action: string | null
          change_reason: string | null
          created_at: string | null
          created_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          rate_card_id: string | null
        }
        Insert: {
          action?: string | null
          change_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          rate_card_id?: string | null
        }
        Update: {
          action?: string | null
          change_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          rate_card_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_card_logs_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          base_date_rule: string | null
          base_rate: number | null
          carrier_id: string
          created_at: string | null
          currency: string | null
          customer_id: string | null
          destination_port: string
          id: string
          is_active: boolean | null
          origin_port: string
          parent_version_id: string | null
          priority: number | null
          service_type: string
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          version_no: number | null
        }
        Insert: {
          base_date_rule?: string | null
          base_rate?: number | null
          carrier_id: string
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          destination_port: string
          id?: string
          is_active?: boolean | null
          origin_port: string
          parent_version_id?: string | null
          priority?: number | null
          service_type: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          version_no?: number | null
        }
        Update: {
          base_date_rule?: string | null
          base_rate?: number | null
          carrier_id?: string
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          destination_port?: string
          id?: string
          is_active?: boolean | null
          origin_port?: string
          parent_version_id?: string | null
          priority?: number | null
          service_type?: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          version_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_destination_port_fkey"
            columns: ["destination_port"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["port_code"]
          },
          {
            foreignKeyName: "rate_cards_origin_port_fkey"
            columns: ["origin_port"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["port_code"]
          },
          {
            foreignKeyName: "rate_cards_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_slabs: {
        Row: {
          created_at: string | null
          id: string
          rate_card_id: string
          unit_price: number
          weight_min: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          rate_card_id: string
          unit_price: number
          weight_min: number
        }
        Update: {
          created_at?: string | null
          id?: string
          rate_card_id?: string
          unit_price?: number
          weight_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_slabs_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
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
      system_settings: {
        Row: {
          category: string
          description: string | null
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string
          description?: string | null
          key: string
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      zen_claims: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          order_id: string
          org_id: string
          reason_code: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          order_id: string
          org_id: string
          reason_code: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          order_id?: string
          org_id?: string
          reason_code?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "zen_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
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
      zen_error_logs: {
        Row: {
          created_at: string
          error_type: string
          id: string
          message: string
          org_id: string | null
          resolved: boolean
          sentry_id: string | null
          severity: string
          stack: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_type: string
          id?: string
          message: string
          org_id?: string | null
          resolved?: boolean
          sentry_id?: string | null
          severity?: string
          stack?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          message?: string
          org_id?: string | null
          resolved?: boolean
          sentry_id?: string | null
          severity?: string
          stack?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_error_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_faq: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          order_no: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          order_no?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          order_no?: number
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_faq_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_feature_flags: {
        Row: {
          description: string
          id: string
          is_enabled: boolean
          key: string
          org_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description: string
          id?: string
          is_enabled?: boolean
          key: string
          org_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string
          id?: string
          is_enabled?: boolean
          key?: string
          org_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_incident_fees: {
        Row: {
          claim_id: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          fee_amount: number
          id: string
          invoice_id: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          fee_amount: number
          id?: string
          invoice_id?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          fee_amount?: number
          id?: string
          invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_incident_fees_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "zen_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_incident_fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "zen_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_incident_fees_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "zen_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_inventory: {
        Row: {
          available_qty: number | null
          created_at: string | null
          id: string
          item_name: string
          min_stock_level: number | null
          on_hand_qty: number
          org_id: string
          reserved_qty: number
          sku_code: string
          updated_at: string | null
          warehouse_location: string | null
        }
        Insert: {
          available_qty?: number | null
          created_at?: string | null
          id?: string
          item_name: string
          min_stock_level?: number | null
          on_hand_qty?: number
          org_id: string
          reserved_qty?: number
          sku_code: string
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Update: {
          available_qty?: number | null
          created_at?: string | null
          id?: string
          item_name?: string
          min_stock_level?: number | null
          on_hand_qty?: number
          org_id?: string
          reserved_qty?: number
          sku_code?: string
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_inventory_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_inventory_history: {
        Row: {
          change_qty: number
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          org_id: string
          reference_id: string | null
          remarks: string | null
          result_qty: number
          transaction_type: string
        }
        Insert: {
          change_qty: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          org_id: string
          reference_id?: string | null
          remarks?: string | null
          result_qty: number
          transaction_type: string
        }
        Update: {
          change_qty?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          org_id?: string
          reference_id?: string | null
          remarks?: string | null
          result_qty?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_inventory_history_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "zen_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_inventory_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_invoice_pdf_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_path: string
          id: string
          invoice_id: string
          metadata: Json | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_path: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_path?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_invoice_pdf_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "zen_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_invoices: {
        Row: {
          applied_exchange_rate: number | null
          created_at: string | null
          created_by: string | null
          currency: string
          due_date: string
          id: string
          invoice_no: string
          metadata: Json | null
          paid_amount: number
          paid_at: string | null
          payment_method: string
          shipper_id: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          applied_exchange_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          due_date: string
          id?: string
          invoice_no: string
          metadata?: Json | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string
          shipper_id: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          applied_exchange_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          due_date?: string
          id?: string
          invoice_no?: string
          metadata?: Json | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string
          shipper_id?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_invoices_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_master_orders: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          created_by: string | null
          dest_port_id: string | null
          eta: string | null
          etd: string | null
          id: string
          master_no: string
          origin_port_id: string | null
          remarks: string | null
          status: string | null
          total_gross_weight: number | null
          total_house_count: number | null
          total_volume: number | null
          updated_at: string | null
          vessel_flight_no: string | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dest_port_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          master_no: string
          origin_port_id?: string | null
          remarks?: string | null
          status?: string | null
          total_gross_weight?: number | null
          total_house_count?: number | null
          total_volume?: number | null
          updated_at?: string | null
          vessel_flight_no?: string | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dest_port_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          master_no?: string
          origin_port_id?: string | null
          remarks?: string | null
          status?: string | null
          total_gross_weight?: number | null
          total_house_count?: number | null
          total_volume?: number | null
          updated_at?: string | null
          vessel_flight_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_master_orders_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_master_orders_dest_port_id_fkey"
            columns: ["dest_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_master_orders_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_notices: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_important: boolean
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_important?: boolean
          is_published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_important?: boolean
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_order_costs: {
        Row: {
          cost_type: string
          created_at: string | null
          currency: string
          id: string
          invoice_id: string | null
          is_revenue: boolean | null
          order_id: string
          quantity: number
          total_amount: number | null
          unit_price: number
        }
        Insert: {
          cost_type: string
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          is_revenue?: boolean | null
          order_id: string
          quantity?: number
          total_amount?: number | null
          unit_price?: number
        }
        Update: {
          cost_type?: string
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          is_revenue?: boolean | null
          order_id?: string
          quantity?: number
          total_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_order_costs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "zen_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_order_costs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_order_items: {
        Row: {
          created_at: string | null
          currency: string | null
          hs_code: string | null
          id: string
          item_name: string
          item_packing_unit: string | null
          order_id: string
          package_id: string | null
          quantity: number
          sku_code: string | null
          unit_price: number | null
          updated_at: string | null
          volume: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          hs_code?: string | null
          id?: string
          item_name: string
          item_packing_unit?: string | null
          order_id: string
          package_id?: string | null
          quantity?: number
          sku_code?: string | null
          unit_price?: number | null
          updated_at?: string | null
          volume?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          hs_code?: string | null
          id?: string
          item_name?: string
          item_packing_unit?: string | null
          order_id?: string
          package_id?: string | null
          quantity?: number
          sku_code?: string | null
          unit_price?: number | null
          updated_at?: string | null
          volume?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_order_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "zen_order_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_order_packages: {
        Row: {
          created_at: string | null
          gross_weight: number | null
          height: number | null
          id: string
          length: number | null
          order_id: string
          packing_count: number | null
          packing_unit: string
          remarks: string | null
          updated_at: string | null
          volume: number | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          gross_weight?: number | null
          height?: number | null
          id?: string
          length?: number | null
          order_id: string
          packing_count?: number | null
          packing_unit: string
          remarks?: string | null
          updated_at?: string | null
          volume?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          gross_weight?: number | null
          height?: number | null
          id?: string
          length?: number | null
          order_id?: string
          packing_count?: number | null
          packing_unit?: string
          remarks?: string | null
          updated_at?: string | null
          volume?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_order_packages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_order_rate_snapshots: {
        Row: {
          applied_currency: string | null
          applied_rule: string
          applied_unit_price: number
          id: string
          is_manual: boolean | null
          metadata: Json | null
          order_id: string
          override_reason: string | null
          priority: number
          rate_card_id: string | null
          snapshot_at: string | null
          version_no: number
        }
        Insert: {
          applied_currency?: string | null
          applied_rule: string
          applied_unit_price: number
          id?: string
          is_manual?: boolean | null
          metadata?: Json | null
          order_id: string
          override_reason?: string | null
          priority?: number
          rate_card_id?: string | null
          snapshot_at?: string | null
          version_no?: number
        }
        Update: {
          applied_currency?: string | null
          applied_rule?: string
          applied_unit_price?: number
          id?: string
          is_manual?: boolean | null
          metadata?: Json | null
          order_id?: string
          override_reason?: string | null
          priority?: number
          rate_card_id?: string | null
          snapshot_at?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_order_rate_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_order_rate_snapshots_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_order_routes: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          id: string
          order_id: string | null
          selected_option_id: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          id?: string
          order_id?: string | null
          selected_option_id?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          id?: string
          order_id?: string | null
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_order_routes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_order_routes_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "zen_route_options"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_orders: {
        Row: {
          billing_status: string | null
          cargo_details: Json
          carrier_id: string | null
          confirmed_at: string | null
          created_at: string | null
          delivery_notes: string | null
          description: string | null
          dest_port_id: string | null
          id: string
          master_order_id: string | null
          order_date: string | null
          order_no: string
          order_type: string | null
          origin_port_id: string | null
          received_at: string | null
          recipient_address: string | null
          recipient_contact: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_pccc: string | null
          recipient_phone: string | null
          recipient_zipcode: string | null
          shipper_contact_name: string | null
          shipper_contact_phone: string | null
          shipper_id: string | null
          status: string | null
          transport_mode: string | null
        }
        Insert: {
          billing_status?: string | null
          cargo_details: Json
          carrier_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          description?: string | null
          dest_port_id?: string | null
          id?: string
          master_order_id?: string | null
          order_date?: string | null
          order_no: string
          order_type?: string | null
          origin_port_id?: string | null
          received_at?: string | null
          recipient_address?: string | null
          recipient_contact?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_pccc?: string | null
          recipient_phone?: string | null
          recipient_zipcode?: string | null
          shipper_contact_name?: string | null
          shipper_contact_phone?: string | null
          shipper_id?: string | null
          status?: string | null
          transport_mode?: string | null
        }
        Update: {
          billing_status?: string | null
          cargo_details?: Json
          carrier_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          description?: string | null
          dest_port_id?: string | null
          id?: string
          master_order_id?: string | null
          order_date?: string | null
          order_no?: string
          order_type?: string | null
          origin_port_id?: string | null
          received_at?: string | null
          recipient_address?: string | null
          recipient_contact?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_pccc?: string | null
          recipient_phone?: string | null
          recipient_zipcode?: string | null
          shipper_contact_name?: string | null
          shipper_contact_phone?: string | null
          shipper_id?: string | null
          status?: string | null
          transport_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_orders_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_orders_dest_port_id_fkey"
            columns: ["dest_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_orders_master_order_id_fkey"
            columns: ["master_order_id"]
            isOneToOne: false
            referencedRelation: "zen_master_orders"
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
      zen_organization_documents: {
        Row: {
          doc_type: string
          file_path: string
          id: string
          org_id: string
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          doc_type: string
          file_path: string
          id?: string
          org_id: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          doc_type?: string
          file_path?: string
          id?: string
          org_id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_organization_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_organizations: {
        Row: {
          approval_comment: string | null
          approval_date: string | null
          biz_no: string | null
          corporate_id: string | null
          created_at: string | null
          iata_code: string | null
          id: string
          metadata: Json | null
          name: string
          parent_id: string | null
          prefix_code: string | null
          rep_name: string | null
          status: string | null
          type: string
        }
        Insert: {
          approval_comment?: string | null
          approval_date?: string | null
          biz_no?: string | null
          corporate_id?: string | null
          created_at?: string | null
          iata_code?: string | null
          id?: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          prefix_code?: string | null
          rep_name?: string | null
          status?: string | null
          type: string
        }
        Update: {
          approval_comment?: string | null
          approval_date?: string | null
          biz_no?: string | null
          corporate_id?: string | null
          created_at?: string | null
          iata_code?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          prefix_code?: string | null
          rep_name?: string | null
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
      zen_param_audit_log: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_value: string | null
          old_value: string | null
          param_key: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          param_key: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          param_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_param_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      zen_qna: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          order_id: string | null
          org_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          order_id?: string | null
          org_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          order_id?: string | null
          org_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_qna_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_qna_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_qna_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_qna_answers: {
        Row: {
          answered_by: string
          content: string
          created_at: string
          id: string
          qna_id: string
        }
        Insert: {
          answered_by: string
          content: string
          created_at?: string
          id?: string
          qna_id: string
        }
        Update: {
          answered_by?: string
          content?: string
          created_at?: string
          id?: string
          qna_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_qna_answers_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_qna_answers_qna_id_fkey"
            columns: ["qna_id"]
            isOneToOne: false
            referencedRelation: "zen_qna"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_rate_cards: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_id: string | null
          dest_code: string
          id: string
          is_direct: boolean | null
          mode: string
          org_id: string | null
          origin_code: string
          priority: number
          remarks: string | null
          status: string
          transit_days: number | null
          unit_price: number
          unit_type: string
          valid_from: string | null
          valid_to: string | null
          version_no: number
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          dest_code: string
          id?: string
          is_direct?: boolean | null
          mode: string
          org_id?: string | null
          origin_code: string
          priority?: number
          remarks?: string | null
          status?: string
          transit_days?: number | null
          unit_price: number
          unit_type: string
          valid_from?: string | null
          valid_to?: string | null
          version_no?: number
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          dest_code?: string
          id?: string
          is_direct?: boolean | null
          mode?: string
          org_id?: string | null
          origin_code?: string
          priority?: number
          remarks?: string | null
          status?: string
          transit_days?: number | null
          unit_price?: number
          unit_type?: string
          valid_from?: string | null
          valid_to?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_rate_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      zen_rate_tiers: {
        Row: {
          created_at: string | null
          id: string
          min_total_price: number | null
          rate_card_id: string | null
          unit_price: number
          weight_min: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_total_price?: number | null
          rate_card_id?: string | null
          unit_price: number
          weight_min?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          min_total_price?: number | null
          rate_card_id?: string | null
          unit_price?: number
          weight_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_rate_tiers_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "zen_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_role_permissions: {
        Row: {
          created_at: string | null
          id: string
          is_allowed: boolean | null
          menu_id: string
          path: string
          role_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          menu_id: string
          path: string
          role_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          menu_id?: string
          path?: string
          role_code?: string
        }
        Relationships: []
      }
      zen_route_options: {
        Row: {
          created_at: string | null
          id: string
          option_type: string
          order_id: string | null
          score: number | null
          segments: Json
          total_cost: number | null
          total_transit_days: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_type: string
          order_id?: string | null
          score?: number | null
          segments: Json
          total_cost?: number | null
          total_transit_days?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_type?: string
          order_id?: string | null
          score?: number | null
          segments?: Json
          total_cost?: number | null
          total_transit_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_route_options_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_sequences: {
        Row: {
          last_value: number | null
          prefix: string
          year: string
        }
        Insert: {
          last_value?: number | null
          prefix: string
          year: string
        }
        Update: {
          last_value?: number | null
          prefix?: string
          year?: string
        }
        Relationships: []
      }
      zen_system_params: {
        Row: {
          category: string
          description: string
          effective_from: string
          effective_to: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value_jsonb: Json | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          category: string
          description: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value_jsonb?: Json | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          category?: string
          description?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value_jsonb?: Json | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_system_params_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      zen_tax_invoices: {
        Row: {
          applied_exchange_rate: number | null
          buyer_info: Json
          created_at: string | null
          id: string
          invoice_id: string
          issued_at: string | null
          issued_by: string | null
          items: Json
          metadata: Json | null
          recipient_email: string
          sent_at: string | null
          status: string
          supplier_info: Json
          tax_invoice_no: string
          total_amount: number
          updated_at: string | null
          vat_amount: number
        }
        Insert: {
          applied_exchange_rate?: number | null
          buyer_info: Json
          created_at?: string | null
          id?: string
          invoice_id: string
          issued_at?: string | null
          issued_by?: string | null
          items?: Json
          metadata?: Json | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          supplier_info: Json
          tax_invoice_no: string
          total_amount?: number
          updated_at?: string | null
          vat_amount?: number
        }
        Update: {
          applied_exchange_rate?: number | null
          buyer_info?: Json
          created_at?: string | null
          id?: string
          invoice_id?: string
          issued_at?: string | null
          issued_by?: string | null
          items?: Json
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          supplier_info?: Json
          tax_invoice_no?: string
          total_amount?: number
          updated_at?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_tax_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "zen_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_tracking_configs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          order_id: string | null
          provider_name: string | null
          provider_type: string
          tracking_no: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          provider_name?: string | null
          provider_type: string
          tracking_no?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          provider_name?: string | null
          provider_type?: string
          tracking_no?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_tracking_configs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_tracking_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_code: string
          event_time: string
          id: string
          location: string | null
          order_id: string | null
          source_type: string | null
          tracking_config_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_code: string
          event_time: string
          id?: string
          location?: string | null
          order_id?: string | null
          source_type?: string | null
          tracking_config_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_code?: string
          event_time?: string
          id?: string
          location?: string | null
          order_id?: string | null
          source_type?: string | null
          tracking_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_tracking_events_tracking_config_id_fkey"
            columns: ["tracking_config_id"]
            isOneToOne: false
            referencedRelation: "zen_tracking_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_tracking_raw_logs: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          provider_name: string
          raw_data: Json
          tracking_no: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          provider_name: string
          raw_data: Json
          tracking_no?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          provider_name?: string
          raw_data?: Json
          tracking_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_tracking_raw_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_tracking_scenarios: {
        Row: {
          created_at: string | null
          description_template: string | null
          event_code: string
          id: string
          location_template: string | null
          order_status: string
          relative_minutes: number
          sequence_no: number
          transport_mode: string
        }
        Insert: {
          created_at?: string | null
          description_template?: string | null
          event_code: string
          id?: string
          location_template?: string | null
          order_status: string
          relative_minutes: number
          sequence_no: number
          transport_mode: string
        }
        Update: {
          created_at?: string | null
          description_template?: string | null
          event_code?: string
          id?: string
          location_template?: string | null
          order_status?: string
          relative_minutes?: number
          sequence_no?: number
          transport_mode?: string
        }
        Relationships: []
      }
      zen_transport_costs: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          currency: string
          destination_port_id: string | null
          end_date: string | null
          id: string
          origin_port_id: string | null
          profit_margin: number
          service_type: string
          start_date: string
          unit_cost: number
          updated_at: string | null
          weight_max: number
          weight_min: number
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          currency?: string
          destination_port_id?: string | null
          end_date?: string | null
          id?: string
          origin_port_id?: string | null
          profit_margin?: number
          service_type: string
          start_date?: string
          unit_cost: number
          updated_at?: string | null
          weight_max: number
          weight_min?: number
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          currency?: string
          destination_port_id?: string | null
          end_date?: string | null
          id?: string
          origin_port_id?: string | null
          profit_margin?: number
          service_type?: string
          start_date?: string
          unit_cost?: number
          updated_at?: string | null
          weight_max?: number
          weight_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "zen_transport_costs_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_transport_costs_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_transport_costs_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
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
      zen_vessel_schedules: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          destination_port_id: string | null
          eta: string
          etd: string
          id: string
          origin_port_id: string | null
          service_type: string
          status: string | null
          vessel_name: string | null
          voyage_no: string | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          destination_port_id?: string | null
          eta: string
          etd: string
          id?: string
          origin_port_id?: string | null
          service_type: string
          status?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          destination_port_id?: string | null
          eta?: string
          etd?: string
          id?: string
          origin_port_id?: string | null
          service_type?: string
          status?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zen_vessel_schedules_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_vessel_schedules_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_vessel_schedules_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "zen_ports"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_voc: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          order_id: string
          org_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          order_id: string
          org_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          order_id?: string
          org_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_voc_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "zen_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_voc_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_voc_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_voc_answers: {
        Row: {
          answered_by: string
          content: string
          created_at: string
          id: string
          voc_id: string
        }
        Insert: {
          answered_by: string
          content: string
          created_at?: string
          id?: string
          voc_id: string
        }
        Update: {
          answered_by?: string
          content?: string
          created_at?: string
          id?: string
          voc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_voc_answers_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "zen_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_voc_answers_voc_id_fkey"
            columns: ["voc_id"]
            isOneToOne: false
            referencedRelation: "zen_voc"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_wallet: {
        Row: {
          balance: number
          currency: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          currency?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          currency?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_wallet_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "zen_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zen_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zen_wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zen_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "zen_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_organization: { Args: { target_org_id: string }; Returns: string }
      calculate_order_costs: { Args: { p_order_id: string }; Returns: Json }
      fn_get_best_matching_rate: {
        Args: {
          p_carrier_id: string
          p_customer_id: string
          p_dest_port_id: string
          p_origin_port_id: string
          p_reference_date: string
          p_service_type: string
        }
        Returns: {
          base_date_rule: string
          currency: string
          id: string
          unit_price: number
        }[]
      }
      generate_master_order_no: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_next_order_sequence: {
        Args: { p_prefix: string; p_year: string }
        Returns: string
      }
      get_orders_aggregation: {
        Args: { order_ids: string[] }
        Returns: {
          total_volume: number
          total_weight: number
        }[]
      }
      reject_organization: {
        Args: { comment: string; target_org_id: string }
        Returns: boolean
      }
      request_organization_supplement: {
        Args: { comment: string; target_org_id: string }
        Returns: boolean
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

