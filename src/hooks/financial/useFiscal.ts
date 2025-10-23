// =====================================================
// HOOK: USAR MÓDULO FISCAL
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar módulo fiscal e integração SEFAZ
// Autor: Sistema MultiWeave Core

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuthorization } from '@/hooks/useAuthorization';
import { NFe, NFSe, SefazStatus, EventoFiscal } from '@/integrations/supabase/financial-types';

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
  const { checkModulePermission, checkEntityPermission } = useAuthorization();
  
  const [nfes, setNfes] = useState<NFe[]>([]);
  const [nfses, setNfses] = useState<NFSe[]>([]);
  const [sefazStatus, setSefazStatus] = useState<SefazStatus[]>([]);
  const [eventos, setEventos] = useState<EventoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar permissões
  const canCreate = checkModulePermission('financeiro', 'create') && checkEntityPermission('nfe', 'create');
  const canEdit = checkModulePermission('financeiro', 'edit') && checkEntityPermission('nfe', 'edit');
  const canDelete = checkModulePermission('financeiro', 'delete') && checkEntityPermission('nfe', 'delete');
  const canEmit = checkModulePermission('financeiro', 'edit') && checkEntityPermission('nfe', 'edit');

  // Carregar dados fiscais
  const loadFiscal = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Dados mockados temporariamente até implementar a API
      const mockNfes: NFe[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          numero_nfe: '000001',
          serie: '1',
          data_emissao: '2025-01-15',
          data_saida: '2025-01-15',
          valor_total: 1500.00,
          valor_icms: 270.00,
          valor_ipi: 0,
          valor_pis: 24.75,
          valor_cofins: 114.00,
          status_sefaz: 'autorizada',
          chave_acesso: '12345678901234567890123456789012345678901234',
          xml_nfe: '<xml>...</xml>',
          danfe_url: 'https://example.com/danfe.pdf',
          observacoes: 'NF-e de venda',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockNfses: NFSe[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          numero_nfse: '000001',
          codigo_verificacao: 'ABC123',
          data_emissao: '2025-01-15',
          data_competencia: '2025-01-15',
          valor_servico: 2000.00,
          valor_deducoes: 0,
          valor_pis: 33.00,
          valor_cofins: 152.00,
          valor_inss: 0,
          valor_ir: 0,
          valor_csll: 0,
          valor_iss: 100.00,
          valor_liquido: 1715.00,
          status_sefaz: 'autorizada',
          xml_nfse: '<xml>...</xml>',
          danfse_url: 'https://example.com/danfse.pdf',
          observacoes: 'NFS-e de serviços',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSefazStatus: SefazStatus[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          uf: 'SP',
          servico: 'NFeAutorizacao4',
          status: 'online',
          ultima_verificacao: new Date().toISOString(),
          tempo_resposta: 150,
          observacoes: 'Serviço funcionando normalmente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockEventos: EventoFiscal[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          tipo_evento: 'emissao',
          documento_tipo: 'nfe',
          documento_id: '1',
          chave_acesso: '12345678901234567890123456789012345678901234',
          numero_protocolo: '123456789012345',
          data_evento: '2025-01-15T10:30:00Z',
          status: 'processado',
          xml_evento: '<xml>...</xml>',
          observacoes: 'Emissão realizada com sucesso',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNfes(mockNfes);
      setNfses(mockNfses);
      setSefazStatus(mockSefazStatus);
      setEventos(mockEventos);

      // TODO: Implementar API real
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Criar NFe
  const createNFe = async (data: Partial<NFe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar NFe');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Atualizar NFe
  const updateNFe = async (id: string, data: Partial<NFe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/nfes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar NFe');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Deletar NFe
  const deleteNFe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/nfes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar NFe');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Criar NFS-e
  const createNFSe = async (data: Partial<NFSe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar NFS-e');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Atualizar NFS-e
  const updateNFSe = async (id: string, data: Partial<NFSe>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/nfses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar NFS-e');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Deletar NFS-e
  const deleteNFSe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/nfses/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar NFS-e');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Emitir NFe
  const emitirNFe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfes/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          nfe_id: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao emitir NFe');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Emitir NFS-e
  const emitirNFSe = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfses/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          nfse_id: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao emitir NFS-e');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Consultar status SEFAZ
  const consultarStatusSefaz = async (uf: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/sefaz-status/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          uf: uf,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao consultar status SEFAZ');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Cancelar NFe
  const cancelarNFe = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfes/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          nfe_id: id,
          motivo: motivo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao cancelar NFe');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Cancelar NFS-e
  const cancelarNFSe = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfses/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          nfse_id: id,
          motivo: motivo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao cancelar NFS-e');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
  };

  // Inutilizar NFe
  const inutilizarNFe = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/nfes/inutilizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          nfe_id: id,
          motivo: motivo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao inutilizar NFe');
      }

      await loadFiscal();
    } catch (err) {
      throw err;
    }
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
    await loadFiscal();
  };

  // Carregar dados quando a empresa mudar
  useEffect(() => {
    loadFiscal();
  }, [selectedCompany?.id]);

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
