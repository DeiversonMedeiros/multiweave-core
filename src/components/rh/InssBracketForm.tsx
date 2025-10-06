import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { InssBracket, getMonths, getYears } from '@/integrations/supabase/rh-types';

interface InssBracketFormProps {
  bracket?: InssBracket | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export function InssBracketForm({ bracket, mode, onSave, isLoading = false }: InssBracketFormProps) {
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    ano_vigencia: new Date().getFullYear(),
    mes_vigencia: new Date().getMonth() + 1,
    valor_minimo: '',
    valor_maximo: '',
    aliquota: '',
    valor_deducao: '',
    ativo: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (bracket) {
      setFormData({
        codigo: bracket.codigo,
        descricao: bracket.descricao,
        ano_vigencia: bracket.ano_vigencia,
        mes_vigencia: bracket.mes_vigencia,
        valor_minimo: bracket.valor_minimo.toString(),
        valor_maximo: bracket.valor_maximo?.toString() || '',
        aliquota: (bracket.aliquota * 100).toString(), // Converter para percentual
        valor_deducao: bracket.valor_deducao.toString(),
        ativo: bracket.ativo,
      });
    }
  }, [bracket]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'Código é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.ano_vigencia || formData.ano_vigencia < 2020 || formData.ano_vigencia > 2030) {
      newErrors.ano_vigencia = 'Ano deve estar entre 2020 e 2030';
    }

    if (!formData.mes_vigencia || formData.mes_vigencia < 1 || formData.mes_vigencia > 12) {
      newErrors.mes_vigencia = 'Mês deve estar entre 1 e 12';
    }

    if (!formData.valor_minimo || isNaN(Number(formData.valor_minimo)) || Number(formData.valor_minimo) < 0) {
      newErrors.valor_minimo = 'Valor mínimo deve ser um número positivo';
    }

    if (formData.valor_maximo && (isNaN(Number(formData.valor_maximo)) || Number(formData.valor_maximo) < Number(formData.valor_minimo))) {
      newErrors.valor_maximo = 'Valor máximo deve ser maior que o mínimo';
    }

    if (!formData.aliquota || isNaN(Number(formData.aliquota)) || Number(formData.aliquota) < 0 || Number(formData.aliquota) > 100) {
      newErrors.aliquota = 'Alíquota deve estar entre 0 e 100%';
    }

    if (formData.valor_deducao && (isNaN(Number(formData.valor_deducao)) || Number(formData.valor_deducao) < 0)) {
      newErrors.valor_deducao = 'Valor de dedução deve ser um número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const dataToSave = {
        ...formData,
        valor_minimo: Number(formData.valor_minimo),
        valor_maximo: formData.valor_maximo ? Number(formData.valor_maximo) : undefined,
        aliquota: Number(formData.aliquota) / 100, // Converter para decimal
        valor_deducao: Number(formData.valor_deducao) || 0,
        ano_vigencia: Number(formData.ano_vigencia),
        mes_vigencia: Number(formData.mes_vigencia),
      };
      onSave(dataToSave);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                disabled={isReadOnly}
                className={errors.codigo ? 'border-red-500' : ''}
                placeholder="Ex: INSS_FAIXA_1"
              />
              {errors.codigo && <p className="text-sm text-red-500">{errors.codigo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                disabled={isReadOnly}
                className={errors.descricao ? 'border-red-500' : ''}
                placeholder="Ex: 1ª Faixa - Até R$ 1.412,00"
              />
              {errors.descricao && <p className="text-sm text-red-500">{errors.descricao}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ano_vigencia">Ano de Vigência *</Label>
              <Select
                value={formData.ano_vigencia.toString()}
                onValueChange={(value) => handleInputChange('ano_vigencia', parseInt(value))}
                disabled={isReadOnly}
              >
                <SelectTrigger className={errors.ano_vigencia ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYears().map((year) => (
                    <SelectItem key={year.value} value={year.value.toString()}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ano_vigencia && <p className="text-sm text-red-500">{errors.ano_vigencia}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes_vigencia">Mês de Vigência *</Label>
              <Select
                value={formData.mes_vigencia.toString()}
                onValueChange={(value) => handleInputChange('mes_vigencia', parseInt(value))}
                disabled={isReadOnly}
              >
                <SelectTrigger className={errors.mes_vigencia ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonths().map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mes_vigencia && <p className="text-sm text-red-500">{errors.mes_vigencia}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração da Faixa */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Faixa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor_minimo">Valor Mínimo (R$) *</Label>
              <Input
                id="valor_minimo"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_minimo}
                onChange={(e) => handleInputChange('valor_minimo', e.target.value)}
                disabled={isReadOnly}
                className={errors.valor_minimo ? 'border-red-500' : ''}
                placeholder="0.00"
              />
              {errors.valor_minimo && <p className="text-sm text-red-500">{errors.valor_minimo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_maximo">Valor Máximo (R$)</Label>
              <Input
                id="valor_maximo"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_maximo}
                onChange={(e) => handleInputChange('valor_maximo', e.target.value)}
                disabled={isReadOnly}
                className={errors.valor_maximo ? 'border-red-500' : ''}
                placeholder="Deixe vazio para sem limite"
              />
              {errors.valor_maximo && <p className="text-sm text-red-500">{errors.valor_maximo}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aliquota">Alíquota (%) *</Label>
              <Input
                id="aliquota"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.aliquota}
                onChange={(e) => handleInputChange('aliquota', e.target.value)}
                disabled={isReadOnly}
                className={errors.aliquota ? 'border-red-500' : ''}
                placeholder="7.50"
              />
              {errors.aliquota && <p className="text-sm text-red-500">{errors.aliquota}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_deducao">Valor de Dedução (R$)</Label>
              <Input
                id="valor_deducao"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_deducao}
                onChange={(e) => handleInputChange('valor_deducao', e.target.value)}
                disabled={isReadOnly}
                className={errors.valor_deducao ? 'border-red-500' : ''}
                placeholder="0.00"
              />
              {errors.valor_deducao && <p className="text-sm text-red-500">{errors.valor_deducao}</p>}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Informações Importantes:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A alíquota deve ser informada em percentual (ex: 7.50 para 7,5%)</li>
              <li>• O valor de dedução é subtraído do cálculo final</li>
              <li>• Deixe o valor máximo vazio para faixas sem limite superior</li>
              <li>• As faixas são aplicadas em ordem crescente de valor mínimo</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => handleInputChange('ativo', checked)}
              disabled={isReadOnly}
            />
            <Label htmlFor="ativo">Ativo</Label>
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      {!isReadOnly && (
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      )}
    </form>
  );
}
