import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface RelatorioEstoque {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  data_geracao: string;
  parametros: Record<string, any>;
  dados: any[];
  total_registros: number;
  usuario_geracao: string;
}

export interface KPIsEstoque {
  valor_total_estoque: number;
  total_materiais: number;
  itens_ruptura: number;
  giro_estoque: number;
  alertas_validade: number;
  transferencias_pendentes: number;
  inventarios_abertos: number;
  movimentacoes_mes: number;
}

export interface RelatorioMovimentacoes {
  periodo: string;
  entradas: {
    quantidade: number;
    valor: number;
    materiais: number;
  };
  saidas: {
    quantidade: number;
    valor: number;
    materiais: number;
  };
  transferencias: {
    quantidade: number;
    materiais: number;
  };
  ajustes: {
    quantidade: number;
    valor: number;
    materiais: number;
  };
}

export interface RelatorioABC {
  material_id: string;
  codigo_interno: string;
  descricao: string;
  valor_total: number;
  percentual_valor: number;
  percentual_acumulado: number;
  classificacao: 'A' | 'B' | 'C';
  quantidade_atual: number;
  giro_anual: number;
}

export interface RelatorioValidade {
  material_id: string;
  codigo_interno: string;
  descricao: string;
  quantidade_atual: number;
  data_validade?: string;
  dias_vencimento?: number;
  status: 'vencido' | 'vencendo' | 'ok';
  valor_total: number;
}

