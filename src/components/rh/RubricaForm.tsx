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
import { Rubrica, getRubricaTypes, getRubricaNatures } from '@/integrations/supabase/rh-types';

interface RubricaFormProps {
  rubrica?: Rubrica | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export function RubricaForm({ rubrica, mode, onSave, isLoading = false }: RubricaFormProps) {
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    tipo: 'provento' as 'provento' | 'desconto' | 'base_calculo' | 'informacao',
    categoria: '',
    natureza: 'normal' as 'normal' | 'eventual' | 'fixo' | 'variavel',
    calculo_automatico: false,
    formula_calculo: '',
    valor_fixo: '',
    percentual: '',
    base_calculo: 'salario_base',
    incidencia_ir: false,
    incidencia_inss: false,
    incidencia_fgts: false,
    incidencia_contribuicao_sindical: false,
    ordem_exibicao: 0,
    obrigatorio: false,
    ativo: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rubrica) {
      setFormData({
        codigo: rubrica.codigo,
        nome: rubrica.nome,
        descricao: rubrica.descricao || '',
        tipo: rubrica.tipo,
        categoria: rubrica.categoria || '',
        natureza: rubrica.natureza,
        calculo_automatico: rubrica.calculo_automatico,
        formula_calculo: rubrica.formula_calculo || '',
        valor_fixo: rubrica.valor_fixo?.toString() || '',
        percentual: rubrica.percentual?.toString() || '',
        base_calculo: rubrica.base_calculo,
        incidencia_ir: rubrica.incidencia_ir,
        incidencia_inss: rubrica.incidencia_inss,
        incidencia_fgts: rubrica.incidencia_fgts,
        incidencia_contribuicao_sindical: rubrica.incidencia_contribuicao_sindical,
        ordem_exibicao: rubrica.ordem_exibicao,
        obrigatorio: rubrica.obrigatorio,
        ativo: rubrica.ativo,
      });
    }
  }, [rubrica]);

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

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (formData.calculo_automatico && !formData.formula_calculo.trim()) {
      newErrors.formula_calculo = 'Fórmula de cálculo é obrigatória quando cálculo automático está ativo';
    }

    if (formData.valor_fixo && (isNaN(Number(formData.valor_fixo)) || Number(formData.valor_fixo) < 0)) {
      newErrors.valor_fixo = 'Valor fixo deve ser um número positivo';
    }

    if (formData.percentual && (isNaN(Number(formData.percentual)) || Number(formData.percentual) < 0 || Number(formData.percentual) > 100)) {
      newErrors.percentual = 'Percentual deve estar entre 0 e 100';
    }

    if (formData.ordem_exibicao < 0) {
      newErrors.ordem_exibicao = 'Ordem de exibição não pode ser negativa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const dataToSave = {
        ...formData,
        valor_fixo: formData.valor_fixo ? Number(formData.valor_fixo) : undefined,
        percentual: formData.percentual ? Number(formData.percentual) / 100 : undefined, // Converter para decimal
        ordem_exibicao: Number(formData.ordem_exibicao),
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
                placeholder="Ex: SAL_BASE"
              />
              {errors.codigo && <p className="text-sm text-red-500">{errors.codigo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                disabled={isReadOnly}
                className={errors.nome ? 'border-red-500' : ''}
                placeholder="Ex: Salário Base"
              />
              {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              disabled={isReadOnly}
              placeholder="Descrição da rubrica"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => handleInputChange('tipo', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getRubricaTypes().map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="natureza">Natureza</Label>
              <Select
                value={formData.natureza}
                onValueChange={(value) => handleInputChange('natureza', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getRubricaNatures().map((natureza) => (
                    <SelectItem key={natureza.value} value={natureza.value}>
                      {natureza.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => handleInputChange('categoria', e.target.value)}
                disabled={isReadOnly}
                placeholder="Ex: Salários"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo */}
      <Card>
        <CardHeader>
          <CardTitle>Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="calculo_automatico"
              checked={formData.calculo_automatico}
              onCheckedChange={(checked) => handleInputChange('calculo_automatico', checked)}
              disabled={isReadOnly}
            />
            <Label htmlFor="calculo_automatico">Cálculo Automático</Label>
          </div>

          {formData.calculo_automatico && (
            <div className="space-y-2">
              <Label htmlFor="formula_calculo">Fórmula de Cálculo *</Label>
              <Textarea
                id="formula_calculo"
                value={formData.formula_calculo}
                onChange={(e) => handleInputChange('formula_calculo', e.target.value)}
                disabled={isReadOnly}
                className={errors.formula_calculo ? 'border-red-500' : ''}
                placeholder="Ex: salario_base * 0.1"
              />
              {errors.formula_calculo && <p className="text-sm text-red-500">{errors.formula_calculo}</p>}
            </div>
          )}

          {!formData.calculo_automatico && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor_fixo">Valor Fixo (R$)</Label>
                <Input
                  id="valor_fixo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_fixo}
                  onChange={(e) => handleInputChange('valor_fixo', e.target.value)}
                  disabled={isReadOnly}
                  className={errors.valor_fixo ? 'border-red-500' : ''}
                  placeholder="0.00"
                />
                {errors.valor_fixo && <p className="text-sm text-red-500">{errors.valor_fixo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentual">Percentual (%)</Label>
                <Input
                  id="percentual"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percentual}
                  onChange={(e) => handleInputChange('percentual', e.target.value)}
                  disabled={isReadOnly}
                  className={errors.percentual ? 'border-red-500' : ''}
                  placeholder="0.00"
                />
                {errors.percentual && <p className="text-sm text-red-500">{errors.percentual}</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="base_calculo">Base de Cálculo</Label>
            <Select
              value={formData.base_calculo}
              onValueChange={(value) => handleInputChange('base_calculo', value)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salario_base">Salário Base</SelectItem>
                <SelectItem value="salario_familia">Salário Família</SelectItem>
                <SelectItem value="total_proventos">Total de Proventos</SelectItem>
                <SelectItem value="total_descontos">Total de Descontos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidências */}
      <Card>
        <CardHeader>
          <CardTitle>Incidências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="incidencia_ir"
                checked={formData.incidencia_ir}
                onCheckedChange={(checked) => handleInputChange('incidencia_ir', checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="incidencia_ir">Incide no IR</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incidencia_inss"
                checked={formData.incidencia_inss}
                onCheckedChange={(checked) => handleInputChange('incidencia_inss', checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="incidencia_inss">Incide no INSS</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incidencia_fgts"
                checked={formData.incidencia_fgts}
                onCheckedChange={(checked) => handleInputChange('incidencia_fgts', checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="incidencia_fgts">Incide no FGTS</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incidencia_contribuicao_sindical"
                checked={formData.incidencia_contribuicao_sindical}
                onCheckedChange={(checked) => handleInputChange('incidencia_contribuicao_sindical', checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="incidencia_contribuicao_sindical">Incide na Contribuição Sindical</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ordem_exibicao">Ordem de Exibição</Label>
              <Input
                id="ordem_exibicao"
                type="number"
                min="0"
                value={formData.ordem_exibicao}
                onChange={(e) => handleInputChange('ordem_exibicao', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
                className={errors.ordem_exibicao ? 'border-red-500' : ''}
              />
              {errors.ordem_exibicao && <p className="text-sm text-red-500">{errors.ordem_exibicao}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="obrigatorio"
                checked={formData.obrigatorio}
                onCheckedChange={(checked) => handleInputChange('obrigatorio', checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="obrigatorio">Obrigatório</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
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

