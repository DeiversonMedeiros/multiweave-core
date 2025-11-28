// =====================================================
// COMPONENTE: FILTROS DE CONTAS A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Modal com filtros para contas a pagar
// Autor: Sistema MultiWeave Core

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Filter, RotateCcw } from 'lucide-react';
import { ContaPagarFilters as ContaPagarFiltersType } from '@/integrations/supabase/financial-types';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useTesouraria } from '@/hooks/financial/useTesouraria';

interface ContaPagarFiltersProps {
  filters: ContaPagarFiltersType;
  onFiltersChange: (filters: ContaPagarFiltersType) => void;
  onClose: () => void;
}

export function ContaPagarFilters({ filters, onFiltersChange, onClose }: ContaPagarFiltersProps) {
  const { data: costCentersData, isLoading: loadingCostCenters } = useCostCenters();
  const { data: projectsData, isLoading: loadingProjects } = useProjects();
  const { contasBancarias } = useTesouraria();

  const handleFilterChange = (key: keyof ContaPagarFiltersType, value: any) => {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Contas a Pagar
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
            {/* Número do Título */}
            <div>
              <Label htmlFor="numero_titulo">Número do Título</Label>
              <Input
                id="numero_titulo"
                placeholder="Número do título"
                value={filters.numero_titulo || ''}
                onChange={(e) => handleFilterChange('numero_titulo', e.target.value || undefined)}
              />
            </div>

            {/* Fornecedor */}
            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                placeholder="Nome do fornecedor"
                value={filters.fornecedor_nome || ''}
                onChange={(e) => handleFilterChange('fornecedor_nome', e.target.value || undefined)}
              />
            </div>

            {/* CNPJ do Fornecedor */}
            <div>
              <Label htmlFor="fornecedor_cnpj">CNPJ do Fornecedor</Label>
              <Input
                id="fornecedor_cnpj"
                placeholder="CNPJ do fornecedor"
                value={filters.fornecedor_cnpj || ''}
                onChange={(e) => handleFilterChange('fornecedor_cnpj', e.target.value || undefined)}
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
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
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

            {/* Departamento */}
            <div>
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                placeholder="Nome do departamento"
                value={filters.departamento || ''}
                onChange={(e) => handleFilterChange('departamento', e.target.value || undefined)}
              />
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

            {/* Categoria */}
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                placeholder="Categoria"
                value={filters.categoria || ''}
                onChange={(e) => handleFilterChange('categoria', e.target.value || undefined)}
              />
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <Input
                id="forma_pagamento"
                placeholder="Forma de pagamento"
                value={filters.forma_pagamento || ''}
                onChange={(e) => handleFilterChange('forma_pagamento', e.target.value || undefined)}
              />
            </div>

            {/* Projeto */}
            <div>
              <Label htmlFor="projeto">Projeto</Label>
              <Select
                value={filters.projeto_id || ''}
                onValueChange={(value) => handleFilterChange('projeto_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {loadingProjects ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    (projectsData?.data || []).map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Conta Bancária */}
            <div>
              <Label htmlFor="conta_bancaria">Conta Bancária</Label>
              <Select
                value={filters.conta_bancaria_id || ''}
                onValueChange={(value) => handleFilterChange('conta_bancaria_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {contasBancarias.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.banco_nome} - {conta.agencia}/{conta.conta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de Emissão - Início */}
            <div>
              <Label htmlFor="data_emissao_inicio">Data de Emissão - Início</Label>
              <Input
                id="data_emissao_inicio"
                type="date"
                value={filters.data_emissao_inicio || ''}
                onChange={(e) => handleFilterChange('data_emissao_inicio', e.target.value || undefined)}
              />
            </div>

            {/* Data de Emissão - Fim */}
            <div>
              <Label htmlFor="data_emissao_fim">Data de Emissão - Fim</Label>
              <Input
                id="data_emissao_fim"
                type="date"
                value={filters.data_emissao_fim || ''}
                onChange={(e) => handleFilterChange('data_emissao_fim', e.target.value || undefined)}
              />
            </div>

            {/* Data de Pagamento - Início */}
            <div>
              <Label htmlFor="data_pagamento_inicio">Data de Pagamento - Início</Label>
              <Input
                id="data_pagamento_inicio"
                type="date"
                value={filters.data_pagamento_inicio || ''}
                onChange={(e) => handleFilterChange('data_pagamento_inicio', e.target.value || undefined)}
              />
            </div>

            {/* Data de Pagamento - Fim */}
            <div>
              <Label htmlFor="data_pagamento_fim">Data de Pagamento - Fim</Label>
              <Input
                id="data_pagamento_fim"
                type="date"
                value={filters.data_pagamento_fim || ''}
                onChange={(e) => handleFilterChange('data_pagamento_fim', e.target.value || undefined)}
              />
            </div>

            {/* Parcelada */}
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="is_parcelada"
                checked={filters.is_parcelada === true}
                onCheckedChange={(checked) => handleFilterChange('is_parcelada', checked === true ? true : undefined)}
              />
              <Label htmlFor="is_parcelada" className="cursor-pointer">
                Apenas contas parceladas
              </Label>
            </div>

            {/* Filtros de Vencimento */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-base font-semibold">Filtros de Vencimento</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apenas_vencidas"
                  checked={filters.apenas_vencidas === true}
                  onCheckedChange={(checked) => {
                    handleFilterChange('apenas_vencidas', checked === true ? true : undefined);
                    if (checked) {
                      handleFilterChange('apenas_proximas_vencer', undefined);
                    }
                  }}
                />
                <Label htmlFor="apenas_vencidas" className="cursor-pointer">
                  Apenas contas vencidas
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apenas_proximas_vencer"
                  checked={filters.apenas_proximas_vencer === true}
                  onCheckedChange={(checked) => {
                    handleFilterChange('apenas_proximas_vencer', checked === true ? true : undefined);
                    if (checked) {
                      handleFilterChange('apenas_vencidas', undefined);
                    }
                  }}
                />
                <Label htmlFor="apenas_proximas_vencer" className="cursor-pointer">
                  Apenas contas próximas a vencer
                </Label>
              </div>

              <div>
                <Label htmlFor="dias_alerta">Dias de alerta para "próximo a vencer"</Label>
                <Input
                  id="dias_alerta"
                  type="number"
                  min="1"
                  max="30"
                  placeholder="7"
                  value={filters.dias_alerta || 7}
                  onChange={(e) => handleFilterChange('dias_alerta', e.target.value ? parseInt(e.target.value) : 7)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Contas que vencem dentro deste número de dias serão marcadas como "próximas a vencer"
                </p>
              </div>
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

