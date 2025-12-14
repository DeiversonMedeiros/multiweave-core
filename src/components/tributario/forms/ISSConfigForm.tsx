// =====================================================
// FORMULÁRIO: CONFIGURAÇÃO ISS
// =====================================================

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ISSConfig } from '@/integrations/supabase/financial-types';

interface ISSConfigFormProps {
  config?: ISSConfig | null;
  onSave: (data: Partial<ISSConfig>) => Promise<void>;
  onCancel: () => void;
}

export function ISSConfigForm({ config, onSave, onCancel }: ISSConfigFormProps) {
  const [formData, setFormData] = React.useState<Partial<ISSConfig>>({
    codigo_municipio_ibge: config?.codigo_municipio_ibge || '',
    municipio_nome: config?.municipio_nome || '',
    uf: config?.uf || '',
    tipo_base_calculo: config?.tipo_base_calculo || 'base_cheia',
    percentual_deducao_presumida: config?.percentual_deducao_presumida || 0,
    aliquota_iss: config?.aliquota_iss || 0,
    permite_retencao_na_fonte: config?.permite_retencao_na_fonte || false,
    responsavel_recolhimento: config?.responsavel_recolhimento || 'prestador',
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
          <DialogTitle>{config ? 'Editar Configuração ISS' : 'Nova Configuração ISS'}</DialogTitle>
          <DialogDescription>
            Configure as regras de cálculo do Imposto Sobre Serviços
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código Município IBGE *</Label>
              <Input
                value={formData.codigo_municipio_ibge}
                onChange={(e) => setFormData({ ...formData, codigo_municipio_ibge: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>UF *</Label>
              <Input
                value={formData.uf}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                maxLength={2}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome do Município *</Label>
            <Input
              value={formData.municipio_nome}
              onChange={(e) => setFormData({ ...formData, municipio_nome: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Base de Cálculo *</Label>
              <Select
                value={formData.tipo_base_calculo}
                onValueChange={(value) => setFormData({ ...formData, tipo_base_calculo: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_cheia">Base Cheia</SelectItem>
                  <SelectItem value="deducao_presumida">Dedução Presumida</SelectItem>
                  <SelectItem value="deducao_real">Dedução Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.tipo_base_calculo === 'deducao_presumida' && (
              <div className="space-y-2">
                <Label>Percentual de Dedução Presumida (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.percentual_deducao_presumida}
                  onChange={(e) => setFormData({ ...formData, percentual_deducao_presumida: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alíquota ISS (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={(formData.aliquota_iss || 0) * 100}
                onChange={(e) => setFormData({ ...formData, aliquota_iss: (parseFloat(e.target.value) || 0) / 100 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável pelo Recolhimento</Label>
              <Select
                value={formData.responsavel_recolhimento}
                onValueChange={(value) => setFormData({ ...formData, responsavel_recolhimento: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prestador">Prestador</SelectItem>
                  <SelectItem value="tomador">Tomador</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.permite_retencao_na_fonte}
              onCheckedChange={(checked) => setFormData({ ...formData, permite_retencao_na_fonte: !!checked })}
            />
            <Label>Permite Retenção na Fonte</Label>
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

