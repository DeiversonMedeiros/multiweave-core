// =====================================================
// FORMULÁRIO: CONFIGURAÇÃO IPI
// =====================================================

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { IPIConfig } from '@/integrations/supabase/financial-types';

interface IPIConfigFormProps {
  config?: IPIConfig | null;
  onSave: (data: Partial<IPIConfig>) => Promise<void>;
  onCancel: () => void;
}

export function IPIConfigForm({ config, onSave, onCancel }: IPIConfigFormProps) {
  const [formData, setFormData] = React.useState<Partial<IPIConfig>>({
    ncm: config?.ncm || '',
    codigo_enquadramento: config?.codigo_enquadramento || '',
    descricao_produto: config?.descricao_produto || '',
    tipo_atividade: config?.tipo_atividade || 'industrializacao',
    aliquota_ipi: config?.aliquota_ipi || 0,
    aliquota_ipi_st: config?.aliquota_ipi_st,
    permite_credito_ipi: config?.permite_credito_ipi || false,
    percentual_credito_ipi: config?.percentual_credito_ipi || 0,
    data_inicio_vigencia: config?.data_inicio_vigencia || new Date().toISOString().split('T')[0],
    data_fim_vigencia: config?.data_fim_vigencia,
    is_active: config?.is_active ?? true,
    observacoes: config?.observacoes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? 'Editar Configuração IPI' : 'Nova Configuração IPI'}</DialogTitle>
          <DialogDescription>
            Configure as regras de cálculo do Imposto sobre Produtos Industrializados
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NCM</Label>
              <Input
                value={formData.ncm}
                onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Código de Enquadramento</Label>
              <Input
                value={formData.codigo_enquadramento}
                onChange={(e) => setFormData({ ...formData, codigo_enquadramento: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição do Produto</Label>
            <Input
              value={formData.descricao_produto}
              onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Atividade</Label>
              <Select
                value={formData.tipo_atividade}
                onValueChange={(value) => setFormData({ ...formData, tipo_atividade: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industrializacao">Industrialização</SelectItem>
                  <SelectItem value="comercializacao">Comercialização</SelectItem>
                  <SelectItem value="importacao">Importação</SelectItem>
                  <SelectItem value="exportacao">Exportação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alíquota IPI (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_ipi || 0) * 100}
                onChange={(e) => setFormData({ ...formData, aliquota_ipi: (parseFloat(e.target.value) || 0) / 100 })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alíquota IPI ST (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.aliquota_ipi_st ? formData.aliquota_ipi_st * 100 : ''}
                onChange={(e) => setFormData({ ...formData, aliquota_ipi_st: e.target.value ? (parseFloat(e.target.value) || 0) / 100 : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Percentual Crédito IPI (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentual_credito_ipi || 0}
                onChange={(e) => setFormData({ ...formData, percentual_credito_ipi: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.permite_credito_ipi}
              onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_ipi: !!checked })}
            />
            <Label>Permite Crédito IPI</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início Vigência *</Label>
              <Input
                type="date"
                value={formData.data_inicio_vigencia}
                onChange={(e) => setFormData({ ...formData, data_inicio_vigencia: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim Vigência</Label>
              <Input
                type="date"
                value={formData.data_fim_vigencia || ''}
                onChange={(e) => setFormData({ ...formData, data_fim_vigencia: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {config ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

