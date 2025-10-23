import { useState, useEffect } from 'react';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

export interface LocalizacaoFisica {
  id: string;
  almoxarifado_id: string;
  rua?: string;
  nivel?: string;
  posicao?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

export const useLocalizacoesFisicas = (almoxarifadoId?: string) => {
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchLocalizacoes = async () => {
    if (!almoxarifadoId || !selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await EntityService.list<LocalizacaoFisica>({
        schema: 'almoxarifado',
        table: 'localizacoes_fisicas',
        companyId: selectedCompany.id,
        filters: { 
          almoxarifado_id: almoxarifadoId,
          ativo: true 
        },
        orderBy: 'rua, nivel, posicao',
        orderDirection: 'ASC'
      });

      setLocalizacoes(result.data || []);
    } catch (err) {
      console.error('Erro ao buscar localizações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createLocalizacao = async (data: Omit<LocalizacaoFisica, 'id' | 'created_at'>) => {
    try {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const newLocalizacao = await EntityService.create<LocalizacaoFisica>({
        schema: 'almoxarifado',
        table: 'localizacoes_fisicas',
        companyId: selectedCompany.id,
        data: data
      });

      setLocalizacoes(prev => [...prev, newLocalizacao]);
      return newLocalizacao;
    } catch (err) {
      console.error('Erro ao criar localização:', err);
      throw err;
    }
  };

  const updateLocalizacao = async (id: string, data: Partial<LocalizacaoFisica>) => {
    try {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const updatedLocalizacao = await EntityService.update<LocalizacaoFisica>({
        schema: 'almoxarifado',
        table: 'localizacoes_fisicas',
        companyId: selectedCompany.id,
        id: id,
        data: data
      });

      setLocalizacoes(prev => 
        prev.map(localizacao => 
          localizacao.id === id ? updatedLocalizacao : localizacao
        )
      );
      return updatedLocalizacao;
    } catch (err) {
      console.error('Erro ao atualizar localização:', err);
      throw err;
    }
  };

  const deleteLocalizacao = async (id: string) => {
    try {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      await EntityService.update({
        schema: 'almoxarifado',
        table: 'localizacoes_fisicas',
        companyId: selectedCompany.id,
        id: id,
        data: { ativo: false }
      });

      setLocalizacoes(prev => prev.filter(localizacao => localizacao.id !== id));
    } catch (err) {
      console.error('Erro ao excluir localização:', err);
      throw err;
    }
  };

  const getLocalizacaoString = (localizacao: LocalizacaoFisica) => {
    const parts = [localizacao.rua, localizacao.nivel, localizacao.posicao].filter(Boolean);
    return parts.length > 0 ? parts.join('-') : 'Não definido';
  };

  useEffect(() => {
    if (almoxarifadoId && selectedCompany?.id) {
      fetchLocalizacoes();
    }
  }, [almoxarifadoId, selectedCompany?.id]);

  return {
    localizacoes,
    loading,
    error,
    refetch: fetchLocalizacoes,
    createLocalizacao,
    updateLocalizacao,
    deleteLocalizacao,
    getLocalizacaoString
  };
};

