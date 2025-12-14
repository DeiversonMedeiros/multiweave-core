// =====================================================
// HOOK: USAR CÁLCULO TRIBUTÁRIO
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para integrar TaxCalculationEngine com formulários
// Autor: Sistema MultiWeave Core
// Módulo: M5 - Motor Tributário

import { useState } from 'react';
import { useCompany } from '@/lib/company-context';
import { taxCalculationEngine, TaxCalculationParams, TaxCalculationResult } from '@/services/tributario/taxCalculationEngine';
import { toast } from 'sonner';

interface UseTaxCalculationReturn {
  calcularTributos: (params: TaxCalculationParams) => Promise<TaxCalculationResult | null>;
  calcularTributosNFSe: (params: {
    valorServico: number;
    municipioCodigoIBGE?: string;
    dataOperacao: string;
    valorDeducoes?: number;
    tipoDeducao?: 'presumida' | 'real';
  }) => Promise<TaxCalculationResult | null>;
  calcularTributosNFe: (params: {
    valorMercadoria: number;
    uf?: string;
    ncm?: string;
    dataOperacao: string;
    cst?: string;
    cfop?: string;
    tipoOperacao?: 'venda' | 'compra';
  }) => Promise<TaxCalculationResult | null>;
  loading: boolean;
  error: string | null;
}

export function useTaxCalculation(): UseTaxCalculationReturn {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcularTributos = async (params: TaxCalculationParams): Promise<TaxCalculationResult | null> => {
    if (!selectedCompany?.id) {
      toast.error('Empresa não selecionada');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await taxCalculationEngine.calcularTributos({
        ...params,
        companyId: selectedCompany.id,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular tributos';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao calcular tributos:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calcularTributosNFSe = async (params: {
    valorServico: number;
    municipioCodigoIBGE?: string;
    dataOperacao: string;
    valorDeducoes?: number;
    tipoDeducao?: 'presumida' | 'real';
  }): Promise<TaxCalculationResult | null> => {
    if (!selectedCompany?.id) {
      toast.error('Empresa não selecionada');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await taxCalculationEngine.calcularTributos({
        companyId: selectedCompany.id,
        tipoOperacao: 'venda',
        tipoDocumento: 'nfse',
        valorServico: params.valorServico,
        valorTotal: params.valorServico,
        municipioCodigoIBGE: params.municipioCodigoIBGE,
        dataOperacao: params.dataOperacao,
        valorDeducoes: params.valorDeducoes,
        tipoDeducao: params.tipoDeducao,
        regimePisCofins: 'nao_cumulativo', // Padrão para serviços
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular tributos NFSe';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao calcular tributos NFSe:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calcularTributosNFe = async (params: {
    valorMercadoria: number;
    uf?: string;
    ncm?: string;
    dataOperacao: string;
    cst?: string;
    cfop?: string;
    tipoOperacao?: 'venda' | 'compra';
  }): Promise<TaxCalculationResult | null> => {
    if (!selectedCompany?.id) {
      toast.error('Empresa não selecionada');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await taxCalculationEngine.calcularTributos({
        companyId: selectedCompany.id,
        tipoOperacao: params.tipoOperacao || 'venda',
        tipoDocumento: 'nfe',
        valorMercadoria: params.valorMercadoria,
        valorTotal: params.valorMercadoria,
        uf: params.uf,
        ncm: params.ncm,
        dataOperacao: params.dataOperacao,
        cst: params.cst,
        cfop: params.cfop,
        regimePisCofins: 'nao_cumulativo', // Padrão para produtos
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular tributos NFe';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao calcular tributos NFe:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    calcularTributos,
    calcularTributosNFSe,
    calcularTributosNFe,
    loading,
    error,
  };
}

