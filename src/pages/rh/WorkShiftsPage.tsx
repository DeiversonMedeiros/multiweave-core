import React from 'react';
import { WorkShiftManagement } from '@/components/rh/WorkShiftManagement';
import { useWorkShifts, useWorkShiftMutations } from '@/hooks/rh/useWorkShifts';
import { useEmployeeShifts, useCreateEmployeeShift, useUpdateEmployeeShift, useDeleteEmployeeShift } from '@/hooks/rh/useEmployeeShifts';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { WorkShift } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function WorkShiftsPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();

  // Hooks
  const { workShifts, isLoading, error, refetch } = useWorkShifts(selectedCompany?.id || '');
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = useWorkShiftMutations(selectedCompany?.id || '');
  const { data: employeeShifts = [], isLoading: isLoadingEmployeeShifts, refetch: refetchEmployeeShifts } = useEmployeeShifts();
  
  // Hooks para atribuições de turnos
  const createEmployeeShiftMutation = useCreateEmployeeShift();
  const updateEmployeeShiftMutation = useUpdateEmployeeShift();
  const deleteEmployeeShiftMutation = useDeleteEmployeeShift();
  
  // Hook para buscar funcionários reais
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];

  // Handlers
  const handleWorkShiftCreate = async (data: any) => {
    console.log('🔍 [DEBUG] WorkShiftsPage - handleWorkShiftCreate chamado');
    console.log('🔍 [DEBUG] WorkShiftsPage - data recebido:', data);
    console.log('🔍 [DEBUG] WorkShiftsPage - selectedCompany?.id:', selectedCompany?.id);
    
    const dataWithCompany = { ...data, company_id: selectedCompany?.id };
    console.log('🔍 [DEBUG] WorkShiftsPage - dataWithCompany:', dataWithCompany);
    
    try {
      await createMutation(dataWithCompany);
      refetch();
    } catch (error) {
      console.error('Erro ao criar turno:', error);
    }
  };

  const handleWorkShiftEdit = async (id: string, data: any) => {
    try {
      // Garantir que id não está no data e limpar campos desnecessários
      const { id: _, company_id: __, created_at: ___, updated_at: ____, ...cleanData } = data;
      console.log('🔍 [DEBUG] WorkShiftsPage - handleWorkShiftEdit - cleanData:', cleanData);
      await updateMutation({ id, data: cleanData });
      refetch();
    } catch (error) {
      console.error('Erro ao editar turno:', error);
    }
  };

  const handleWorkShiftDelete = async (id: string) => {
    try {
      await deleteMutation(id);
      refetch();
    } catch (error) {
      console.error('Erro ao excluir turno:', error);
    }
  };

  const handleEmployeeShiftCreate = async (data: any) => {
    console.log('🔍 [DEBUG] WorkShiftsPage - handleEmployeeShiftCreate chamado');
    console.log('🔍 [DEBUG] WorkShiftsPage - data recebido:', data);
    console.log('🔍 [DEBUG] WorkShiftsPage - selectedCompany?.id:', selectedCompany?.id);
    
    try {
      // Limpar campos vazios que podem causar erro no PostgreSQL
      const cleanedData = {
        ...data,
        data_fim: data.data_fim && data.data_fim.trim() !== '' ? data.data_fim : null,
        observacoes: data.observacoes && data.observacoes.trim() !== '' ? data.observacoes : null
      };
      
      console.log('🔍 [DEBUG] WorkShiftsPage - data original:', data);
      console.log('🔍 [DEBUG] WorkShiftsPage - cleanedData:', cleanedData);
      
      const dataWithCompany = { ...cleanedData, company_id: selectedCompany?.id };
      console.log('🔍 [DEBUG] WorkShiftsPage - dataWithCompany:', dataWithCompany);
      
      await createEmployeeShiftMutation.mutateAsync(dataWithCompany);
      refetchEmployeeShifts();
      console.log('✅ Atribuição de turno criada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar atribuição de turno:', error);
    }
  };

  const handleEmployeeShiftEdit = async (id: string, data: any) => {
    console.log('🔍 [DEBUG] WorkShiftsPage - handleEmployeeShiftEdit chamado');
    console.log('🔍 [DEBUG] WorkShiftsPage - id:', id, 'data:', data);
    
    try {
      // Limpar campos vazios que podem causar erro no PostgreSQL
      const cleanedData = {
        ...data,
        data_fim: data.data_fim && data.data_fim.trim() !== '' ? data.data_fim : null,
        observacoes: data.observacoes && data.observacoes.trim() !== '' ? data.observacoes : null
      };
      
      await updateEmployeeShiftMutation.mutateAsync({ id, data: cleanedData });
      refetchEmployeeShifts();
      console.log('✅ Atribuição de turno atualizada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar atribuição de turno:', error);
    }
  };

  const handleEmployeeShiftDelete = async (id: string) => {
    console.log('🔍 [DEBUG] WorkShiftsPage - handleEmployeeShiftDelete chamado');
    console.log('🔍 [DEBUG] WorkShiftsPage - id:', id);
    
    try {
      await deleteEmployeeShiftMutation.mutateAsync(id);
      refetchEmployeeShifts();
      console.log('✅ Atribuição de turno excluída com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir atribuição de turno:', error);
    }
  };

  return (
    <RequirePage pagePath="/rh/work-shifts*" action="read">
      <WorkShiftManagement
      workShifts={workShifts}
      employeeShifts={employeeShifts}
      employees={employees}
      onWorkShiftCreate={handleWorkShiftCreate}
      onWorkShiftEdit={handleWorkShiftEdit}
      onWorkShiftDelete={handleWorkShiftDelete}
      onEmployeeShiftCreate={handleEmployeeShiftCreate}
      onEmployeeShiftEdit={handleEmployeeShiftEdit}
      onEmployeeShiftDelete={handleEmployeeShiftDelete}
      isLoading={isLoading || isLoadingEmployeeShifts || isLoadingEmployees}
    />
    </RequirePage>
  );
}

