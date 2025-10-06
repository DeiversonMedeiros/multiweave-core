import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateIrrfBracket, useUpdateIrrfBracket } from '@/hooks/rh/useIrrfBrackets';
import { IrrfBracket, IrrfBracketCreateData } from '@/integrations/supabase/rh-types';
import { validateIrrfBracket } from '@/services/rh/irrfBracketsService';
import { toast } from 'sonner';

interface IrrfBracketFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  bracket?: IrrfBracket | null;
}

export default function IrrfBracketForm({ isOpen, onClose, mode, bracket }: IrrfBracketFormProps) {
  const [formData, setFormData] = useState<IrrfBracketCreateData>({
    codigo: '',
    descricao: '',
    valor_minimo: 0,
    valor_maximo: 0,
    aliquota: 0,
    valor_deducao: 0,
    ano_vigencia: new Date().getFullYear(),
    mes_vigencia: new Date().getMonth() + 1,
    ativo: true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks
  const createMutation = useCreateIrrfBracket();
  const updateMutation = useUpdateIrrfBracket();

  // Preencher formulário quando bracket for fornecido
  useEffect(() => {
    if (bracket && (mode === 'edit' || mode === 'view')) {
      setFormData({
        codigo: bracket.codigo,
        descricao: bracket.descricao,
        valor_minimo: bracket.valor_minimo,
        valor_maximo: bracket.valor_maximo,
        aliquota: bracket.aliquota,
        valor_deducao: bracket.valor_deducao,
        ano_vigencia: bracket.ano_vigencia,
        mes_vigencia: bracket.mes_vigencia,
        ativo: bracket.ativo,
      });
    } else {
      // Reset form for create mode
      setFormData({
        codigo: '',
        descricao: '',
        valor_minimo: 0,
        valor_maximo: 0,
        aliquota: 0,
        valor_deducao: 0,
        ano_vigencia: new Date().getFullYear(),
        mes_vigencia: new Date().getMonth() + 1,
        ativo: true,
      });
    }
    setErrors([]);
  }, [bracket, mode, isOpen]);

  const handleInputChange = (field: keyof IrrfBracketCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateIrrfBracket(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(formData);
        toast.success('Faixa IRRF criada com sucesso!');
      } else if (mode === 'edit' && bracket) {
        await updateMutation.mutateAsync({
          id: bracket.id,
          ...formData
        });
        toast.success('Faixa IRRF atualizada com sucesso!');
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar faixa IRRF:', error);
      toast.error('Erro ao salvar faixa IRRF');
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
            {mode === 'create' && 'Nova Faixa IRRF'}
            {mode === 'edit' && 'Editar Faixa IRRF'}
            {mode === 'view' && 'Visualizar Faixa IRRF'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Crie uma nova faixa de Imposto de Renda Retido na Fonte'}
            {mode === 'edit' && 'Edite as informações da faixa IRRF'}
            {mode === 'view' && 'Visualize as informações da faixa IRRF'}
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
                placeholder="Ex: IRRF_FAIXA_1"
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
                placeholder="Ex: 1ª Faixa - Até R$ 1.903,98"
                disabled={isDisabled}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valor Mínimo */}
            <div className="space-y-2">
              <Label htmlFor="valor_minimo">Valor Mínimo *</Label>
              <Input
                id="valor_minimo"
                type="number"
                step="0.01"
                value={formData.valor_minimo}
                onChange={(e) => handleInputChange('valor_minimo', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={isDisabled}
                required
              />
            </div>

            {/* Valor Máximo */}
            <div className="space-y-2">
              <Label htmlFor="valor_maximo">Valor Máximo *</Label>
              <Input
                id="valor_maximo"
                type="number"
                step="0.01"
                value={formData.valor_maximo}
                onChange={(e) => handleInputChange('valor_maximo', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={isDisabled}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alíquota */}
            <div className="space-y-2">
              <Label htmlFor="aliquota">Alíquota *</Label>
              <Input
                id="aliquota"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.aliquota}
                onChange={(e) => handleInputChange('aliquota', parseFloat(e.target.value) || 0)}
                placeholder="0.0750"
                disabled={isDisabled}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 0.0750 = 7.50%
              </p>
            </div>

            {/* Valor de Dedução */}
            <div className="space-y-2">
              <Label htmlFor="valor_deducao">Valor de Dedução *</Label>
              <Input
                id="valor_deducao"
                type="number"
                step="0.01"
                value={formData.valor_deducao}
                onChange={(e) => handleInputChange('valor_deducao', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={isDisabled}
                required
              />
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
