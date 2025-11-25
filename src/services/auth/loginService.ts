import { supabase } from '@/integrations/supabase/client';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export const loginService = {
  async resolveEmail(loginInput: string) {
    const trimmedValue = loginInput?.trim() ?? '';

    if (!trimmedValue) {
      return { error: 'Informe o e-mail ou nome de usuário' };
    }

    if (EMAIL_REGEX.test(trimmedValue)) {
      return { email: trimmedValue };
    }

    const { data, error } = await supabase.rpc('get_user_email_by_username', {
      p_username: trimmedValue,
    });

    if (error) {
      console.error('[loginService] Erro ao buscar username:', error);
      return { error: 'Erro ao buscar nome de usuário. Tente novamente.' };
    }

    if (!data) {
      return { error: 'Nome de usuário não encontrado' };
    }

    return { email: data };
  },
};

