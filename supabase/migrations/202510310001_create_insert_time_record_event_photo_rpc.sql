-- =====================================================
-- RPC function to insert time_record_event_photos
-- This table doesn't have company_id, so we need a specific function
-- =====================================================

CREATE OR REPLACE FUNCTION public.insert_time_record_event_photo(
  p_event_id UUID,
  p_photo_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_event_company_id UUID;
BEGIN
  -- Verify that the event exists and user has access to it via company
  SELECT e.company_id INTO v_event_company_id
  FROM rh.time_record_events e
  WHERE e.id = p_event_id
    AND e.company_id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    );

  IF v_event_company_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;

  -- Insert photo and return as JSONB
  -- Usar o event_at do evento relacionado como created_at para manter timezone consistente
  WITH inserted AS (
    INSERT INTO rh.time_record_event_photos (event_id, photo_url, created_at)
    SELECT 
      p_event_id, 
      p_photo_url,
      e.event_at  -- Usar o event_at do evento relacionado como created_at
    FROM rh.time_record_events e
    WHERE e.id = p_event_id
    RETURNING *
  )
  SELECT row_to_json(inserted.*)::jsonb INTO v_result FROM inserted;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao inserir foto do evento: %', SQLERRM;
END;
$$;

