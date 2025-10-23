import { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useCompany } from '../../lib/company-context';
import { EntityService } from '../../services/generic/entityService';

export interface EmployeeUser {
  id: string;
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  status: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  status_vinculo: 'Vinculado' | 'Não Vinculado';
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export const useEmployeeUser = () => {
  const { selectedCompany } = useCompany();
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = selectedCompany?.id;
  console.log('useEmployeeUser: Hook inicializado, selectedCompany:', selectedCompany);
  console.log('useEmployeeUser: companyId extraído:', companyId);

  // Buscar funcionários com status de vínculo
  const fetchEmployees = async () => {
    if (!companyId) {
      console.log('useEmployeeUser: companyId não disponível');
      return;
    }

    console.log('useEmployeeUser: Buscando funcionários para companyId:', companyId);
    setLoading(true);
    setError(null);

    try {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        select: 'id, nome, matricula, cpf, email, status, user_id, company_id, created_at, updated_at',
        orderBy: 'nome'
      });

      console.log('useEmployeeUser: Resultado da consulta:', result);

      if (result.error) throw result.error;
      const data = result.data;

      // Buscar dados dos usuários vinculados
      const userIds = data?.filter(emp => emp.user_id).map(emp => emp.user_id) || [];
      let usersData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, nome, email')
          .in('id', userIds);
        
        if (!usersError && users) {
          usersData = users;
        }
      }

      const employeesWithStatus = data?.map(emp => {
        const user = usersData.find(u => u.id === emp.user_id);
        return {
          ...emp,
          user_name: user?.nome || null,
          user_email: user?.email || null,
          status_vinculo: emp.user_id ? 'Vinculado' as const : 'Não Vinculado' as const
        };
      }) || [];

      console.log('useEmployeeUser: Funcionários processados:', employeesWithStatus);
      setEmployees(employeesWithStatus);
    } catch (err) {
      console.error('useEmployeeUser: Erro ao buscar funcionários:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar funcionários');
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários disponíveis para vínculo via user_companies
  const fetchAvailableUsers = async () => {
    if (!companyId) {
      console.log('useEmployeeUser: fetchAvailableUsers - companyId não disponível');
      return;
    }

    console.log('useEmployeeUser: Buscando usuários vinculados à empresa via user_companies:', companyId);

    try {
      // Buscar usuários vinculados à empresa ativa através de user_companies
      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          user_id,
          user:users!inner(
            id,
            nome,
            email,
            ativo
          )
        `)
        .eq('company_id', companyId)
        .eq('ativo', true)
        .eq('user.ativo', true);

      console.log('useEmployeeUser: Resultado da consulta de usuários via user_companies:', { data, error });

      if (error) throw error;
      
      // Extrair dados dos usuários do resultado e ordenar por nome
      const usersData = data?.map(item => ({
        id: item.user.id,
        nome: item.user.nome,
        email: item.user.email,
        ativo: item.user.ativo
      })).sort((a, b) => a.nome.localeCompare(b.nome)) || [];

      console.log('useEmployeeUser: Usuários processados:', usersData);
      
      if (usersData.length === 0) {
        console.log('useEmployeeUser: Nenhum usuário vinculado à empresa encontrado');
        setUsers([]);
      } else {
        setUsers(usersData);
      }
    } catch (err) {
      console.error('useEmployeeUser: Erro ao buscar usuários:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar usuários');
    }
  };

  // Vincular funcionário a usuário
  const linkEmployeeToUser = async (employeeId: string, userId: string) => {
    try {
      const result = await EntityService.update({
        schema: 'rh',
        table: 'employees',
        companyId: companyId!,
        id: employeeId,
        data: { user_id: userId }
      });

      if (result.error) throw result.error;

      await fetchEmployees();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao vincular funcionário';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Desvincular funcionário de usuário
  const unlinkEmployeeFromUser = async (employeeId: string) => {
    try {
      const result = await EntityService.update({
        schema: 'rh',
        table: 'employees',
        companyId: companyId!,
        id: employeeId,
        data: { user_id: null }
      });

      if (result.error) throw result.error;

      await fetchEmployees();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao desvincular funcionário';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Verificar se usuário já está vinculado a outro funcionário
  const isUserAlreadyLinked = (userId: string) => {
    const linkedEmployee = employees.find(emp => emp.user_id === userId);
    const isLinked = !!linkedEmployee;
    console.log('useEmployeeUser: isUserAlreadyLinked', { 
      userId, 
      isLinked, 
      linkedEmployee: linkedEmployee ? { id: linkedEmployee.id, nome: linkedEmployee.nome } : null,
      employees: employees.length 
    });
    return isLinked;
  };

  // Filtrar usuários disponíveis (não vinculados)
  const getAvailableUsers = () => {
    const available = users.filter(user => !isUserAlreadyLinked(user.id));
    console.log('useEmployeeUser: getAvailableUsers', { 
      totalUsers: users.length, 
      availableUsers: available.length,
      users: users.map(u => ({ id: u.id, nome: u.nome })),
      employees: employees.map(e => ({ id: e.id, nome: e.nome, user_id: e.user_id }))
    });
    return available;
  };

  useEffect(() => {
    console.log('useEmployeeUser: useEffect executado, companyId:', companyId);
    if (companyId) {
      console.log('useEmployeeUser: Executando fetchEmployees e fetchAvailableUsers');
      fetchEmployees();
      fetchAvailableUsers();
    } else {
      console.log('useEmployeeUser: companyId não disponível, não executando fetch');
    }
  }, [companyId]);

  return {
    employees,
    users,
    availableUsers: getAvailableUsers(),
    loading,
    error,
    fetchEmployees,
    fetchAvailableUsers,
    linkEmployeeToUser,
    unlinkEmployeeFromUser,
    isUserAlreadyLinked,
    clearError: () => setError(null)
  };
};
