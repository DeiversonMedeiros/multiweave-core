// =====================================================
// GERENCIADOR DE FAIXAS ETÁRIAS PARA PLANOS MÉDICOS
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import {
  MedicalPlanAgeRange,
  MedicalPlanAgeRangeCreateData,
} from '@/integrations/supabase/rh-types';
import {
  useMedicalPlanAgeRanges,
  useCreateMedicalPlanAgeRange,
  useUpdateMedicalPlanAgeRange,
  useDeleteMedicalPlanAgeRange,
} from '@/hooks/rh/useMedicalAgreements';
import { formatCurrency } from '@/services/rh/medicalAgreementsService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const ageRangeSchema = z.object({
  idade_min: z.number().min(0, 'Idade mínima deve ser maior ou igual a 0.').max(120, 'Idade máxima permitida é 120.'),
  idade_max: z.number().min(0, 'Idade máxima deve ser maior ou igual a 0.').max(120, 'Idade máxima permitida é 120.'),
  valor_titular: z.number().min(0, 'Valor do titular deve ser maior ou igual a 0.'),
  valor_dependente: z.number().min(0, 'Valor do dependente deve ser maior ou igual a 0.'),
  ordem: z.number().min(0, 'Ordem deve ser maior ou igual a 0.').default(0),
});

type AgeRangeFormData = z.infer<typeof ageRangeSchema>;

interface MedicalPlanAgeRangesManagerProps {
  planId: string;
  companyId: string;
}

