// =====================================================
// HOOK: USAR MÓDULO FISCAL
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar módulo fiscal e integração SEFAZ
// Autor: Sistema MultiWeave Core

import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { NFe, NFSe, SefazStatus, EventoFiscal } from '@/integrations/supabase/financial-types';
import { useFinanceiroData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EntityService } from '@/services/generic/entityService';

interface UseFiscalReturn {
  nfes: NFe[];
  nfses: NFSe[];
  sefazStatus: SefazStatus[];
  eventos: EventoFiscal[];
  loading: boolean;
  error: string | null;
  createNFe: (data: Partial<NFe>) => Promise<void>;
  updateNFe: (id: string, data: Partial<NFe>) => Promise<void>;
  deleteNFe: (id: string) => Promise<void>;
  createNFSe: (data: Partial<NFSe>) => Promise<void>;
  updateNFSe: (id: string, data: Partial<NFSe>) => Promise<void>;
  deleteNFSe: (id: string) => Promise<void>;
  emitirNFe: (id: string) => Promise<void>;
  emitirNFSe: (id: string) => Promise<void>;
  consultarStatusSefaz: (uf: string) => Promise<void>;
  cancelarNFe: (id: string, motivo: string) => Promise<void>;
  cancelarNFSe: (id: string, motivo: string) => Promise<void>;
  inutilizarNFe: (id: string, motivo: string) => Promise<void>;
  downloadXML: (id: string, tipo: 'nfe' | 'nfse') => Promise<void>;
  downloadDANFE: (id: string) => Promise<void>;
  uploadXML: (arquivo: File) => Promise<void>;
  processarRetorno: (arquivo: File) => Promise<void>;
  refresh: () => Promise<void>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canEmit: boolean;
}

