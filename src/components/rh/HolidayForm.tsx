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
    uf: '',
    municipio: '',
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
        uf: holiday.uf || '',
        municipio: holiday.municipio || '',
      });
    } else {
      // Reset form when creating new
      setFormData({
        nome: '',
        data: '',
        tipo: '',
        descricao: '',
        ativo: true,
        uf: '',
        municipio: '',
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

    // Validação condicional para UF e Município
    if (formData.tipo === 'estadual' || formData.tipo === 'municipal') {
      if (!formData.uf || formData.uf.length !== 2) {
        newErrors.uf = 'UF é obrigatória para feriados estaduais e municipais';
      }
    }

    if (formData.tipo === 'municipal') {
      if (!formData.municipio || !formData.municipio.trim()) {
        newErrors.municipio = 'Município é obrigatório para feriados municipais';
      }
    }

    // Limpar UF e município se for feriado nacional
    if (formData.tipo === 'nacional') {
      if (formData.uf || formData.municipio) {
        // Não é erro, mas vamos limpar os campos
        setFormData(prev => ({ ...prev, uf: '', municipio: '' }));
      }
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
      const data: any = {
        nome: formData.nome,
        data: formData.data,
        tipo: formData.tipo,
        descricao: formData.descricao || undefined,
        ativo: formData.ativo,
        company_id: selectedCompany?.id || '',
        ...(holiday && { id: holiday.id }),
      };

      // Incluir UF e município apenas se necessário
      if (formData.tipo === 'estadual' || formData.tipo === 'municipal') {
        data.uf = formData.uf.toUpperCase();
      }
      if (formData.tipo === 'municipal') {
        data.municipio = formData.municipio.trim();
      }

      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Limpar campos dependentes quando tipo muda
      if (field === 'tipo') {
        if (value === 'nacional') {
          newData.uf = '';
          newData.municipio = '';
        } else if (value === 'estadual') {
          newData.municipio = '';
        }
      }
      
      return newData;
    });
    
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

            {(formData.tipo === 'estadual' || formData.tipo === 'municipal') && (
              <div className="space-y-2">
                <Label htmlFor="uf">UF (Estado) *</Label>
                <Input
                  id="uf"
                  value={formData.uf}
                  onChange={(e) => handleInputChange('uf', e.target.value.toUpperCase())}
                  placeholder="Ex: SP"
                  maxLength={2}
                  disabled={isReadOnly}
                  className="uppercase"
                />
                {errors.uf && (
                  <p className="text-sm text-red-500">{errors.uf}</p>
                )}
              </div>
            )}

            {formData.tipo === 'municipal' && (
              <div className="space-y-2">
                <Label htmlFor="municipio">Município *</Label>
                <Input
                  id="municipio"
                  value={formData.municipio}
                  onChange={(e) => handleInputChange('municipio', e.target.value)}
                  placeholder="Ex: São Paulo"
                  disabled={isReadOnly}
                />
                {errors.municipio && (
                  <p className="text-sm text-red-500">{errors.municipio}</p>
                )}
              </div>
            )}

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
