// =====================================================
// COMPONENTE: FILTROS DE CONTAS A RECEBER
// =====================================================
// Data: 2025-01-15
// Descrição: Modal com filtros para contas a receber
// Autor: Sistema MultiWeave Core

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter, RotateCcw } from 'lucide-react';
import { ContaReceberFilters as ContaReceberFiltersType } from '@/integrations/supabase/financial-types';
import { useCostCenters } from '@/hooks/useCostCenters';

interface ContaReceberFiltersProps {
  filters: ContaReceberFiltersType;
  onFiltersChange: (filters: ContaReceberFiltersType) => void;
  onClose: () => void;
}

export function ContaReceberFilters({ filters, onFiltersChange, onClose }: ContaReceberFiltersProps) {
  const { data: costCentersData, isLoading: loadingCostCenters } = useCostCenters();

  const handleFilterChange = (key: keyof ContaReceberFiltersType, value: any) => {
    // Clean up special values
    const cleanedValue = value === 'all' || value === 'loading' ? '' : value;
    
    onFiltersChange({
      ...filters,
      [key]: cleanedValue,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const applyFilters = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Contas a Receber
              </CardTitle>
              <CardDescription>
                Aplique filtros para encontrar contas específicas
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                placeholder="Nome do cliente"
                value={filters.cliente_nome || ''}
                onChange={(e) => handleFilterChange('cliente_nome', e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data de Vencimento - Início */}
            <div>
              <Label htmlFor="data_inicio">Data de Vencimento - Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={filters.data_vencimento_inicio || ''}
                onChange={(e) => handleFilterChange('data_vencimento_inicio', e.target.value || undefined)}
              />
            </div>

            {/* Data de Vencimento - Fim */}
            <div>
              <Label htmlFor="data_fim">Data de Vencimento - Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={filters.data_vencimento_fim || ''}
                onChange={(e) => handleFilterChange('data_vencimento_fim', e.target.value || undefined)}
              />
            </div>

            {/* Valor Mínimo */}
            <div>
              <Label htmlFor="valor_minimo">Valor Mínimo</Label>
              <Input
                id="valor_minimo"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={filters.valor_minimo || ''}
                onChange={(e) => handleFilterChange('valor_minimo', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>

            {/* Valor Máximo */}
            <div>
              <Label htmlFor="valor_maximo">Valor Máximo</Label>
              <Input
                id="valor_maximo"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={filters.valor_maximo || ''}
                onChange={(e) => handleFilterChange('valor_maximo', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>

            {/* Centro de Custo */}
            <div>
              <Label htmlFor="centro_custo">Centro de Custo</Label>
              <Select
                value={filters.centro_custo_id || ''}
                onValueChange={(value) => handleFilterChange('centro_custo_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {loadingCostCenters ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    (costCentersData?.data || []).map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Classe Financeira */}
            <div>
              <Label htmlFor="classe_financeira">Classe Financeira</Label>
              <Input
                id="classe_financeira"
                placeholder="Classe financeira"
                value={filters.classe_financeira || ''}
                onChange={(e) => handleFilterChange('classe_financeira', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={clearFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={applyFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