export function useFiscal(): UseFiscalReturn {
  const { selectedCompany } = useCompany();
  const { canCreateModule, canEditModule, canDeleteModule, canCreatePage, canEditPage, canDeletePage } = usePermissions();

  const canCreate = canCreateModule('financeiro') && canCreatePage('/financeiro/fiscal*');
  const canEdit = canEditModule('financeiro') && canEditPage('/financeiro/fiscal*');
  const canDelete = canDeleteModule('financeiro') && canDeletePage('/financeiro/fiscal*');
  const canEmit = canEditModule('financeiro') && canEditPage('/financeiro/fiscal*');

  // Carregar dados usando EntityService
  const { data: nfesData, isLoading: loadingNfes, error: errorNfes } = useFinanceiroData<NFe>(
    'nfe',
    selectedCompany?.id || ''
  );
  const { data: nfsesData, isLoading: loadingNfses, error: errorNfses } = useFinanceiroData<NFSe>(
    'nfse',
    selectedCompany?.id || ''
  );
  const { data: sefazStatusData, isLoading: loadingSefaz, error: errorSefaz } = useFinanceiroData<SefazStatus>(
    'configuracao_fiscal',
    selectedCompany?.id || ''
  );
  // Nota: eventos fiscais podem estar em uma tabela separada ou serem calculados a partir das NFes/NFSe
  const { data: eventosData, isLoading: loadingEventos, error: errorEventos } = useFinanceiroData<EventoFiscal>(
    'nfe', // Usar nfe como base, eventos podem ser derivados
    selectedCompany?.id || ''
  );

  const nfes = nfesData || [];
  const nfses = nfsesData || [];
  const sefazStatus = sefazStatusData || [];
  const eventos = eventosData || [];
  const loading = loadingNfes || loadingNfses || loadingSefaz || loadingEventos;
  const error = errorNfes || errorNfses || errorSefaz || errorEventos 
    ? (errorNfes || errorNfses || errorSefaz || errorEventos) instanceof Error 
      ? (errorNfes || errorNfses || errorSefaz || errorEventos).message 
      : 'Erro desconhecido'
    : null;

  // Mutations
  const createNFeMutation = useCreateEntity<Partial<NFe>>('financeiro', 'nfe', selectedCompany?.id || '');
  const updateNFeMutation = useUpdateEntity<Partial<NFe>>('financeiro', 'nfe', selectedCompany?.id || '');
  const deleteNFeMutation = useDeleteEntity('financeiro', 'nfe', selectedCompany?.id || '');
  const createNFSeMutation = useCreateEntity<Partial<NFSe>>('financeiro', 'nfse', selectedCompany?.id || '');
  const updateNFSeMutation = useUpdateEntity<Partial<NFSe>>('financeiro', 'nfse', selectedCompany?.id || '');
  const deleteNFSeMutation = useDeleteEntity('financeiro', 'nfse', selectedCompany?.id || '');

  // Carregar dados fiscais (função de refresh)
  const loadFiscal = async () => {
    // Os dados são carregados automaticamente pelo hook useFinanceiroData
    return;
  };

  // Criar NFe
  const createNFe = async (data: Partial<NFe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await createNFeMutation.mutateAsync(data);
  };

  // Atualizar NFe
  const updateNFe = async (id: string, data: Partial<NFe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await updateNFeMutation.mutateAsync({ id, data });
  };

  // Deletar NFe
  const deleteNFe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await deleteNFeMutation.mutateAsync(id);
  };

  // Criar NFS-e
  const createNFSe = async (data: Partial<NFSe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await createNFSeMutation.mutateAsync(data);
  };

  // Atualizar NFS-e
  const updateNFSe = async (id: string, data: Partial<NFSe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await updateNFSeMutation.mutateAsync({ id, data });
  };

  // Deletar NFS-e
  const deleteNFSe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await deleteNFSeMutation.mutateAsync(id);
  };

  // Emitir NFe
  const emitirNFe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'nfe',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status_sefaz: 'autorizada',
        updated_at: new Date().toISOString()
      }
    });
  };

  // Emitir NFS-e
  const emitirNFSe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'nfse',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status_sefaz: 'autorizada',
        updated_at: new Date().toISOString()
      }
    });
  };

  // Consultar status SEFAZ
  const consultarStatusSefaz = async (uf: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Atualizar status SEFAZ na tabela de configuração fiscal
    // Nota: Esta função pode precisar chamar um RPC específico para consultar SEFAZ
    await EntityService.update({
      schema: 'financeiro',
      table: 'configuracao_fiscal',
      companyId: selectedCompany.id,
      id: '', // Precisa do ID da configuração
      data: {
        ultima_verificacao: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  };

  // Cancelar NFe
  const cancelarNFe = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'nfe',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status_sefaz: 'cancelada',
        observacoes: motivo,
        updated_at: new Date().toISOString()
      }
    });
  };

  // Cancelar NFS-e
  const cancelarNFSe = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'nfse',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status_sefaz: 'cancelada',
        observacoes: motivo,
        updated_at: new Date().toISOString()
      }
    });
  };

  // Inutilizar NFe
  const inutilizarNFe = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'nfe',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status_sefaz: 'inutilizada',
        observacoes: motivo,
        updated_at: new Date().toISOString()
      }
    });
  };

  // Download XML
  const downloadXML = async (id: string, tipo: 'nfe' | 'nfse') => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/${tipo}s/${id}/xml`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar XML');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo.toUpperCase()}_${id}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      throw err;
    }
  };

  // Download DANFE
  const downloadDANFE = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/nfes/${id}/danfe`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar DANFE');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DANFE_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      throw err;
    }
  };

  // Upload XML
  const uploadXML = async (arquivo: File) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('company_id', selectedCompany.id);

      const response = await fetch('/api/financial/xml/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do XML');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Processar retorno
  const processarRetorno = async (arquivo: File) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('company_id', selectedCompany.id);

      const response = await fetch('/api/financial/retorno/processar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao processar retorno');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Recarregar dados
  const refresh = async () => {
    // Os dados são recarregados automaticamente pelo React Query
    return;
  };

  return {
    nfes,
    nfses,
    sefazStatus,
    eventos,
    loading,
    error,
    createNFe,
    updateNFe,
    deleteNFe,
    createNFSe,
    updateNFSe,
    deleteNFSe,
    emitirNFe,
    emitirNFSe,
    consultarStatusSefaz,
    cancelarNFe,
    cancelarNFSe,
    inutilizarNFe,
    downloadXML,
    downloadDANFE,
    uploadXML,
    processarRetorno,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canEmit,
  };
}
