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
          nome: string
          permissoes: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
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
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      user_has_company_access: {
        Args: { company_id: string; user_id: string }
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
