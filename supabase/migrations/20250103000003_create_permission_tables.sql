-- Create permission tables before functions that reference them

-- Module permissions table
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, module_name)
);

-- Entity permissions table
CREATE TABLE IF NOT EXISTS public.entity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, entity_name)
);

-- Enable RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_permissions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_module_permissions_profile_id ON public.module_permissions(profile_id);
CREATE INDEX idx_entity_permissions_profile_id ON public.entity_permissions(profile_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_module_permissions_updated_at BEFORE UPDATE ON public.module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_entity_permissions_updated_at BEFORE UPDATE ON public.entity_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
