// =====================================================
// ORÇAMENTO DE COMBUSTÍVEL
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Calendar,
  BarChart3
} from 'lucide-react';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { 
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget
} from '@/hooks/combustivel/useCombustivel';
import { BudgetForm } from '@/components/combustivel/BudgetForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { FuelBudget } from '@/types/combustivel';

export default function OrcamentoCombustivel() {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [ano, setAno] = useState(currentDate.getFullYear());
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<FuelBudget | null>(null);

  const { data: budgets } = useBudgets({ mes, ano });
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const handleSubmit = (data: any) => {
    if (editingBudget) {
      updateBudget.mutate({ id: editingBudget.id, data });
    } else {
      createBudget.mutate({ ...data, mes, ano });
    }
    setBudgetDialogOpen(false);
    setEditingBudget(null);
  };

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orçamento de Combustível</h1>
            <p className="text-gray-600">Gerencie orçamentos mensais de combustível</p>
          </div>
          <div className="flex gap-2">
            <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PermissionButton
              entityName="fuel_budgets"
              action="create"
              onClick={() => {
                setEditingBudget(null);
                setBudgetDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </PermissionButton>
          </div>
        </div>

        {/* Resumo do Orçamento */}
        {budgets?.data && budgets.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {formatCurrency(
                    budgets.data.reduce((sum, b) => sum + (b.valor_orcado || 0), 0)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consumido</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {formatCurrency(
                    budgets.data.reduce((sum, b) => sum + (b.valor_consumido || 0), 0)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(
                    budgets.data.reduce((sum, b) => sum + ((b.valor_orcado || 0) - (b.valor_consumido || 0)), 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Orçamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos do Período</CardTitle>
            <CardDescription>
              {new Date(2000, mes - 1).toLocaleString('pt-BR', { month: 'long' })}/{ano}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgets?.data && budgets.data.length > 0 ? (
              <div className="space-y-4">
                {budgets.data.map((budget) => {
                  const percentual = budget.valor_orcado > 0
                    ? (budget.valor_consumido / budget.valor_orcado) * 100
                    : 0;
                  const saldo = budget.valor_orcado - budget.valor_consumido;

                  return (
                    <div
                      key={budget.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-lg">
                              {budget.centro_custo_nome || budget.projeto_nome || budget.condutor_nome || 'Geral'}
                            </p>
                            {budget.centro_custo_nome && (
                              <Badge variant="outline">Centro de Custo</Badge>
                            )}
                            {budget.projeto_nome && (
                              <Badge variant="outline">Projeto</Badge>
                            )}
                            {budget.condutor_nome && (
                              <Badge variant="outline">Colaborador</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Orçado</p>
                              <p className="font-bold text-blue-600">
                                {formatCurrency(budget.valor_orcado)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Consumido</p>
                              <p className="font-bold text-orange-600">
                                {formatCurrency(budget.valor_consumido)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Saldo</p>
                              <p className={`font-bold ${
                                saldo < 0 ? 'text-red-600' :
                                saldo < (budget.valor_orcado * 0.2) ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {formatCurrency(saldo)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PermissionButton
                            entityName="fuel_budgets"
                            action="edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBudget(budget);
                              setBudgetDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </PermissionButton>
                          <PermissionButton
                            entityName="fuel_budgets"
                            action="delete"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir este orçamento?')) {
                                deleteBudget.mutate(budget.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </PermissionButton>
                        </div>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{percentual.toFixed(1)}% utilizado</span>
                          {saldo < 0 && (
                            <span className="text-red-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Orçamento estourado
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              percentual > 100 ? 'bg-red-500' :
                              percentual > 80 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentual, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum orçamento cadastrado para este período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Orçamento */}
        <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
              </DialogTitle>
              <DialogDescription>
                Configure o orçamento de combustível para o período selecionado
              </DialogDescription>
            </DialogHeader>
            <BudgetForm
              budget={editingBudget}
              mes={mes}
              ano={ano}
              onSubmit={handleSubmit}
              onCancel={() => {
                setBudgetDialogOpen(false);
                setEditingBudget(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </RequireModule>
  );
}

