#!/usr/bin/env python3
"""
Script para aplicar migrações SQL no banco de dados Supabase
"""
import psycopg2
import sys
from pathlib import Path

# Configurações de conexão
DB_URL = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"

# Arquivos de migração na ordem
MIGRATIONS = [
    "supabase/migrations/20251220000020_create_logistica_schema.sql",
    "supabase/migrations/20251220000021_create_logistica_rpc_functions.sql",
    "supabase/migrations/20251220000022_add_logistica_to_approval_system.sql"
]

def apply_migration(conn, migration_file):
    """Aplica uma migração SQL"""
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
        
        print(f"✅ Migração aplicada: {migration_file}")
        return True
    except Exception as e:
        print(f"❌ Erro ao aplicar {migration_file}: {e}")
        conn.rollback()
        return False

def main():
    """Função principal"""
    try:
        conn = psycopg2.connect(DB_URL)
        print("✅ Conectado ao banco de dados")
        
        for migration in MIGRATIONS:
            migration_path = Path(migration)
            if not migration_path.exists():
                print(f"⚠️  Arquivo não encontrado: {migration}")
                continue
            
            if not apply_migration(conn, migration_path):
                print(f"❌ Falha ao aplicar {migration}")
                sys.exit(1)
        
        conn.close()
        print("\n✅ Todas as migrações foram aplicadas com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
