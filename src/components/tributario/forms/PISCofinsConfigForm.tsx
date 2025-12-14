// =====================================================
// FORMULÁRIO: CONFIGURAÇÃO PIS/COFINS
// =====================================================

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PISCOFINSConfig } from '@/integrations/supabase/financial-types';

interface PISCofinsConfigFormProps {
  config?: PISCOFINSConfig | null;
  onSave: (data: Partial<PISCOFINSConfig>) => Promise<void>;
  onCancel: () => void;
}

export function PISCofinsConfigForm({ config, onSave, onCancel }: PISCofinsConfigFormProps) {
  const [formData, setFormData] = React.useState<Partial<PISCOFINSConfig>>({
    regime_apuracao: config?.regime_apuracao || 'nao_cumulativo',
    aliquota_pis_cumulativo: config?.aliquota_pis_cumulativo,
    aliquota_pis_nao_cumulativo: config?.aliquota_pis_nao_cumulativo || 0.0165,
    aliquota_cofins_cumulativo: config?.aliquota_cofins_cumulativo,
    aliquota_cofins_nao_cumulativo: config?.aliquota_cofins_nao_cumulativo || 0.076,
    permite_credito_insumos: config?.permite_credito_insumos || false,
    permite_credito_servicos: config?.permite_credito_servicos || false,
    permite_credito_energia: config?.permite_credito_energia || false,
    permite_credito_aluguel: config?.permite_credito_aluguel || false,
    permite_credito_combustivel: config?.permite_credito_combustivel || false,
    percentual_credito_insumos: config?.percentual_credito_insumos || 0,
    percentual_credito_servicos: config?.percentual_credito_servicos || 0,
    percentual_credito_energia: config?.percentual_credito_energia || 0,
    percentual_credito_aluguel: config?.percentual_credito_aluguel || 0,
    percentual_credito_combustivel: config?.percentual_credito_combustivel || 0,
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
          <DialogTitle>{config ? 'Editar Configuração PIS/COFINS' : 'Nova Configuração PIS/COFINS'}</DialogTitle>
          <DialogDescription>
            Configure as regras de cálculo do PIS e COFINS
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Regime de Apuração *</Label>
            <Select
              value={formData.regime_apuracao}
              onValueChange={(value) => setFormData({ ...formData, regime_apuracao: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cumulativo">Cumulativo</SelectItem>
                <SelectItem value="nao_cumulativo">Não Cumulativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alíquota PIS Cumulativo (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.aliquota_pis_cumulativo ? formData.aliquota_pis_cumulativo * 100 : ''}
                onChange={(e) => setFormData({ ...formData, aliquota_pis_cumulativo: e.target.value ? (parseFloat(e.target.value) || 0) / 100 : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alíquota PIS Não Cumulativo (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_pis_nao_cumulativo || 0) * 100}
                onChange={(e) => setFormData({ ...formData, aliquota_pis_nao_cumulativo: (parseFloat(e.target.value) || 0) / 100 })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alíquota COFINS Cumulativo (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.aliquota_cofins_cumulativo ? formData.aliquota_cofins_cumulativo * 100 : ''}
                onChange={(e) => setFormData({ ...formData, aliquota_cofins_cumulativo: e.target.value ? (parseFloat(e.target.value) || 0) / 100 : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alíquota COFINS Não Cumulativo (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_cofins_nao_cumulativo || 0) * 100}
                onChange={(e) => setFormData({ ...formData, aliquota_cofins_nao_cumulativo: (parseFloat(e.target.value) || 0) / 100 })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Permissões de Crédito</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permite_credito_insumos}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_insumos: !!checked })}
                />
                <Label className="text-sm">Insumos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permite_credito_servicos}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_servicos: !!checked })}
                />
                <Label className="text-sm">Serviços</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permite_credito_energia}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_energia: !!checked })}
                />
                <Label className="text-sm">Energia</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permite_credito_aluguel}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_aluguel: !!checked })}
                />
                <Label className="text-sm">Aluguel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permite_credito_combustivel}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_credito_combustivel: !!checked })}
                />
                <Label className="text-sm">Combustível</Label>
              </div>
            </div>
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

