import React, { useState, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Holiday, HolidayCreateData, HolidayUpdateData } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

interface HolidayFormProps {
  holiday?: Holiday | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: HolidayCreateData | HolidayUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const HolidayForm = forwardRef<HTMLFormElement, HolidayFormProps>(({ holiday, mode, onSave, onCancel, isLoading }, ref) => {
  const { selectedCompany } = useCompany();
  
  const [formData, setFormData] = useState({
    nome: '',
    data: '',
    tipo: '',
    descricao: '',
    ativo: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (holiday) {
      setFormData({
        nome: holiday.nome,
        data: holiday.data.split('T')[0],
        tipo: holiday.tipo,
        descricao: holiday.descricao || '',
        ativo: holiday.ativo,
      });
    }
  }, [holiday]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome do feriado é obrigatório';
    }

    if (!formData.data) {
      newErrors.data = 'Data é obrigatória';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo do feriado é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const data = {
        ...formData,
        company_id: selectedCompany?.id || '',
        ...(holiday && { id: holiday.id }),
      };

      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Feriado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Feriado *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Ex: Confraternização Universal"
                disabled={isReadOnly}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => handleInputChange('data', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data && (
                <p className="text-sm text-red-500">{errors.data}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => handleInputChange('tipo', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="pontos_facultativos">Pontos Facultativos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-red-500">{errors.tipo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ativo">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="ativo">
                  {formData.ativo ? 'Ativo' : 'Inativo'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Feriados inativos não são considerados nos cálculos de folha
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descrição adicional do feriado..."
              disabled={isReadOnly}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </div>
      )}

      {isReadOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={onCancel}>
            Fechar
          </Button>
        </div>
      )}
    </form>
  );
});

HolidayForm.displayName = 'HolidayForm';
