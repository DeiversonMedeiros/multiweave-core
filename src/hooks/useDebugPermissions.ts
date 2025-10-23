import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDebugPermissions() {
  const { user } = useAuth();

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('user_id', user.id)
        .eq('ativo', true)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id
  });

  const { data: modulePermissions } = useQuery({
    queryKey: ['module-permissions', userProfile?.profile_id],
    queryFn: async () => {
      if (!userProfile?.profile_id) return [];

      const { data, error } = await supabase
        .from('module_permissions')
        .select('*')
        .eq('profile_id', userProfile.profile_id);

      if (error) {
        console.error('Erro ao buscar permissões de módulo:', error);
        return [];
      }

      return data;
    },
    enabled: !!userProfile?.profile_id
  });

  return {
    user,
    userProfile,
    modulePermissions,
    isLoading
  };
}
