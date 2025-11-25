#!/usr/bin/env python3
"""
Script para analisar registros de ponto e verificar fotos/localizações
Conecta ao Supabase via psycopg2
"""

import os
import sys
import json
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor, Json
except ImportError:
    print("❌ Erro: psycopg2 não está instalado.")
    print("Instale com: pip install psycopg2-binary")
    sys.exit(1)

# Configurações de conexão (substituir pelos valores corretos)
DB_CONFIG = {
    "host": "db.wmtftyaqucwfsnnjepiy.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "81hbcoNDXaGiPIpp!"
}

def print_section(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")

def analyze_time_records():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print_section("🔍 ANÁLISE DE REGISTROS DE PONTO - DEBUG")
        
        # 1. Encontrar registro recente do funcionário matricula 01005
        print_section("1. Buscando registro mais recente (matricula 01005)")
        cur.execute("""
            SELECT 
              tr.id as time_record_id,
              tr.employee_id,
              tr.data_registro,
              tr.created_at,
              e.nome as employee_nome,
              e.matricula,
              tr.entrada,
              tr.saida,
              tr.entrada_almoco,
              tr.saida_almoco
            FROM rh.time_records tr
            JOIN rh.employees e ON e.id = tr.employee_id
            WHERE e.matricula = '01005'
            ORDER BY tr.data_registro DESC, tr.created_at DESC
            LIMIT 1
        """)
        
        record = cur.fetchone()
        if not record:
            print("❌ Nenhum registro encontrado para matricula 01005")
            return
        
        print(f"✅ Registro encontrado:")
        print(f"   ID: {record['time_record_id']}")
        print(f"   Funcionário: {record['employee_nome']} ({record['matricula']})")
        print(f"   Data: {record['data_registro']}")
        print(f"   Criado em: {record['created_at']}")
        print(f"   Horários: Entrada={record['entrada']}, Saída={record['saida']}")
        
        time_record_id = record['time_record_id']
        
        # 2. Verificar eventos
        print_section("2. Verificando TODOS os eventos deste registro")
        cur.execute("""
            SELECT 
              ee.id as event_id,
              ee.event_type,
              ee.event_at,
              ee.latitude,
              ee.longitude,
              ee.endereco,
              ee.source,
              ee.created_at as event_created_at
            FROM rh.time_record_events ee
            WHERE ee.time_record_id = %s
            ORDER BY ee.event_at ASC
        """, (time_record_id,))
        
        events = cur.fetchall()
        print(f"✅ Total de eventos encontrados: {len(events)}")
        for i, event in enumerate(events, 1):
            print(f"\n   Evento {i}:")
            print(f"     ID: {event['event_id']}")
            print(f"     Tipo: {event['event_type']}")
            print(f"     Data/Hora: {event['event_at']}")
            print(f"     Latitude: {event['latitude']}")
            print(f"     Longitude: {event['longitude']}")
            print(f"     Endereço: {event['endereco'][:100] if event['endereco'] else 'N/A'}...")
            print(f"     Source: {event['source']}")
        
        # 3. Verificar fotos
        print_section("3. Verificando TODAS as fotos dos eventos")
        cur.execute("""
            SELECT 
              ee.id as event_id,
              ee.event_type,
              ee.event_at,
              p.id as photo_id,
              p.photo_url,
              p.created_at as photo_created_at
            FROM rh.time_record_events ee
            LEFT JOIN rh.time_record_event_photos p ON p.event_id = ee.id
            WHERE ee.time_record_id = %s
            ORDER BY ee.event_at ASC, p.created_at ASC
        """, (time_record_id,))
        
        photos = cur.fetchall()
        print(f"✅ Total de fotos encontradas: {len([p for p in photos if p['photo_id']])}")
        
        photos_by_event = {}
        for photo in photos:
            event_id = photo['event_id']
            if event_id not in photos_by_event:
                photos_by_event[event_id] = {
                    'event_type': photo['event_type'],
                    'event_at': photo['event_at'],
                    'photos': []
                }
            if photo['photo_id']:
                photos_by_event[event_id]['photos'].append({
                    'photo_id': photo['photo_id'],
                    'photo_url': photo['photo_url'],
                    'created_at': photo['photo_created_at']
                })
        
        for event_id, data in photos_by_event.items():
            print(f"\n   Evento {data['event_type']} ({data['event_at']}):")
            print(f"     Total de fotos: {len(data['photos'])}")
            for i, photo in enumerate(data['photos'], 1):
                print(f"       Foto {i}:")
                print(f"         ID: {photo['photo_id']}")
                print(f"         URL: {photo['photo_url'][:100]}...")
                print(f"         Criada em: {photo['created_at']}")
        
        # 4. Verificar o que a RPC retorna
        print_section("4. Verificando retorno da função RPC get_time_records_simple")
        
        # Pegar company_id do registro
        cur.execute("SELECT company_id FROM rh.time_records WHERE id = %s", (time_record_id,))
        company_id_result = cur.fetchone()
        if not company_id_result:
            print("❌ Não foi possível encontrar company_id")
            return
        
        company_id = company_id_result['company_id']
        print(f"   Company ID: {company_id}")
        
        # Chamar RPC
        cur.execute("""
            SELECT * FROM public.get_time_records_simple(%s)
            WHERE id = %s
        """, (company_id, time_record_id))
        
        rpc_result = cur.fetchone()
        if not rpc_result:
            print("❌ RPC não retornou dados")
            return
        
        print(f"\n✅ Dados retornados pela RPC:")
        print(f"   ID: {rpc_result['id']}")
        print(f"   Funcionário: {rpc_result['employee_nome']} ({rpc_result['employee_matricula']})")
        print(f"   Events count: {rpc_result['events_count']}")
        
        # Analisar all_photos
        all_photos = rpc_result.get('all_photos')
        if isinstance(all_photos, str):
            try:
                all_photos = json.loads(all_photos)
            except:
                pass
        
        print(f"\n   📸 ALL_PHOTOS:")
        if isinstance(all_photos, list):
            print(f"      Tipo: Array")
            print(f"      Total: {len(all_photos)}")
            for i, photo in enumerate(all_photos, 1):
                print(f"\n      Foto {i}:")
                print(f"         ID: {photo.get('id', 'N/A')}")
                print(f"         Event Type: {photo.get('event_type', 'N/A')}")
                print(f"         Event At: {photo.get('event_at', 'N/A')}")
                print(f"         Photo URL: {photo.get('photo_url', 'N/A')[:100]}...")
        elif all_photos:
            print(f"      Tipo: {type(all_photos).__name__}")
            print(f"      Valor: {all_photos}")
        else:
            print(f"      ❌ VAZIO ou NULL")
        
        # Analisar all_locations
        all_locations = rpc_result.get('all_locations')
        if isinstance(all_locations, str):
            try:
                all_locations = json.loads(all_locations)
            except:
                pass
        
        print(f"\n   📍 ALL_LOCATIONS:")
        if isinstance(all_locations, list):
            print(f"      Tipo: Array")
            print(f"      Total: {len(all_locations)}")
            for i, loc in enumerate(all_locations, 1):
                print(f"\n      Localização {i}:")
                print(f"         ID: {loc.get('id', 'N/A')}")
                print(f"         Event Type: {loc.get('event_type', 'N/A')}")
                print(f"         Event At: {loc.get('event_at', 'N/A')}")
                print(f"         Latitude: {loc.get('latitude', 'N/A')}")
                print(f"         Longitude: {loc.get('longitude', 'N/A')}")
                print(f"         Endereço: {loc.get('endereco', 'N/A')[:100] if loc.get('endereco') else 'N/A'}...")
        elif all_locations:
            print(f"      Tipo: {type(all_locations).__name__}")
            print(f"      Valor: {all_locations}")
        else:
            print(f"      ❌ VAZIO ou NULL")
        
        # 5. Comparação
        print_section("5. COMPARAÇÃO: Dados diretos vs RPC")
        print(f"\n   Dados diretos do banco:")
        print(f"     Eventos: {len(events)}")
        print(f"     Fotos: {len([p for p in photos if p['photo_id']])}")
        print(f"     Localizações com dados: {len([e for e in events if e['latitude'] or e['longitude'] or e['endereco']])}")
        
        print(f"\n   Dados retornados pela RPC:")
        print(f"     Events count: {rpc_result['events_count']}")
        print(f"     All photos count: {len(all_photos) if isinstance(all_photos, list) else 0}")
        print(f"     All locations count: {len(all_locations) if isinstance(all_locations, list) else 0}")
        
        cur.close()
        conn.close()
        
        print_section("✅ ANÁLISE CONCLUÍDA")
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_time_records()

