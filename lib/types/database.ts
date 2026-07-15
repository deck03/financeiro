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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
