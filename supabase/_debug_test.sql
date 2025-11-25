SET client_min_messages = NOTICE;
SET search_path = public, rh, core, financeiro;

-- Test 1: employee_location_zones com IDs do log
SELECT public.create_entity_data(
  'rh',
  'employee_location_zones',
  'dc060329-50cd-4114-922f-624a6ab036d6'::uuid,
  '{"employee_id":"dbd51faf-c304-4f56-b405-467b48001f23","location_zone_id":"8206d64a-2d19-4f8d-8944-5cd733fa02e6"}'::jsonb
);

-- Test 2: outro location_zone_id do log
SELECT public.create_entity_data(
  'rh',
  'employee_location_zones',
  'dc060329-50cd-4114-922f-624a6ab036d6'::uuid,
  '{"employee_id":"dbd51faf-c304-4f56-b405-467b48001f23","location_zone_id":"cec3e95e-261e-400e-b898-8fefb7bcb367"}'::jsonb
);

-- Test 3: employees leitura para confirmar estado atual
SELECT * FROM public.get_entity_data('rh','employees','dc060329-50cd-4114-922f-624a6ab036d6', '{}');
