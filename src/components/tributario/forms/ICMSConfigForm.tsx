// =====================================================
// FORMULÁRIO: CONFIGURAÇÃO ICMS
// =====================================================

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ICMSConfig } from '@/integrations/supabase/financial-types';

interface ICMSConfigFormProps {
  config?: ICMSConfig | null;
  onSave: (data: Partial<ICMSConfig>) => Promise<void>;
  onCancel: () => void;
}

export function ICMSConfigForm({ config, onSave, onCancel }: ICMSConfigFormProps) {
  const [formData, setFormData] = React.useState<Partial<ICMSConfig>>({
    uf: config?.uf || '',
    uf_nome: config?.uf_nome || '',
    tipo_operacao: config?.tipo_operacao || 'venda_interna',
    cst: config?.cst || '',
    cfop: config?.cfop || '',
    aliquota_icms: config?.aliquota_icms || 0,
    aliquota_icms_st: config?.aliquota_icms_st,
    permite_credito_insumos: config?.permite_credito_insumos || false,
    percentual_credito_insumos: config?.percentual_credito_insumos || 0,
    percentual_reducao_base: config?.percentual_reducao_base || 0,
    percentual_mva: config?.percentual_mva,
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
          <DialogTitle>{config ? 'Editar Configuração ICMS' : 'Nova Configuração ICMS'}</DialogTitle>
          <DialogDescription>
            Configure as regras de cálculo do Imposto sobre Circulação de Mercadorias e Serviços
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>UF *</Label>
              <Input
                value={formData.uf}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                maxLength={2}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da UF *</Label>
              <Input
                value={formData.uf_nome}
                onChange={(e) => setFormData({ ...formData, uf_nome: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Operação *</Label>
              <Select
                value={formData.tipo_operacao}
                onValueChange={(value) => setFormData({ ...formData, tipo_operacao: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda_interna">Venda Interna</SelectItem>
                  <SelectItem value="venda_interestadual">Venda Interestadual</SelectItem>
                  <SelectItem value="venda_exterior">Venda Exterior</SelectItem>
                  <SelectItem value="compra_interna">Compra Interna</SelectItem>
                  <SelectItem value="compra_interestadual">Compra Interestadual</SelectItem>
                  <SelectItem value="compra_exterior">Compra Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alíquota ICMS (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_icms || 0) * 100}
                onChange={(e) => setFormData({ ...formData, aliquota_icms: (parseFloat(e.target.value) || 0) / 100 })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CST</Label>
              <Input
                value={formData.cst}
                onChange={(e) => setFormData({ ...formData, cst: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CFOP</Label>
              <Input
                value={formData.cfop}
                onChange={(e) => setFormData({ ...formData, cfop: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alíquota ICMS ST (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.aliquota_icms_st ? formData.aliquota_icms_st * 100 : ''}
                onChange={(e) => setFormData({ ...formData, aliquota_icms_st: e.target.value ? (parseFloat(e.target.value) || 0) / 100 : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Percentual MVA (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentual_mva || ''}
                onChange={(e) => setFormData({ ...formData, percentual_mva: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Percentual Redução Base (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentual_reducao_base || 0}
                onChange={(e) => setFormData({ ...formData, percentual_reducao_base: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Percentual Crédito Insumos (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentual_credito_insumos || 0}
                onChange={(e) => setFormData({ ...formData, percentual_credito_insumos: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.permite_credito_insumos}
              onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_insumos: !!checked })}
            />
            <Label>Permite Crédito de Insumos</Label>
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

