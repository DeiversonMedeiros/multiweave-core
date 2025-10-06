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
import { EmploymentContractWithEmployee } from '@/integrations/supabase/rh-types';

interface EmploymentContractFormProps {
  contract?: EmploymentContractWithEmployee | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export function EmploymentContractForm({ contract, mode, onSave, isLoading = false }: EmploymentContractFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    numero_contrato: '',
    tipo_contrato: 'CLT' as 'CLT' | 'PJ' | 'Estagiário' | 'Terceirizado' | 'Temporário' | 'Freelancer',
    data_inicio: '',
    data_fim: '',
    periodo_experiencia: 90,
    salario_base: 0,
    carga_horaria_semanal: 40,
    regime_trabalho: 'tempo_integral' as 'tempo_integral' | 'meio_periodo' | 'reducao_jornada' | 'banco_horas',
    tipo_jornada: 'normal' as 'normal' | 'noturna' | 'especial',
    beneficios: '{}',
    clausulas_especiais: '',
    status: 'ativo' as 'ativo' | 'suspenso' | 'encerrado' | 'rescisao',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (contract) {
      setFormData({
        employee_id: contract.employee_id,
        numero_contrato: contract.numero_contrato,
        tipo_contrato: contract.tipo_contrato,
        data_inicio: contract.data_inicio,
        data_fim: contract.data_fim || '',
        periodo_experiencia: contract.periodo_experiencia,
        salario_base: contract.salario_base,
        carga_horaria_semanal: contract.carga_horaria_semanal,
        regime_trabalho: contract.regime_trabalho,
        tipo_jornada: contract.tipo_jornada,
        beneficios: JSON.stringify(contract.beneficios),
        clausulas_especiais: contract.clausulas_especiais || '',
        status: contract.status,
        observacoes: contract.observacoes || '',
      });
    }
  }, [contract]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Funcionário é obrigatório';
    }

    if (!formData.numero_contrato.trim()) {
      newErrors.numero_contrato = 'Número do contrato é obrigatório';
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
    }

    if (!formData.salario_base || formData.salario_base <= 0) {
      newErrors.salario_base = 'Salário base deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const dataToSave = {
        ...formData,
        beneficios: JSON.parse(formData.beneficios),
      };
      onSave(dataToSave);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações do Contrato */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numero_contrato">Número do Contrato *</Label>
              <Input
                id="numero_contrato"
                value={formData.numero_contrato}
                onChange={(e) => handleInputChange('numero_contrato', e.target.value)}
                disabled={isReadOnly}
                className={errors.numero_contrato ? 'border-red-500' : ''}
              />
              {errors.numero_contrato && <p className="text-sm text-red-500">{errors.numero_contrato}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_contrato">Tipo de Contrato *</Label>
              <Select
                value={formData.tipo_contrato}
                onValueChange={(value) => handleInputChange('tipo_contrato', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Estagiário">Estagiário</SelectItem>
                  <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                  <SelectItem value="Temporário">Temporário</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                disabled={isReadOnly}
                className={errors.data_inicio ? 'border-red-500' : ''}
              />
              {errors.data_inicio && <p className="text-sm text-red-500">{errors.data_inicio}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={formData.data_fim}
                onChange={(e) => handleInputChange('data_fim', e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Condições de Trabalho */}
      <Card>
        <CardHeader>
          <CardTitle>Condições de Trabalho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salario_base">Salário Base *</Label>
              <Input
                id="salario_base"
                type="number"
                step="0.01"
                min="0"
                value={formData.salario_base}
                onChange={(e) => handleInputChange('salario_base', parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className={errors.salario_base ? 'border-red-500' : ''}
              />
              {errors.salario_base && <p className="text-sm text-red-500">{errors.salario_base}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="carga_horaria_semanal">Carga Horária Semanal</Label>
              <Input
                id="carga_horaria_semanal"
                type="number"
                min="1"
                max="168"
                value={formData.carga_horaria_semanal}
                onChange={(e) => handleInputChange('carga_horaria_semanal', parseInt(e.target.value) || 40)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="regime_trabalho">Regime de Trabalho</Label>
              <Select
                value={formData.regime_trabalho}
                onValueChange={(value) => handleInputChange('regime_trabalho', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tempo_integral">Tempo Integral</SelectItem>
                  <SelectItem value="meio_periodo">Meio Período</SelectItem>
                  <SelectItem value="reducao_jornada">Redução de Jornada</SelectItem>
                  <SelectItem value="banco_horas">Banco de Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_jornada">Tipo de Jornada</Label>
              <Select
                value={formData.tipo_jornada}
                onValueChange={(value) => handleInputChange('tipo_jornada', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="noturna">Noturna</SelectItem>
                  <SelectItem value="especial">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodo_experiencia">Período de Experiência (dias)</Label>
            <Input
              id="periodo_experiencia"
              type="number"
              min="0"
              value={formData.periodo_experiencia}
              onChange={(e) => handleInputChange('periodo_experiencia', parseInt(e.target.value) || 90)}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clausulas_especiais">Cláusulas Especiais</Label>
            <Textarea
              id="clausulas_especiais"
              value={formData.clausulas_especiais}
              onChange={(e) => handleInputChange('clausulas_especiais', e.target.value)}
              disabled={isReadOnly}
              placeholder="Cláusulas especiais do contrato"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              disabled={isReadOnly}
              placeholder="Observações adicionais"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="rescisao">Rescisão</SelectItem>
              </SelectContent>
            </Select>
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

