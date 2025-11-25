import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface Transferencia {
  id: string;
  company_id: string;
  almoxarifado_origem_id: string;
  almoxarifado_destino_id: string;
  solicitante_id: string;
  aprovador_id?: string;
  data_solicitacao: string;
  data_aprovacao?: string;
  data_transferencia?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'transferido';
  observacoes?: string;
  almoxarifado_origem?: {
    id: string;
    nome: string;
    codigo: string;
  };
  almoxarifado_destino?: {
    id: string;
    nome: string;
    codigo: string;
  };
  solicitante?: {
    id: string;
    nome: string;
    email: string;
  };
  aprovador?: {
    id: string;
    nome: string;
    email: string;
  };
  itens?: TransferenciaItem[];
}

export interface TransferenciaItem {
  id: string;
  transferencia_id: string;
  material_equipamento_id: string;
  quantidade_solicitada: number;
  quantidade_aprovada: number;
  centro_custo_id?: string;
  projeto_id?: string;
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
  };
  centro_custo?: {
    id: string;
    nome: string;
    codigo: string;
  };
  projeto?: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export interface CreateTransferenciaData {
  almoxarifado_origem_id: string;
  almoxarifado_destino_id: string;
  observacoes?: string;
  itens: Omit<TransferenciaItem, 'id' | 'transferencia_id'>[];
}

