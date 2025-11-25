import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateFgtsConfig, useUpdateFgtsConfig } from '@/hooks/rh/useFgtsConfig';
import { FgtsConfig, FgtsConfigCreateData } from '@/integrations/supabase/rh-types';
import { validateFgtsConfig } from '@/services/rh/fgtsConfigService';
import { getContractTypes } from '@/services/rh/employmentContractsService';
import { toast } from 'sonner';

interface FgtsConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  config?: FgtsConfig | null;
}

export default function FgtsConfigForm({ isOpen, onClose, mode, config }: FgtsConfigFormProps) {
  const [formData, setFormData] = useState<FgtsConfigCreateData>({
    codigo: '',
    descricao: '',
    ano_vigencia: new Date().getFullYear(),
    mes_vigencia: new Date().getMonth() + 1,
    aliquota_fgts: 0.08, // 8% padrão
    aliquota_multa: 0.0,
    aliquota_juros: 0.0,
    teto_salario: 0,
    valor_minimo_contribuicao: 0,
    multa_rescisao: 0.4, // 40% padrão
    tipo_contrato: null, // NULL = configuração geral
    ativo: true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks
  const createMutation = useCreateFgtsConfig();
  const updateMutation = useUpdateFgtsConfig();

  // Preencher formulário quando config for fornecido
  useEffect(() => {
    if (config && (mode === 'edit' || mode === 'view')) {
      setFormData({
        codigo: config.codigo,
        descricao: config.descricao,
        ano_vigencia: config.ano_vigencia,
        mes_vigencia: config.mes_vigencia,
        aliquota_fgts: config.aliquota_fgts,
        aliquota_multa: config.aliquota_multa || 0,
        aliquota_juros: config.aliquota_juros || 0,
        teto_salario: config.teto_salario || 0,
        valor_minimo_contribuicao: config.valor_minimo_contribuicao || 0,
        multa_rescisao: config.multa_rescisao || 0,
        tipo_contrato: config.tipo_contrato || null,
        ativo: config.ativo,
      });
    } else {
      // Reset form for create mode
      setFormData({
        codigo: '',
        descricao: '',
        ano_vigencia: new Date().getFullYear(),
        mes_vigencia: new Date().getMonth() + 1,
        aliquota_fgts: 0.08,
        aliquota_multa: 0.0,
        aliquota_juros: 0.0,
        teto_salario: 0,
        valor_minimo_contribuicao: 0,
        multa_rescisao: 0.4,
        tipo_contrato: null,
        ativo: true,
      });
    }
    setErrors([]);
  }, [config, mode, isOpen]);

  const handleInputChange = (field: keyof FgtsConfigCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateFgtsConfig(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(formData);
        toast.success('Configuração FGTS criada com sucesso!');
      } else if (mode === 'edit' && config) {
        await updateMutation.mutateAsync({
          id: config.id,
          ...formData
        });
        toast.success('Configuração FGTS atualizada com sucesso!');
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configuração FGTS:', error);
      toast.error('Erro ao salvar configuração FGTS');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === 'view';
  const isDisabled = isReadOnly || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Nova Configuração FGTS'}
            {mode === 'edit' && 'Editar Configuração FGTS'}
            {mode === 'view' && 'Visualizar Configuração FGTS'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Crie uma nova configuração do Fundo de Garantia do Tempo de Serviço'}
            {mode === 'edit' && 'Edite as informações da configuração FGTS'}
            {mode === 'view' && 'Visualize as informações da configuração FGTS'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <h4 className="text-sm font-medium text-destructive mb-2">Erros encontrados:</h4>
              <ul className="text-sm text-destructive space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                placeholder="Ex: FGTS_2024"
                disabled={isDisabled}
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Ex: Configuração FGTS 2024"
                disabled={isDisabled}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alíquota FGTS */}
            <div className="space-y-2">
              <Label htmlFor="aliquota_fgts">Alíquota FGTS *</Label>
              <Input
                id="aliquota_fgts"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.aliquota_fgts}
                onChange={(e) => handleInputChange('aliquota_fgts', parseFloat(e.target.value) || 0)}
                placeholder="0.0800"
                disabled={isDisabled}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 0.0800 = 8.00%
              </p>
            </div>

            {/* Multa de Rescisão */}
            <div className="space-y-2">
              <Label htmlFor="multa_rescisao">Multa de Rescisão</Label>
              <Input
                id="multa_rescisao"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.multa_rescisao}
                onChange={(e) => handleInputChange('multa_rescisao', parseFloat(e.target.value) || 0)}
                placeholder="0.4000"
                disabled={isDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 0.4000 = 40.00%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alíquota de Multa */}
            <div className="space-y-2">
              <Label htmlFor="aliquota_multa">Alíquota de Multa</Label>
              <Input
                id="aliquota_multa"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.aliquota_multa}
                onChange={(e) => handleInputChange('aliquota_multa', parseFloat(e.target.value) || 0)}
                placeholder="0.0000"
                disabled={isDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 0.0000 = 0.00%
              </p>
            </div>

            {/* Alíquota de Juros */}
            <div className="space-y-2">
              <Label htmlFor="aliquota_juros">Alíquota de Juros</Label>
              <Input
                id="aliquota_juros"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.aliquota_juros}
                onChange={(e) => handleInputChange('aliquota_juros', parseFloat(e.target.value) || 0)}
                placeholder="0.0000"
                disabled={isDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 0.0000 = 0.00%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teto Salário */}
            <div className="space-y-2">
              <Label htmlFor="teto_salario">Teto Salário</Label>
              <Input
                id="teto_salario"
                type="number"
                step="0.01"
                min="0"
                value={formData.teto_salario}
                onChange={(e) => handleInputChange('teto_salario', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={isDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Valor máximo para cálculo
              </p>
            </div>

            {/* Valor Mínimo Contribuição */}
            <div className="space-y-2">
              <Label htmlFor="valor_minimo_contribuicao">Valor Mínimo Contribuição</Label>
              <Input
                id="valor_minimo_contribuicao"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_minimo_contribuicao}
                onChange={(e) => handleInputChange('valor_minimo_contribuicao', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={isDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Valor mínimo para contribuição
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Contrato */}
            <div className="space-y-2">
              <Label htmlFor="tipo_contrato">Tipo de Contrato (Opcional)</Label>
              <Select
                value={formData.tipo_contrato || ''}
                onValueChange={(value) => handleInputChange('tipo_contrato', value === '' ? null : value)}
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Configuração Geral (aplica a todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Configuração Geral (aplica a todos)</SelectItem>
                  {getContractTypes().map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Deixe vazio para configuração geral. Selecione um tipo para configuração específica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ano de Vigência */}
            <div className="space-y-2">
              <Label htmlFor="ano_vigencia">Ano de Vigência *</Label>
              <Select 
                value={formData.ano_vigencia.toString()} 
                onValueChange={(value) => handleInputChange('ano_vigencia', parseInt(value))}
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mês de Vigência */}
            <div className="space-y-2">
              <Label htmlFor="mes_vigencia">Mês de Vigência *</Label>
              <Select 
                value={formData.mes_vigencia.toString()} 
                onValueChange={(value) => handleInputChange('mes_vigencia', parseInt(value))}
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => handleInputChange('ativo', checked)}
              disabled={isDisabled}
            />
            <Label htmlFor="ativo">Ativo</Label>
          </div>

          {/* Informações sobre FGTS */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Informações sobre FGTS</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• <strong>Alíquota:</strong> Percentual aplicado sobre o salário para cálculo do FGTS</p>
              <p>• <strong>% Obrigatório:</strong> Percentual que deve ser depositado obrigatoriamente</p>
              <p>• <strong>% Opcional:</strong> Percentual adicional que pode ser depositado</p>
              <p>• <strong>Exemplo:</strong> Alíquota 8%, Obrigatório 100%, Opcional 0% = 8% do salário</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {mode === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>
            {mode !== 'view' && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
