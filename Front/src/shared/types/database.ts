export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row, Insert, Update = Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Array<Record<string, never>>;
};

export type Database = {
  public: {
    Tables: {
      assignment_attempts: TableDefinition<
        {
          id: string;
          parent_id: string | null;
          child_id: string | null;
          dorsal_number: number | null;
          success: boolean;
          failure_reason: string | null;
          attempted_at: string;
        },
        {
          id?: string;
          parent_id?: string | null;
          child_id?: string | null;
          dorsal_number?: number | null;
          success?: boolean;
          failure_reason?: string | null;
          attempted_at?: string;
        }
      >;
      children: TableDefinition<
        {
          id: string;
          parent_id: string;
          full_name: string;
          birth_date: string | null;
          team_name: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          parent_id: string;
          full_name: string;
          birth_date?: string | null;
          team_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      child_name_catalog: TableDefinition<
        {
          id: string;
          full_name: string;
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          full_name: string;
          is_active?: boolean;
          created_at?: string;
        }
      >;
      contest_settings: TableDefinition<
        {
          id: number;
          contest_name: string;
          is_enabled: boolean;
          is_paused: boolean;
          opens_at: string | null;
          closes_at: string | null;
          updated_at: string;
        },
        {
          id?: number;
          contest_name?: string;
          is_enabled?: boolean;
          is_paused?: boolean;
          opens_at?: string | null;
          closes_at?: string | null;
          updated_at?: string;
        }
      >;
      dorsal_assignments: TableDefinition<
        {
          id: string;
          dorsal_number: number;
          child_id: string;
          assigned_by: string;
          assigned_at: string;
          updated_at: string;
        },
        {
          id?: string;
          dorsal_number: number;
          child_id: string;
          assigned_by: string;
          assigned_at?: string;
          updated_at?: string;
        }
      >;
      dorsals: TableDefinition<
        {
          number: number;
          is_locked: boolean;
          locked_reason: string | null;
          locked_by_parent_id: string | null;
          locked_by_child_id: string | null;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          number: number;
          is_locked?: boolean;
          locked_reason?: string | null;
          locked_by_parent_id?: string | null;
          locked_by_child_id?: string | null;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      incidents: TableDefinition<
        {
          id: string;
          code: string;
          kind: string;
          title: string;
          description: string;
          status: 'pending' | 'review' | 'resolved';
          severity: 'low' | 'medium' | 'high';
          user_id: string | null;
          user_email: string;
          dorsal_number: number | null;
          source: string;
          details: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          code?: string;
          kind: string;
          title: string;
          description: string;
          status?: 'pending' | 'review' | 'resolved';
          severity?: 'low' | 'medium' | 'high';
          user_id?: string | null;
          user_email: string;
          dorsal_number?: number | null;
          source?: string;
          details?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      profiles: TableDefinition<
        {
          id: string;
          email: string;
          display_name: string;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email: string;
          display_name: string;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: {
      dorsal_catalog: TableDefinition<
        {
          number: number;
          status: 'available' | 'assigned' | 'locked';
          assigned_child_id: string | null;
          assigned_child_name: string | null;
          is_locked: boolean;
          locked_reason: string | null;
          locked_by_parent_id: string | null;
          locked_by_child_id: string | null;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        },
        never,
        never
      >;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};