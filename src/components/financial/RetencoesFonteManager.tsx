// =====================================================
// COMPONENTE: GERENCIADOR DE RETENÇÕES NA FONTE
// =====================================================
// Data: 2025-12-12
// Descrição: Componente para gerenciar retenções na fonte de uma conta a pagar
// Autor: Sistema MultiWeave Core
// Módulo: M2 - Contas a Pagar

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { useRetencoesFonte } from '@/hooks/financial/useRetencoesFonte';
import { RetencaoFonte, RetencaoFonteFormData } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RetencoesFonteManagerProps {
  contaPagarId: string;
  valorTitulo: number;
}

const TIPOS_RETENCAO = [
  { value: 'INSS', label: 'INSS' },
  { value: 'IRRF', label: 'IRRF' },
  { value: 'PIS', label: 'PIS' },
  { value: 'COFINS', label: 'COFINS' },
  { value: 'CSLL', label: 'CSLL' },
  { value: 'ISS_RF', label: 'ISS Retido na Fonte' },
  { value: 'IRRF_SERVICOS', label: 'IRRF sobre Serviços' },
  { value: 'IRRF_ALUGUEL', label: 'IRRF sobre Aluguel' },
  { value: 'IRRF_DIVIDENDOS', label: 'IRRF sobre Dividendos' },
  { value: 'OUTROS', label: 'Outros' },
] as const;

export function RetencoesFonteManager({ contaPagarId, valorTitulo }: RetencoesFonteManagerProps) {
  const { retencoes, loading, createRetencao, updateRetencao, deleteRetencao, calcularTotalRetencoes } = useRetencoesFonte(contaPagarId);
  
  const [showForm, setShowForm] = useState(false);
  const [editingRetencao, setEditingRetencao] = useState<RetencaoFonte | null>(null);
  const [formData, setFormData] = useState<RetencaoFonteFormData>({
    conta_pagar_id: contaPagarId,
    tipo_retencao: 'INSS',
    base_calculo: valorTitulo,
    aliquota: 0,
    valor_retencao: 0,
  });

  const totalRetencoes = calcularTotalRetencoes(contaPagarId);
  const valorLiquido = valorTitulo - totalRetencoes;

  const handleOpenForm = (retencao?: RetencaoFonte) => {
    if (retencao) {
      setEditingRetencao(retencao);
      setFormData({
        conta_pagar_id: contaPagarId,
        tipo_retencao: retencao.tipo_retencao,
        base_calculo: retencao.base_calculo,
        aliquota: retencao.aliquota,
        valor_retencao: retencao.valor_retencao,
        codigo_receita: retencao.codigo_receita,
        data_recolhimento: retencao.data_recolhimento,
        observacoes: retencao.observacoes,
      });
    } else {
      setEditingRetencao(null);
      setFormData({
        conta_pagar_id: contaPagarId,
        tipo_retencao: 'INSS',
        base_calculo: valorTitulo - totalRetencoes, // Base já descontando outras retenções
        aliquota: 0,
        valor_retencao: 0,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRetencao(null);
    setFormData({
      conta_pagar_id: contaPagarId,
      tipo_retencao: 'INSS',
      base_calculo: valorTitulo,
      aliquota: 0,
      valor_retencao: 0,
    });
  };

  const handleSave = async () => {
    try {
      // Calcular valor_retencao se não fornecido
      const valorRetencao = formData.valor_retencao ?? (formData.base_calculo * formData.aliquota);

      if (editingRetencao) {
        await updateRetencao(editingRetencao.id, {
          ...formData,
          valor_retencao: valorRetencao,
        });
      } else {
        await createRetencao({
          ...formData,
          valor_retencao: valorRetencao,
        });
      }
      handleCloseForm();
    } catch (error) {
      console.error('Erro ao salvar retenção:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente cancelar esta retenção?')) return;
    try {
      await deleteRetencao(id);
    } catch (error) {
      console.error('Erro ao cancelar retenção:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      recolhido: { label: 'Recolhido', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'outline' as const },
    };
    const statusConfig = config[status as keyof typeof config] || config.pendente;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Retenções na Fonte</CardTitle>
            <CardDescription>
              Gerencie as retenções tributárias desta conta a pagar
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenForm()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Retenção
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Valor do Título</Label>
            <p className="text-lg font-semibold">{formatCurrency(valorTitulo)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Total de Retenções</Label>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(totalRetencoes)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Valor Líquido</Label>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(valorLiquido)}</p>
          </div>
        </div>

        {/* Tabela de retenções */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : retencoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma retenção registrada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Base de Cálculo</TableHead>
                <TableHead>Alíquota</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data Recolhimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retencoes.map((retencao) => (
                <TableRow key={retencao.id}>
                  <TableCell>
                    {TIPOS_RETENCAO.find(t => t.value === retencao.tipo_retencao)?.label || retencao.tipo_retencao}
                  </TableCell>
                  <TableCell>{formatCurrency(retencao.base_calculo)}</TableCell>
                  <TableCell>{(retencao.aliquota * 100).toFixed(2)}%</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(retencao.valor_retencao)}</TableCell>
                  <TableCell>{formatDate(retencao.data_recolhimento)}</TableCell>
                  <TableCell>{getStatusBadge(retencao.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenForm(retencao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {retencao.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(retencao.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog de formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRetencao ? 'Editar Retenção' : 'Nova Retenção na Fonte'}
            </DialogTitle>
            <DialogDescription>
              Registre uma retenção tributária para esta conta a pagar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Retenção *</Label>
                <Select
                  value={formData.tipo_retencao}
                  onValueChange={(value) => setFormData({ ...formData, tipo_retencao: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RETENCAO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base de Cálculo *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_calculo}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      base_calculo: valor,
                      valor_retencao: valor * formData.aliquota,
                    });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alíquota (%) *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={(formData.aliquota * 100).toFixed(4)}
                  onChange={(e) => {
                    const aliquota = (parseFloat(e.target.value) || 0) / 100;
                    setFormData({
                      ...formData,
                      aliquota,
                      valor_retencao: formData.base_calculo * aliquota,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da Retenção</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_retencao?.toFixed(2)}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Calculado automaticamente: {formatCurrency(formData.valor_retencao || 0)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código de Receita (DARF)</Label>
                <Input
                  value={formData.codigo_receita || ''}
                  onChange={(e) => setFormData({ ...formData, codigo_receita: e.target.value })}
                  placeholder="Ex: 2880"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Recolhimento</Label>
                <Input
                  type="date"
                  value={formData.data_recolhimento || ''}
                  onChange={(e) => setFormData({ ...formData, data_recolhimento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingRetencao ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

