SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'compras' AND table_name = 'requisicoes_compra'
ORDER BY ordinal_position;
