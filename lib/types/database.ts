/**
 * Tipos do banco de dados — Fase 1.
 *
 * Recomendação: assim que o projeto Supabase estiver criado, gere os tipos
 * reais com:
 *   npx supabase gen types typescript --project-id <SEU_PROJECT_ID> > lib/types/database.ts
 * Isso substitui este arquivo por uma versão completa e sempre sincronizada
 * com as migrations aplicadas. Este arquivo cobre apenas o necessário para
 * a Fase 1 compilar com segurança de tipos.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          document_number: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          document_number?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          document_number?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      organization_settings: {
        Row: {
          id: string;
          organization_id: string;
          display_name: string | null;
          document_number: string | null;
          address: string | null;
          logo_url: string | null;
          receipt_prefix: string;
          next_receipt_number: number;
          timezone: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          display_name?: string | null;
          document_number?: string | null;
          address?: string | null;
          logo_url?: string | null;
          receipt_prefix?: string;
          next_receipt_number?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          display_name?: string | null;
          document_number?: string | null;
          address?: string | null;
          logo_url?: string | null;
          receipt_prefix?: string;
          next_receipt_number?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          role_key: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          role_key?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          email?: string;
          role_key?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      roles: {
        Row: { key: string; name: string; description: string | null; created_at: string };
        Insert: { key: string; name: string; description?: string | null; created_at?: string };
        Update: { key?: string; name?: string; description?: string | null; created_at?: string };
        Relationships: [];
      };
      permissions: {
        Row: {
          key: string;
          name: string;
          description: string | null;
          category: string;
          created_at: string;
        };
        Insert: {
          key: string;
          name: string;
          description?: string | null;
          category?: string;
          created_at?: string;
        };
        Update: {
          key?: string;
          name?: string;
          description?: string | null;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: { role_key: string; permission_key: string; created_at: string };
        Insert: { role_key: string; permission_key: string; created_at?: string };
        Update: { role_key?: string; permission_key?: string; created_at?: string };
        Relationships: [];
      };
      user_permissions: {
        Row: {
          user_id: string;
          permission_key: string;
          is_granted: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          user_id: string;
          permission_key: string;
          is_granted?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          user_id?: string;
          permission_key?: string;
          is_granted?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          previous_value: Json | null;
          new_value: Json | null;
          metadata: Json | null;
          origin: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          previous_value?: Json | null;
          new_value?: Json | null;
          metadata?: Json | null;
          origin?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          previous_value?: Json | null;
          new_value?: Json | null;
          metadata?: Json | null;
          origin?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      chart_account_families: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string | null;
          type: string;
          status: string;
          display_order: number;
          color: string | null;
          icon: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code?: string | null;
          type: string;
          status?: string;
          display_order?: number;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          code?: string | null;
          type?: string;
          status?: string;
          display_order?: number;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      chart_account_categories: {
        Row: {
          id: string;
          organization_id: string;
          family_id: string;
          name: string;
          code: string | null;
          managerial_nature: string;
          dre_behavior: string;
          cashflow_behavior: string;
          status: string;
          display_order: number;
          color: string | null;
          icon: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          family_id: string;
          name: string;
          code?: string | null;
          managerial_nature?: string;
          dre_behavior?: string;
          cashflow_behavior?: string;
          status?: string;
          display_order?: number;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          family_id?: string;
          name?: string;
          code?: string | null;
          managerial_nature?: string;
          dre_behavior?: string;
          cashflow_behavior?: string;
          status?: string;
          display_order?: number;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      chart_account_subcategories: {
        Row: {
          id: string;
          organization_id: string;
          category_id: string;
          name: string;
          code: string | null;
          status: string;
          display_order: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_id: string;
          name: string;
          code?: string | null;
          status?: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          category_id?: string;
          name?: string;
          code?: string | null;
          status?: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      cost_centers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string | null;
          status: string;
          display_order: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code?: string | null;
          status?: string;
          display_order?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          code?: string | null;
          status?: string;
          display_order?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          id: string;
          organization_id: string;
          display_name: string;
          bank_name: string | null;
          agency: string | null;
          account_number: string | null;
          account_type: string;
          ownership: string;
          holder_name: string | null;
          document_number: string | null;
          initial_balance: number;
          initial_balance_date: string;
          minimum_balance: number | null;
          consider_in_available_balance: boolean;
          consider_in_business_dashboard: boolean;
          allow_ofx_import: boolean;
          status: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          display_name: string;
          bank_name?: string | null;
          agency?: string | null;
          account_number?: string | null;
          account_type?: string;
          ownership?: string;
          holder_name?: string | null;
          document_number?: string | null;
          initial_balance?: number;
          initial_balance_date?: string;
          minimum_balance?: number | null;
          consider_in_available_balance?: boolean;
          consider_in_business_dashboard?: boolean;
          allow_ofx_import?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          display_name?: string;
          bank_name?: string | null;
          agency?: string | null;
          account_number?: string | null;
          account_type?: string;
          ownership?: string;
          holder_name?: string | null;
          document_number?: string | null;
          initial_balance?: number;
          initial_balance_date?: string;
          minimum_balance?: number | null;
          consider_in_available_balance?: boolean;
          consider_in_business_dashboard?: boolean;
          allow_ofx_import?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      counterparties: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          trade_name: string | null;
          document_number: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          types: string[];
          bank_details: Json | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          trade_name?: string | null;
          document_number?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          types?: string[];
          bank_details?: Json | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          trade_name?: string | null;
          document_number?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          types?: string[];
          bank_details?: Json | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          status: string;
          display_order: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          status?: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          status?: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      financial_entries: {
        Row: {
          id: string;
          organization_id: string;
          type: string;
          description: string;
          counterparty_id: string | null;
          category_id: string;
          subcategory_id: string | null;
          cost_center_id: string | null;
          bank_account_id: string | null;
          payment_method_id: string | null;
          original_amount: number;
          issue_date: string | null;
          competence_date: string | null;
          due_date: string;
          document_number: string | null;
          notes: string | null;
          status: string;
          origin: string;
          installment_group_id: string | null;
          installment_number: number | null;
          installment_total: number | null;
          recurring_rule_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          type: string;
          description: string;
          counterparty_id?: string | null;
          category_id: string;
          subcategory_id?: string | null;
          cost_center_id?: string | null;
          bank_account_id?: string | null;
          payment_method_id?: string | null;
          original_amount: number;
          issue_date?: string | null;
          competence_date?: string | null;
          due_date: string;
          document_number?: string | null;
          notes?: string | null;
          status?: string;
          origin?: string;
          installment_group_id?: string | null;
          installment_number?: number | null;
          installment_total?: number | null;
          recurring_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          type?: string;
          description?: string;
          counterparty_id?: string | null;
          category_id?: string;
          subcategory_id?: string | null;
          cost_center_id?: string | null;
          bank_account_id?: string | null;
          payment_method_id?: string | null;
          original_amount?: number;
          issue_date?: string | null;
          competence_date?: string | null;
          due_date?: string;
          document_number?: string | null;
          notes?: string | null;
          status?: string;
          origin?: string;
          installment_group_id?: string | null;
          installment_number?: number | null;
          installment_total?: number | null;
          recurring_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      installment_groups: {
        Row: {
          id: string;
          organization_id: string;
          description: string;
          total_amount: number;
          installments_count: number;
          recognition_strategy: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          description: string;
          total_amount: number;
          installments_count: number;
          recognition_strategy?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          description?: string;
          total_amount?: number;
          installments_count?: number;
          recognition_strategy?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          id: string;
          organization_id: string;
          type: string;
          description: string;
          counterparty_id: string | null;
          category_id: string;
          subcategory_id: string | null;
          cost_center_id: string | null;
          bank_account_id: string | null;
          payment_method_id: string | null;
          amount: number;
          frequency: string;
          interval_count: number;
          start_date: string;
          end_date: string | null;
          max_occurrences: number | null;
          adjust_business_day: boolean;
          status: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          type: string;
          description: string;
          counterparty_id?: string | null;
          category_id: string;
          subcategory_id?: string | null;
          cost_center_id?: string | null;
          bank_account_id?: string | null;
          payment_method_id?: string | null;
          amount: number;
          frequency: string;
          interval_count?: number;
          start_date: string;
          end_date?: string | null;
          max_occurrences?: number | null;
          adjust_business_day?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          type?: string;
          description?: string;
          counterparty_id?: string | null;
          category_id?: string;
          subcategory_id?: string | null;
          cost_center_id?: string | null;
          bank_account_id?: string | null;
          payment_method_id?: string | null;
          amount?: number;
          frequency?: string;
          interval_count?: number;
          start_date?: string;
          end_date?: string | null;
          max_occurrences?: number | null;
          adjust_business_day?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      financial_settlements: {
        Row: {
          id: string;
          organization_id: string;
          entry_id: string;
          bank_account_id: string;
          amount: number;
          interest: number;
          penalty: number;
          discount: number;
          addition: number;
          settlement_date: string;
          payment_method_id: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entry_id: string;
          bank_account_id: string;
          amount: number;
          interest?: number;
          penalty?: number;
          discount?: number;
          addition?: number;
          settlement_date: string;
          payment_method_id?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          entry_id?: string;
          bank_account_id?: string;
          amount?: number;
          interest?: number;
          penalty?: number;
          discount?: number;
          addition?: number;
          settlement_date?: string;
          payment_method_id?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          organization_id: string;
          entry_id: string;
          file_path: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entry_id: string;
          file_path: string;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          entry_id?: string;
          file_path?: string;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      transfers: {
        Row: {
          id: string;
          organization_id: string;
          from_bank_account_id: string;
          to_bank_account_id: string;
          amount: number;
          transfer_date: string;
          classification: string;
          notes: string | null;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          from_bank_account_id: string;
          to_bank_account_id: string;
          amount: number;
          transfer_date: string;
          classification?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          from_bank_account_id?: string;
          to_bank_account_id?: string;
          amount?: number;
          transfer_date?: string;
          classification?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      bank_balance_snapshots: {
        Row: {
          id: string;
          organization_id: string;
          bank_account_id: string;
          snapshot_date: string;
          calculated_balance: number;
          informed_balance: number;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          bank_account_id: string;
          snapshot_date: string;
          calculated_balance: number;
          informed_balance: number;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          bank_account_id?: string;
          snapshot_date?: string;
          calculated_balance?: number;
          informed_balance?: number;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          organization_id: string;
          bank_account_id: string;
          file_name: string;
          total_transactions: number;
          imported_count: number;
          duplicate_count: number;
          ignored_count: number;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          bank_account_id: string;
          file_name: string;
          total_transactions?: number;
          imported_count?: number;
          duplicate_count?: number;
          ignored_count?: number;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          bank_account_id?: string;
          file_name?: string;
          total_transactions?: number;
          imported_count?: number;
          duplicate_count?: number;
          ignored_count?: number;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      import_errors: {
        Row: {
          id: string;
          organization_id: string;
          import_batch_id: string;
          message: string;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          import_batch_id: string;
          message: string;
          raw_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          import_batch_id?: string;
          message?: string;
          raw_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bank_transactions: {
        Row: {
          id: string;
          organization_id: string;
          bank_account_id: string;
          import_batch_id: string | null;
          ofx_transaction_id: string | null;
          transaction_hash: string;
          transaction_date: string;
          amount: number;
          description: string;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          bank_account_id: string;
          import_batch_id?: string | null;
          ofx_transaction_id?: string | null;
          transaction_hash: string;
          transaction_date: string;
          amount: number;
          description?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          bank_account_id?: string;
          import_batch_id?: string | null;
          ofx_transaction_id?: string | null;
          transaction_hash?: string;
          transaction_date?: string;
          amount?: number;
          description?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      reconciliation_links: {
        Row: {
          id: string;
          organization_id: string;
          bank_transaction_id: string;
          settlement_id: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          bank_transaction_id: string;
          settlement_id: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          bank_transaction_id?: string;
          settlement_id?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      rent_receipts: {
        Row: {
          id: string;
          organization_id: string;
          entry_id: string;
          settlement_id: string;
          counterparty_id: string | null;
          receipt_number: number;
          receipt_number_formatted: string;
          amount: number;
          amount_in_words: string;
          payment_date: string;
          reference_period: string | null;
          space_description: string | null;
          payment_method_id: string | null;
          notes: string | null;
          verification_code: string;
          file_path: string | null;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entry_id: string;
          settlement_id: string;
          counterparty_id?: string | null;
          receipt_number: number;
          receipt_number_formatted: string;
          amount: number;
          amount_in_words: string;
          payment_date: string;
          reference_period?: string | null;
          space_description?: string | null;
          payment_method_id?: string | null;
          notes?: string | null;
          verification_code: string;
          file_path?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          entry_id?: string;
          settlement_id?: string;
          counterparty_id?: string | null;
          receipt_number?: number;
          receipt_number_formatted?: string;
          amount?: number;
          amount_in_words?: string;
          payment_date?: string;
          reference_period?: string | null;
          space_description?: string | null;
          payment_method_id?: string | null;
          notes?: string | null;
          verification_code?: string;
          file_path?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      report_configs: {
        Row: {
          id: string;
          organization_id: string;
          report_type: string;
          enabled: boolean;
          recipients: string[];
          day_of_week: number | null;
          day_of_month: number | null;
          send_hour: number;
          timezone: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          report_type: string;
          enabled?: boolean;
          recipients?: string[];
          day_of_week?: number | null;
          day_of_month?: number | null;
          send_hour?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          report_type?: string;
          enabled?: boolean;
          recipients?: string[];
          day_of_week?: number | null;
          day_of_month?: number | null;
          send_hour?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      generated_reports: {
        Row: {
          id: string;
          organization_id: string;
          report_config_id: string | null;
          report_type: string;
          period_start: string;
          period_end: string;
          recipients: string[];
          status: string;
          error_message: string | null;
          triggered_by: string;
          sent_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          report_config_id?: string | null;
          report_type: string;
          period_start: string;
          period_end: string;
          recipients?: string[];
          status: string;
          error_message?: string | null;
          triggered_by?: string;
          sent_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          report_config_id?: string | null;
          report_type?: string;
          period_start?: string;
          period_end?: string;
          recipients?: string[];
          status?: string;
          error_message?: string | null;
          triggered_by?: string;
          sent_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { p_permission_key: string };
        Returns: boolean;
      };
      auth_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      auth_role_key: {
        Args: Record<string, never>;
        Returns: string;
      };
      entry_remaining_balance: {
        Args: { p_entry_id: string };
        Returns: number;
      };
      bank_account_balance: {
        Args: { p_account_id: string };
        Returns: number;
      };
      settle_entry: {
        Args: {
          p_entry_id: string;
          p_bank_account_id: string;
          p_settlement_date: string;
          p_amount?: number | null;
          p_interest?: number;
          p_penalty?: number;
          p_discount?: number;
          p_addition?: number;
          p_payment_method_id?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      reverse_settlement: {
        Args: { p_settlement_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      create_installment_plan: {
        Args: {
          p_type: string;
          p_description: string;
          p_counterparty_id?: string | null;
          p_category_id: string;
          p_subcategory_id?: string | null;
          p_cost_center_id?: string | null;
          p_bank_account_id?: string | null;
          p_payment_method_id?: string | null;
          p_total_amount: number;
          p_installments_count: number;
          p_first_due_date: string;
          p_recognition_strategy?: string;
          p_document_number?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      generate_recurring_instances: {
        Args: { p_rule_id: string; p_months_ahead?: number };
        Returns: number;
      };
      cancel_recurring_occurrences: {
        Args: { p_rule_id: string; p_scope: string; p_from_entry_id?: string | null };
        Returns: number;
      };
      cancel_entry: {
        Args: { p_entry_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      bank_account_balance_at: {
        Args: { p_account_id: string; p_as_of: string };
        Returns: number;
      };
      create_transfer: {
        Args: {
          p_from_bank_account_id: string;
          p_to_bank_account_id: string;
          p_amount: number;
          p_transfer_date: string;
          p_classification: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      reconcile_with_existing_entry: {
        Args: {
          p_bank_transaction_id: string;
          p_entry_id: string;
          p_amount?: number | null;
          p_payment_method_id?: string | null;
        };
        Returns: string;
      };
      reconcile_with_new_entry: {
        Args: {
          p_bank_transaction_id: string;
          p_category_id: string;
          p_description?: string | null;
          p_counterparty_id?: string | null;
          p_subcategory_id?: string | null;
          p_cost_center_id?: string | null;
          p_payment_method_id?: string | null;
          p_document_number?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      undo_reconciliation: {
        Args: { p_bank_transaction_id: string };
        Returns: undefined;
      };
      ignore_bank_transaction: {
        Args: { p_bank_transaction_id: string };
        Returns: undefined;
      };
      unignore_bank_transaction: {
        Args: { p_bank_transaction_id: string };
        Returns: undefined;
      };
      reserve_receipt_number: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_rent_receipt: {
        Args: {
          p_settlement_id: string;
          p_amount_in_words: string;
          p_reference_period?: string | null;
          p_space_description?: string | null;
          p_notes?: string | null;
          p_verification_code?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