export const useTransferencias = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchTransferencias = async (filters?: {
    status?: string;
    solicitante_id?: string;
    almoxarifado_origem_id?: string;
    almoxarifado_destino_id?: string;
  }) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('almoxarifado.transferencias')
        .select(`
          *,
          almoxarifado_origem:almoxarifados!almoxarifado_origem_id(id, nome, codigo),
          almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, codigo),
          solicitante:users!solicitante_id(id, nome, email),
          aprovador:users!aprovador_id(id, nome, email),
          itens:transferencia_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
            projeto:projects!projeto_id(id, nome, codigo)
          )
        `)
        .eq('company_id', selectedCompany.id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.solicitante_id) {
        query = query.eq('solicitante_id', filters.solicitante_id);
      }

      if (filters?.almoxarifado_origem_id) {
        query = query.eq('almoxarifado_origem_id', filters.almoxarifado_origem_id);
      }

      if (filters?.almoxarifado_destino_id) {
        query = query.eq('almoxarifado_destino_id', filters.almoxarifado_destino_id);
      }

      const { data, error: fetchError } = await query.order('data_solicitacao', { ascending: false });

      if (fetchError) throw fetchError;

      setTransferencias(data || []);
    } catch (err) {
      console.error('Erro ao buscar transferências:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createTransferencia = async (data: CreateTransferenciaData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Obter ID do usuário atual (simulado)
      const usuarioId = 'current-user-id'; // TODO: Implementar obtenção do usuário atual

      // Criar transferência principal
      const { data: newTransferencia, error: transferenciaError } = await supabase
        .from('almoxarifado.transferencias')
        .insert([{
          ...data,
          company_id: selectedCompany.id,
          solicitante_id: usuarioId,
          status: 'pendente'
        }])
        .select()
        .single();

      if (transferenciaError) throw transferenciaError;

      // Criar itens da transferência
      if (data.itens && data.itens.length > 0) {
        const itensData = data.itens.map(item => ({
          ...item,
          transferencia_id: newTransferencia.id
        }));

        const { error: itensError } = await supabase
          .from('almoxarifado.transferencia_itens')
          .insert(itensData);

        if (itensError) throw itensError;
      }

      // Buscar transferência completa
      const { data: transferenciaCompleta, error: fetchError } = await supabase
        .from('almoxarifado.transferencias')
        .select(`
          *,
          almoxarifado_origem:almoxarifados!almoxarifado_origem_id(id, nome, codigo),
          almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, codigo),
          solicitante:users!solicitante_id(id, nome, email),
          aprovador:users!aprovador_id(id, nome, email),
          itens:transferencia_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
            projeto:projects!projeto_id(id, nome, codigo)
          )
        `)
        .eq('id', newTransferencia.id)
        .single();

      if (fetchError) throw fetchError;

      setTransferencias(prev => [transferenciaCompleta, ...prev]);
      return transferenciaCompleta;
    } catch (err) {
      console.error('Erro ao criar transferência:', err);
      throw err;
    }
  };

  const aprovarTransferencia = async (id: string, aprovadorId: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.transferencias')
        .update({
          status: 'aprovado',
          aprovador_id: aprovadorId,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setTransferencias(prev => 
        prev.map(transferencia => 
          transferencia.id === id 
            ? { 
                ...transferencia, 
                status: 'aprovado', 
                aprovador_id: aprovadorId,
                data_aprovacao: new Date().toISOString()
              } 
            : transferencia
        )
      );
    } catch (err) {
      console.error('Erro ao aprovar transferência:', err);
      throw err;
    }
  };

  const rejeitarTransferencia = async (id: string, motivo: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.transferencias')
        .update({
          status: 'rejeitado',
          observacoes: motivo
        })
        .eq('id', id);

      if (error) throw error;

      setTransferencias(prev => 
        prev.map(transferencia => 
          transferencia.id === id 
            ? { ...transferencia, status: 'rejeitado', observacoes: motivo } 
            : transferencia
        )
      );
    } catch (err) {
      console.error('Erro ao rejeitar transferência:', err);
      throw err;
    }
  };

  const executarTransferencia = async (id: string) => {
    try {
      // Buscar transferência com itens
      const { data: transferencia, error: fetchError } = await supabase
        .from('almoxarifado.transferencias')
        .select(`
          *,
          itens:transferencia_itens(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (transferencia.status !== 'aprovado') {
        throw new Error('Transferência deve estar aprovada para ser executada');
      }

      // Executar movimentações de estoque
      for (const item of transferencia.itens || []) {
        if (item.quantidade_aprovada > 0) {
          // Saída do almoxarifado origem
          await supabase
            .from('almoxarifado.movimentacoes_estoque')
            .insert([{
              company_id: selectedCompany?.id,
              material_equipamento_id: item.material_equipamento_id,
              almoxarifado_origem_id: transferencia.almoxarifado_origem_id,
              almoxarifado_destino_id: transferencia.almoxarifado_destino_id,
              tipo_movimentacao: 'transferencia',
              quantidade: -item.quantidade_aprovada,
              centro_custo_id: item.centro_custo_id,
              projeto_id: item.projeto_id,
              observacoes: `Transferência ${transferencia.id}`,
              usuario_id: 'current-user-id', // TODO: Implementar obtenção do usuário atual
              status: 'confirmado'
            }]);

          // Entrada no almoxarifado destino
          await supabase
            .from('almoxarifado.movimentacoes_estoque')
            .insert([{
              company_id: selectedCompany?.id,
              material_equipamento_id: item.material_equipamento_id,
              almoxarifado_origem_id: transferencia.almoxarifado_origem_id,
              almoxarifado_destino_id: transferencia.almoxarifado_destino_id,
              tipo_movimentacao: 'transferencia',
              quantidade: item.quantidade_aprovada,
              centro_custo_id: item.centro_custo_id,
              projeto_id: item.projeto_id,
              observacoes: `Transferência ${transferencia.id}`,
              usuario_id: 'current-user-id', // TODO: Implementar obtenção do usuário atual
              status: 'confirmado'
            }]);
        }
      }

      // Atualizar status da transferência
      const { error: updateError } = await supabase
        .from('almoxarifado.transferencias')
        .update({
          status: 'transferido',
          data_transferencia: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setTransferencias(prev => 
        prev.map(t => 
          t.id === id 
            ? { ...t, status: 'transferido', data_transferencia: new Date().toISOString() } 
            : t
        )
      );
    } catch (err) {
      console.error('Erro ao executar transferência:', err);
      throw err;
    }
  };

  const getTransferenciasPendentes = () => {
    return transferencias.filter(t => t.status === 'pendente');
  };

  const getTransferenciasAprovadas = () => {
    return transferencias.filter(t => t.status === 'aprovado');
  };

  useEffect(() => {
    fetchTransferencias();
  }, [selectedCompany?.id]);

  return {
    transferencias,
    loading,
    error,
    refetch: fetchTransferencias,
    createTransferencia,
    aprovarTransferencia,
    rejeitarTransferencia,
    executarTransferencia,
    getTransferenciasPendentes,
    getTransferenciasAprovadas
  };
};