export const useRelatoriosEstoque = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const gerarRelatorioMovimentacoes = async (filters: {
    data_inicio: string;
    data_fim: string;
    almoxarifado_id?: string;
    tipo_movimentacao?: string;
  }) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      setLoading(true);
      setError(null);

      // Definir o contexto da empresa para RLS      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });            let query = supabase
        .from('almoxarifado.movimentacoes_estoque')
        .select(`
          tipo_movimentacao,
          quantidade,
          valor_total,
          material_equipamento_id,
          data_movimentacao
        `)
        .eq('company_id', selectedCompany.id)
        .eq('status', 'confirmado')
        .gte('data_movimentacao', filters.data_inicio)
        .lte('data_movimentacao', filters.data_fim);

      if (filters.almoxarifado_id) {
        query = query.or(`almoxarifado_origem_id.eq.${filters.almoxarifado_id},almoxarifado_destino_id.eq.${filters.almoxarifado_id}`);
      }

      if (filters.tipo_movimentacao) {
        query = query.eq('tipo_movimentacao', filters.tipo_movimentacao);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Processar dados para o relatório
      const relatorio: RelatorioMovimentacoes = {
        periodo: `${filters.data_inicio} a ${filters.data_fim}`,
        entradas: {
          quantidade: 0,
          valor: 0,
          materiais: 0
        },
        saidas: {
          quantidade: 0,
          valor: 0,
          materiais: 0
        },
        transferencias: {
          quantidade: 0,
          materiais: 0
        },
        ajustes: {
          quantidade: 0,
          valor: 0,
          materiais: 0
        }
      };

      const materiaisUnicos = new Set();

      data?.forEach(mov => {
        materiaisUnicos.add(mov.material_equipamento_id);

        switch (mov.tipo_movimentacao) {
          case 'entrada':
            relatorio.entradas.quantidade += mov.quantidade;
            relatorio.entradas.valor += mov.valor_total || 0;
            break;
          case 'saida':
            relatorio.saidas.quantidade += Math.abs(mov.quantidade);
            relatorio.saidas.valor += mov.valor_total || 0;
            break;
          case 'transferencia':
            relatorio.transferencias.quantidade += Math.abs(mov.quantidade);
            break;
          case 'ajuste':
            relatorio.ajustes.quantidade += mov.quantidade;
            relatorio.ajustes.valor += mov.valor_total || 0;
            break;
        }
      });

      relatorio.entradas.materiais = data?.filter(m => m.tipo_movimentacao === 'entrada').length || 0;
      relatorio.saidas.materiais = data?.filter(m => m.tipo_movimentacao === 'saida').length || 0;
      relatorio.transferencias.materiais = data?.filter(m => m.tipo_movimentacao === 'transferencia').length || 0;
      relatorio.ajustes.materiais = data?.filter(m => m.tipo_movimentacao === 'ajuste').length || 0;

      return relatorio;
    } catch (err) {
      console.error('Erro ao gerar relatório de movimentações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorioABC = async (almoxarifado_id?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      setLoading(true);
      setError(null);

      // Buscar materiais com estoque atual
      // Definir o contexto da empresa para RLS      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });            let query = supabase
        .from('almoxarifado.materiais_equipamentos')
        .select(`
          id,
          codigo_interno,
          descricao,
          valor_unitario,
          estoque_atual:estoque_atual(quantidade_atual, valor_total)
        `)
        .eq('company_id', selectedCompany.id)
        .eq('status', 'ativo');

      if (almoxarifado_id) {
        query = query.eq('almoxarifado_id', almoxarifado_id);
      }

      const { data: materiais, error: materiaisError } = await query;

      if (materiaisError) throw materiaisError;

      // Calcular valores totais e classificação ABC
      const relatorioABC: RelatorioABC[] = materiais?.map(material => {
        const estoque = material.estoque_atual?.[0];
        const valorTotal = estoque?.valor_total || (material.valor_unitario * (estoque?.quantidade_atual || 0));
        
        return {
          material_id: material.id,
          codigo_interno: material.codigo_interno,
          descricao: material.descricao,
          valor_total: valorTotal,
          percentual_valor: 0, // Será calculado abaixo
          percentual_acumulado: 0, // Será calculado abaixo
          classificacao: 'C' as const, // Será calculado abaixo
          quantidade_atual: estoque?.quantidade_atual || 0,
          giro_anual: 0 // TODO: Implementar cálculo de giro anual
        };
      }) || [];

      // Ordenar por valor total decrescente
      relatorioABC.sort((a, b) => b.valor_total - a.valor_total);

      // Calcular percentuais
      const valorTotalGeral = relatorioABC.reduce((sum, item) => sum + item.valor_total, 0);
      
      relatorioABC.forEach((item, index) => {
        item.percentual_valor = valorTotalGeral > 0 ? (item.valor_total / valorTotalGeral) * 100 : 0;
        item.percentual_acumulado = index === 0 
          ? item.percentual_valor 
          : relatorioABC[index - 1].percentual_acumulado + item.percentual_valor;
        
        // Classificação ABC
        if (item.percentual_acumulado <= 80) {
          item.classificacao = 'A';
        } else if (item.percentual_acumulado <= 95) {
          item.classificacao = 'B';
        } else {
          item.classificacao = 'C';
        }
      });

      return relatorioABC;
    } catch (err) {
      console.error('Erro ao gerar relatório ABC:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorioValidade = async (dias_antecedencia: number = 30) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      setLoading(true);
      setError(null);

      // Buscar materiais com validade
      const { data: materiais, error: materiaisError } = await supabase
        .from('almoxarifado.materiais_equipamentos')
        .select(`
          id,
          codigo_interno,
          descricao,
          validade_dias,
          valor_unitario,
          estoque_atual:estoque_atual(quantidade_atual, valor_total)
        `)
        .eq('company_id', selectedCompany.id)
        .eq('status', 'ativo')
        .not('validade_dias', 'is', null)
        .gt('validade_dias', 0);

      if (materiaisError) throw materiaisError;

      const dataAtual = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(dataAtual.getDate() + dias_antecedencia);

      const relatorioValidade: RelatorioValidade[] = materiais?.map(material => {
        const estoque = material.estoque_atual?.[0];
        const quantidadeAtual = estoque?.quantidade_atual || 0;
        const valorTotal = estoque?.valor_total || (material.valor_unitario * quantidadeAtual);
        
        // Simular data de validade baseada na data de entrada mais recente
        // Em um sistema real, isso viria de lotes específicos
        const dataValidade = new Date();
        dataValidade.setDate(dataAtual.getDate() + (material.validade_dias || 0));
        
        const diasVencimento = Math.ceil((dataValidade.getTime() - dataAtual.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'vencido' | 'vencendo' | 'ok' = 'ok';
        if (diasVencimento < 0) {
          status = 'vencido';
        } else if (diasVencimento <= dias_antecedencia) {
          status = 'vencendo';
        }

        return {
          material_id: material.id,
          codigo_interno: material.codigo_interno,
          descricao: material.descricao,
          quantidade_atual: quantidadeAtual,
          data_validade: dataValidade.toISOString().split('T')[0],
          dias_vencimento: diasVencimento,
          status,
          valor_total: valorTotal
        };
      }) || [];

      return relatorioValidade;
    } catch (err) {
      console.error('Erro ao gerar relatório de validade:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const gerarKPIsEstoque = async (): Promise<KPIsEstoque> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      setLoading(true);
      setError(null);

      // Buscar dados do estoque
      const { data: estoque, error: estoqueError } = await supabase
        .from('almoxarifado.estoque_atual')
        .select(`
          quantidade_atual,
          valor_total,
          material_equipamento_id,
          material:materiais_equipamentos!material_equipamento_id(
            estoque_minimo,
            validade_dias
          )
        `)
        .eq('company_id', selectedCompany.id);

      if (estoqueError) throw estoqueError;

      // Calcular KPIs
      const valorTotalEstoque = estoque?.reduce((sum, item) => sum + (item.valor_total || 0), 0) || 0;
      const totalMateriais = estoque?.length || 0;
      const itensRuptura = estoque?.filter(item => 
        item.quantidade_atual <= (item.material?.estoque_minimo || 0)
      ).length || 0;

      // Calcular giro de estoque (simplificado)
      const giroEstoque = 0; // TODO: Implementar cálculo real de giro

      // Calcular alertas de validade
      const dataAtual = new Date();
      const alertasValidade = estoque?.filter(item => {
        const validadeDias = item.material?.validade_dias;
        if (!validadeDias) return false;
        
        // Simular verificação de validade
        return Math.random() > 0.8; // 20% de chance de estar próximo do vencimento
      }).length || 0;

      // Buscar transferências pendentes
      const { data: transferencias, error: transferenciasError } = await supabase
        .from('almoxarifado.transferencias')
        .select('id')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'pendente');

      if (transferenciasError) throw transferenciasError;

      // Buscar inventários abertos
      const { data: inventarios, error: inventariosError } = await supabase
        .from('almoxarifado.inventarios')
        .select('id')
        .eq('company_id', selectedCompany.id)
        .in('status', ['aberto', 'em_andamento']);

      if (inventariosError) throw inventariosError;

      // Buscar movimentações do mês
      const dataInicioMes = new Date();
      dataInicioMes.setDate(1);
      dataInicioMes.setHours(0, 0, 0, 0);

      const { data: movimentacoes, error: movimentacoesError } = await supabase
        .from('almoxarifado.movimentacoes_estoque')
        .select('id')
        .eq('company_id', selectedCompany.id)
        .gte('data_movimentacao', dataInicioMes.toISOString());

      if (movimentacoesError) throw movimentacoesError;

      return {
        valor_total_estoque: valorTotalEstoque,
        total_materiais: totalMateriais,
        itens_ruptura: itensRuptura,
        giro_estoque: giroEstoque,
        alertas_validade: alertasValidade,
        transferencias_pendentes: transferencias?.length || 0,
        inventarios_abertos: inventarios?.length || 0,
        movimentacoes_mes: movimentacoes?.length || 0
      };
    } catch (err) {
      console.error('Erro ao gerar KPIs:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = async (relatorio: any, formato: 'excel' | 'csv' | 'pdf') => {
    // TODO: Implementar exportação real
    console.log('Exportando relatório:', relatorio, 'Formato:', formato);
    throw new Error('Funcionalidade de exportação em desenvolvimento');
  };

  return {
    loading,
    error,
    gerarRelatorioMovimentacoes,
    gerarRelatorioABC,
    gerarRelatorioValidade,
    gerarKPIsEstoque,
    exportarRelatorio
  };
};

