// =====================================================
// FORMULÁRIO: CONFIGURAÇÃO INSS/RAT/FAP
// =====================================================

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { INSSRATFAPConfig } from '@/integrations/supabase/financial-types';

interface INSSConfigFormProps {
  config?: INSSRATFAPConfig | null;
  onSave: (data: Partial<INSSRATFAPConfig>) => Promise<void>;
  onCancel: () => void;
}

export function INSSConfigForm({ config, onSave, onCancel }: INSSConfigFormProps) {
  const [formData, setFormData] = React.useState<Partial<INSSRATFAPConfig>>({
    cnae: config?.cnae || '',
    cnae_descricao: config?.cnae_descricao || '',
    aliquota_rat: config?.aliquota_rat || 0,
    fap: config?.fap || 1,
    aliquota_final: config?.aliquota_final || 0,
    data_fap: config?.data_fap,
    data_inicio_vigencia: config?.data_inicio_vigencia || new Date().toISOString().split('T')[0],
    data_fim_vigencia: config?.data_fim_vigencia,
    is_active: config?.is_active ?? true,
    observacoes: config?.observacoes || '',
  });

  // Calcular aliquota_final quando RAT ou FAP mudarem
  React.useEffect(() => {
    const aliquotaFinal = (formData.aliquota_rat || 0) * (formData.fap || 1);
    setFormData(prev => ({ ...prev, aliquota_final: aliquotaFinal }));
  }, [formData.aliquota_rat, formData.fap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? 'Editar Configuração INSS/RAT/FAP' : 'Nova Configuração INSS/RAT/FAP'}</DialogTitle>
          <DialogDescription>
            Configure as regras de cálculo do INSS, RAT e FAP
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNAE</Label>
              <Input
                value={formData.cnae}
                onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição CNAE</Label>
              <Input
                value={formData.cnae_descricao}
                onChange={(e) => setFormData({ ...formData, cnae_descricao: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Alíquota RAT (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_rat || 0) * 100}
                onChange={(e) => setFormData({ ...formData, aliquota_rat: (parseFloat(e.target.value) || 0) / 100 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>FAP *</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.fap || 1}
                onChange={(e) => setFormData({ ...formData, fap: parseFloat(e.target.value) || 1 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Alíquota Final (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_final || 0) * 100}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente: RAT × FAP
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data do FAP</Label>
              <Input
                type="date"
                value={formData.data_fap || ''}
                onChange={(e) => setFormData({ ...formData, data_fap: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Início Vigência *</Label>
              <Input
                type="date"
                value={formData.data_inicio_vigencia}
                onChange={(e) => setFormData({ ...formData, data_inicio_vigencia: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data Fim Vigência</Label>
            <Input
              type="date"
              value={formData.data_fim_vigencia || ''}
              onChange={(e) => setFormData({ ...formData, data_fim_vigencia: e.target.value || undefined })}
            />
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