export function MedicalPlanAgeRangesManager({
  planId,
  companyId,
}: MedicalPlanAgeRangesManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<MedicalPlanAgeRange | null>(null);

  const { data: ageRanges, isLoading, refetch } = useMedicalPlanAgeRanges({
    plan_id: planId,
    ativo: true,
  });

  const createMutation = useCreateMedicalPlanAgeRange();
  const updateMutation = useUpdateMedicalPlanAgeRange();
  const deleteMutation = useDeleteMedicalPlanAgeRange();

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<AgeRangeFormData>({
    resolver: zodResolver(ageRangeSchema),
    defaultValues: {
      idade_min: 0,
      idade_max: 0,
      valor_titular: 0,
      valor_dependente: 0,
      ordem: 0,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
    setValue: setValueEdit,
  } = useForm<AgeRangeFormData>({
    resolver: zodResolver(ageRangeSchema),
  });

  const handleAdd = async (data: AgeRangeFormData) => {
    try {
      await createMutation.mutateAsync({
        plan_id: planId,
        ...data,
      });
      setIsAddModalOpen(false);
      resetAdd();
      // Forçar refetch após criar
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error) {
      console.error('Erro ao criar faixa etária:', error);
    }
  };

  const handleEdit = async (data: AgeRangeFormData) => {
    if (!selectedRange) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedRange.id,
        ...data,
      });
      setIsEditModalOpen(false);
      setSelectedRange(null);
      resetEdit();
    } catch (error) {
      console.error('Erro ao atualizar faixa etária:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta faixa etária?')) {
      try {
        await deleteMutation.mutateAsync(id);
        // Forçar refetch após excluir
        setTimeout(() => {
          refetch();
        }, 100);
      } catch (error) {
        console.error('Erro ao excluir faixa etária:', error);
      }
    }
  };

  const openEditModal = (range: MedicalPlanAgeRange) => {
    setSelectedRange(range);
    setValueEdit('idade_min', range.idade_min);
    setValueEdit('idade_max', range.idade_max);
    setValueEdit('valor_titular', range.valor_titular);
    setValueEdit('valor_dependente', range.valor_dependente);
    setValueEdit('ordem', range.ordem);
    setIsEditModalOpen(true);
  };

  if (!planId) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um plano para gerenciar faixas etárias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Faixas Etárias e Valores</CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              disabled={!planId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Faixa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando faixas etárias...</p>
          ) : ageRanges && ageRanges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Idade Mínima</TableHead>
                  <TableHead>Idade Máxima</TableHead>
                  <TableHead>Valor Titular</TableHead>
                  <TableHead>Valor Dependente</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageRanges.map((range) => (
                  <TableRow key={range.id}>
                    <TableCell>{range.idade_min} anos</TableCell>
                    <TableCell>{range.idade_max} anos</TableCell>
                    <TableCell>{formatCurrency(range.valor_titular)}</TableCell>
                    <TableCell>{formatCurrency(range.valor_dependente)}</TableCell>
                    <TableCell>{range.ordem}</TableCell>
                    <TableCell>
                      <Badge variant={range.ativo ? 'default' : 'secondary'}>
                        {range.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(range)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(range.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma faixa etária cadastrada. Use o valor padrão do plano ou adicione faixas específicas.
              </p>
              <p className="text-xs text-muted-foreground">
                Quando não houver faixas etárias cadastradas, será usado o valor padrão do plano (valor_titular e valor_dependente).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Adicionar */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Faixa Etária</DialogTitle>
            <DialogDescription>
              Defina uma faixa etária com valores específicos para titular e dependente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd(handleAdd)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idade_min">Idade Mínima *</Label>
                <Input
                  id="idade_min"
                  type="number"
                  {...registerAdd('idade_min', { valueAsNumber: true })}
                  min="0"
                  max="120"
                  className={errorsAdd.idade_min ? 'border-red-500' : ''}
                />
                {errorsAdd.idade_min && (
                  <p className="text-sm text-red-500">{errorsAdd.idade_min.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="idade_max">Idade Máxima *</Label>
                <Input
                  id="idade_max"
                  type="number"
                  {...registerAdd('idade_max', { valueAsNumber: true })}
                  min="0"
                  max="120"
                  className={errorsAdd.idade_max ? 'border-red-500' : ''}
                />
                {errorsAdd.idade_max && (
                  <p className="text-sm text-red-500">{errorsAdd.idade_max.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_titular">Valor Titular (R$) *</Label>
                <Input
                  id="valor_titular"
                  type="number"
                  step="0.01"
                  {...registerAdd('valor_titular', { valueAsNumber: true })}
                  min="0"
                  className={errorsAdd.valor_titular ? 'border-red-500' : ''}
                />
                {errorsAdd.valor_titular && (
                  <p className="text-sm text-red-500">{errorsAdd.valor_titular.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_dependente">Valor Dependente (R$) *</Label>
                <Input
                  id="valor_dependente"
                  type="number"
                  step="0.01"
                  {...registerAdd('valor_dependente', { valueAsNumber: true })}
                  min="0"
                  className={errorsAdd.valor_dependente ? 'border-red-500' : ''}
                />
                {errorsAdd.valor_dependente && (
                  <p className="text-sm text-red-500">{errorsAdd.valor_dependente.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem de Prioridade</Label>
              <Input
                id="ordem"
                type="number"
                {...registerAdd('ordem', { valueAsNumber: true })}
                min="0"
                placeholder="0 = maior prioridade"
                className={errorsAdd.ordem ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Quando houver sobreposição de faixas, a menor ordem tem prioridade.
              </p>
              {errorsAdd.ordem && (
                <p className="text-sm text-red-500">{errorsAdd.ordem.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetAdd();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Faixa Etária</DialogTitle>
            <DialogDescription>
              Atualize os valores da faixa etária.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_idade_min">Idade Mínima *</Label>
                <Input
                  id="edit_idade_min"
                  type="number"
                  {...registerEdit('idade_min', { valueAsNumber: true })}
                  min="0"
                  max="120"
                  className={errorsEdit.idade_min ? 'border-red-500' : ''}
                />
                {errorsEdit.idade_min && (
                  <p className="text-sm text-red-500">{errorsEdit.idade_min.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_idade_max">Idade Máxima *</Label>
                <Input
                  id="edit_idade_max"
                  type="number"
                  {...registerEdit('idade_max', { valueAsNumber: true })}
                  min="0"
                  max="120"
                  className={errorsEdit.idade_max ? 'border-red-500' : ''}
                />
                {errorsEdit.idade_max && (
                  <p className="text-sm text-red-500">{errorsEdit.idade_max.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_valor_titular">Valor Titular (R$) *</Label>
                <Input
                  id="edit_valor_titular"
                  type="number"
                  step="0.01"
                  {...registerEdit('valor_titular', { valueAsNumber: true })}
                  min="0"
                  className={errorsEdit.valor_titular ? 'border-red-500' : ''}
                />
                {errorsEdit.valor_titular && (
                  <p className="text-sm text-red-500">{errorsEdit.valor_titular.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_valor_dependente">Valor Dependente (R$) *</Label>
                <Input
                  id="edit_valor_dependente"
                  type="number"
                  step="0.01"
                  {...registerEdit('valor_dependente', { valueAsNumber: true })}
                  min="0"
                  className={errorsEdit.valor_dependente ? 'border-red-500' : ''}
                />
                {errorsEdit.valor_dependente && (
                  <p className="text-sm text-red-500">{errorsEdit.valor_dependente.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ordem">Ordem de Prioridade</Label>
              <Input
                id="edit_ordem"
                type="number"
                {...registerEdit('ordem', { valueAsNumber: true })}
                min="0"
                placeholder="0 = maior prioridade"
                className={errorsEdit.ordem ? 'border-red-500' : ''}
              />
              {errorsEdit.ordem && (
                <p className="text-sm text-red-500">{errorsEdit.ordem.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedRange(null);
                  resetEdit();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Atualizar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
