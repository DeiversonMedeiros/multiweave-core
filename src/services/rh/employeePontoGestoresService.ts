// =====================================================
// SERVIÇO: Gestores de ponto por funcionário
// =====================================================
// Usuários que podem acompanhar o ponto deste funcionário
// em portal-gestor/acompanhamento/ponto
// Usa RPCs (schema rh não é exposto via REST no Supabase)

import { supabase } from '@/integrations/supabase/client';

export interface EmployeePontoGestor {
  id: string;
  employee_id: string;
  user_id: string;
  company_id: string;
  created_at: string;
}

export interface EmployeePontoGestorCreate {
  employee_id: string;
  user_id: string;
  company_id: string;
}

/**
 * Lista os gestores de ponto de um funcionário (via RPC)
 */
export async function getByEmployeeId(
  employeeId: string,
  companyId: string
): Promise<EmployeePontoGestor[]> {
  const { data, error } = await supabase.rpc('get_employee_ponto_gestores', {
    p_employee_id: employeeId,
    p_company_id: companyId,
  });

  if (error) throw error;
  return (data ?? []) as EmployeePontoGestor[];
}

/**
 * Retorna apenas os user_id (para uso no formulário)
 */
export async function getGestorUserIdsByEmployeeId(
  employeeId: string,
  companyId: string
): Promise<string[]> {
  const rows = await getByEmployeeId(employeeId, companyId);
  return rows.map((r) => r.user_id);
}

/**
 * Sincroniza gestores de ponto via RPC (substitui lista atual pela nova)
 */
export async function syncEmployeeGestores(
  employeeId: string,
  userIds: string[],
  companyId: string
): Promise<void> {
  const { error } = await supabase.rpc('sync_employee_ponto_gestores', {
    p_employee_id: employeeId,
    p_user_ids: userIds.filter((id) => id?.trim()),
    p_company_id: companyId,
  });

  if (error) throw error;
}
