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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          ativo: boolean | null
          cnpj: string
          contato: Json | null
          created_at: string | null
          endereco: Json | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string
          razao_social: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj: string
          contato?: Json | null
          created_at?: string | null
          endereco?: Json | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia: string
          razao_social: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string
          contato?: Json | null
          created_at?: string | null
          endereco?: Json | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string
          razao_social?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          ativo: boolean | null
          codigo: string
          company_id: string | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_read: boolean | null
          created_at: string | null
          entity_name: string
          id: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          entity_name: string
          id?: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          entity_name?: string
          id?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          ativo: boolean | null
          cfop: string | null
          classe: string | null
          codigo: string
          company_id: string | null
          created_at: string | null
          cst: string | null
          id: string
          imagem_url: string | null
          ncm: string | null
          nome: string
          tipo: Database["public"]["Enums"]["material_type"]
          unidade_medida: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cfop?: string | null
          classe?: string | null
          codigo: string
          company_id?: string | null
          created_at?: string | null
          cst?: string | null
          id?: string
          imagem_url?: string | null
          ncm?: string | null
          nome: string
          tipo: Database["public"]["Enums"]["material_type"]
          unidade_medida: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cfop?: string | null
          classe?: string | null
          codigo?: string
          company_id?: string | null
          created_at?: string | null
          cst?: string | null
          id?: string
          imagem_url?: string | null
          ncm?: string | null
          nome?: string
          tipo?: Database["public"]["Enums"]["material_type"]
          unidade_medida?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_read: boolean | null
          created_at: string | null
          id: string
          module_name: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          id?: string
          module_name: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_read?: boolean | null
          created_at?: string | null
          id?: string
          module_name?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          ativo: boolean | null
          cnpj: string
          company_id: string | null
          contato: Json | null
          created_at: string | null
          endereco: Json | null
          id: string
          matriz_id: string | null
          nome_fantasia: string | null
          razao_social: string
          tipo: Database["public"]["Enums"]["partner_type"][]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj: string
          company_id?: string | null
          contato?: Json | null
          created_at?: string | null
          endereco?: Json | null
          id?: string
          matriz_id?: string | null
          nome_fantasia?: string | null
          razao_social: string
          tipo: Database["public"]["Enums"]["partner_type"][]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string
          company_id?: string | null
          contato?: Json | null
          created_at?: string | null
          endereco?: Json | null
          id?: string
          matriz_id?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          tipo?: Database["public"]["Enums"]["partner_type"][]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_matriz_id_fkey"
            columns: ["matriz_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          is_active: boolean | null
          nome: string
          permissoes: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          permissoes?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          permissoes?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          ativo: boolean | null
          codigo: string
          company_id: string | null
          cost_center_id: string | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          profile_id: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ativo: boolean | null
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_access_permission: {
        Args: { action: string; schema_name: string; table_name: string }
        Returns: boolean
      }
      check_entity_permission: {
        Args:
          | {
              action: string
              schema_name: string
              table_name: string
              user_id: string
            }
          | { p_entity_name: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      check_module_permission: {
        Args: { p_module_name: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { p_module_name: string; p_permission: string }
        Returns: boolean
      }
      create_calculation_log: {
        Args: {
          ano_referencia_param: number
          company_id_param: string
          descricao_processo_param?: string
          mes_referencia_param: number
          processo_id_param: string
          tipo_processo_param: string
          usuario_id_param?: string
          usuario_nome_param?: string
        }
        Returns: string
      }
      create_entity_data: {
        Args: {
          company_id_param: string
          data_param: Json
          schema_name: string
          table_name: string
        }
        Returns: Json
      }
      delete_entity_data: {
        Args: {
          company_id_param: string
          id_param: string
          schema_name: string
          table_name: string
        }
        Returns: boolean
      }
      get_calculation_logs: {
        Args: { company_id_param: string; filters?: Json }
        Returns: {
          ano_referencia: number
          company_id: string
          created_at: string
          descricao_processo: string
          erros_encontrados: number
          erros_execucao: Json
          eventos_calculados: number
          fim_processamento: string
          funcionarios_processados: number
          id: string
          inicio_processamento: string
          logs_execucao: Json
          mes_referencia: number
          observacoes: string
          processo_id: string
          progresso: number
          resumo_calculos: Json
          status: string
          tempo_execucao_segundos: number
          tipo_processo: string
          total_funcionarios: number
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }[]
      }
      get_entity_data: {
        Args: {
          company_id_param?: string
          filters?: Json
          limit_param?: number
          offset_param?: number
          order_by?: string
          order_direction?: string
          schema_name: string
          table_name: string
        }
        Returns: {
          data: Json
          id: string
          total_count: number
        }[]
      }
      get_entity_data_simple: {
        Args: {
          company_id_param?: string
          filters?: Json
          limit_param?: number
          offset_param?: number
          order_by?: string
          order_direction?: string
          schema_name: string
          table_name: string
        }
        Returns: {
          data: Json
          id: string
          total_count: number
        }[]
      }
      get_entity_data_with_joins: {
        Args: {
          company_id_param?: string
          filters?: Json
          joins?: Json
          limit_param?: number
          offset_param?: number
          schema_name: string
          table_name: string
        }
        Returns: {
          data: Json
          id: string
          total_count: number
        }[]
      }
      get_user_companies: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_permissions: {
        Args: { p_user_id?: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_read: boolean
          module_name: string
        }[]
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: Json
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      update_calculation_log: {
        Args: { company_id_param: string; log_id_param: string; updates: Json }
        Returns: boolean
      }
      update_entity_data: {
        Args: {
          company_id_param: string
          data_param: Json
          id_param: string
          schema_name: string
          table_name: string
        }
        Returns: Json
      }
      user_has_company_access: {
        Args: { company_id: string; user_id: string }
        Returns: boolean
      }
      user_has_company_access_new: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      material_type: "produto" | "servico" | "materia_prima"
      partner_type: "cliente" | "fornecedor" | "transportador"
      user_role: "admin" | "user" | "manager"
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
      material_type: ["produto", "servico", "materia_prima"],
      partner_type: ["cliente", "fornecedor", "transportador"],
      user_role: ["admin", "user", "manager"],
    },
  },
} as const
