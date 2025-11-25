#!/usr/bin/env python3
import psycopg2
import sys

# Configuração de conexão
conn_string = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"

try:
    # Conectar ao banco
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Ler e executar migração 1
    print("Aplicando migração 1: Views Materializadas...")
    with open('supabase/migrations/20251109000001_create_dashboard_materialized_views.sql', 'r', encoding='utf-8') as f:
        sql1 = f.read()
        cursor.execute(sql1)
    print("✅ Migração 1 aplicada com sucesso!")
    
    # Ler e executar migração 2
    print("Aplicando migração 2: Funções de Refresh...")
    with open('supabase/migrations/20251109000002_create_refresh_statistics_views_function.sql', 'r', encoding='utf-8') as f:
        sql2 = f.read()
        cursor.execute(sql2)
    print("✅ Migração 2 aplicada com sucesso!")
    
    # Executar refresh inicial
    print("Executando refresh inicial das views...")
    cursor.execute("SELECT public.refresh_all_statistics_views();")
    print("✅ Refresh inicial executado com sucesso!")
    
    cursor.close()
    conn.close()
    print("\n🎉 Todas as migrações foram aplicadas com sucesso!")
    
except Exception as e:
    print(f"❌ Erro ao aplicar migrações: {e}")
    sys.exit(1)

