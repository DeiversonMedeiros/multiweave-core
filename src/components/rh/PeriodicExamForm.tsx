import React, { useState, useEffect } from 'react';
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
import { PeriodicExam, PeriodicExamCreateData, PeriodicExamUpdateData } from '@/integrations/supabase/rh-types';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useCompany } from '@/lib/company-context';

interface PeriodicExamFormProps {
  exam?: PeriodicExam | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: PeriodicExamCreateData | PeriodicExamUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PeriodicExamForm({ exam, mode, onSave, onCancel, isLoading }: PeriodicExamFormProps) {
  const { selectedCompany } = useCompany();
  const { data: employeesData } = useEmployees(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState({
    employee_id: '',
    tipo_exame: '',
    data_agendamento: '',
    data_realizacao: '',
    data_vencimento: '',
    status: 'agendado',
    medico_responsavel: '',
    clinica_local: '',
    observacoes: '',
    resultado: '',
    restricoes: '',
    custo: '',
    pago: false,
    data_pagamento: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (exam) {
      setFormData({
        employee_id: exam.employee_id,
        tipo_exame: exam.tipo_exame,
        data_agendamento: exam.data_agendamento.split('T')[0],
        data_realizacao: exam.data_realizacao ? exam.data_realizacao.split('T')[0] : '',
        data_vencimento: exam.data_vencimento.split('T')[0],
        status: exam.status,
        medico_responsavel: exam.medico_responsavel || '',
        clinica_local: exam.clinica_local || '',
        observacoes: exam.observacoes || '',
        resultado: exam.resultado || '',
        restricoes: exam.restricoes || '',
        custo: exam.custo ? exam.custo.toString() : '',
        pago: exam.pago,
        data_pagamento: exam.data_pagamento ? exam.data_pagamento.split('T')[0] : '',
      });
    }
  }, [exam]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Funcionário é obrigatório';
    }

    if (!formData.tipo_exame) {
      newErrors.tipo_exame = 'Tipo de exame é obrigatório';
    }

    if (!formData.data_agendamento) {
      newErrors.data_agendamento = 'Data de agendamento é obrigatória';
    }

    if (!formData.data_vencimento) {
      newErrors.data_vencimento = 'Data de vencimento é obrigatória';
    }

    if (formData.custo && isNaN(parseFloat(formData.custo))) {
      newErrors.custo = 'Custo deve ser um valor numérico válido';
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
        data_realizacao: formData.data_realizacao || undefined,
        custo: formData.custo ? parseFloat(formData.custo) : undefined,
        data_pagamento: formData.data_pagamento || undefined,
        ...(exam && { id: exam.id }),
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

  const employees = employeesData?.data || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Exame</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Funcionário *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => handleInputChange('employee_id', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome} - {employee.matricula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-red-500">{errors.employee_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_exame">Tipo de Exame *</Label>
              <Select
                value={formData.tipo_exame}
                onValueChange={(value) => handleInputChange('tipo_exame', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admissional">Admissional</SelectItem>
                  <SelectItem value="periodico">Periódico</SelectItem>
                  <SelectItem value="demissional">Demissional</SelectItem>
                  <SelectItem value="retorno_trabalho">Retorno ao Trabalho</SelectItem>
                  <SelectItem value="mudanca_funcao">Mudança de Função</SelectItem>
                  <SelectItem value="ambiental">Ambiental</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_exame && (
                <p className="text-sm text-red-500">{errors.tipo_exame}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_agendamento">Data de Agendamento *</Label>
              <Input
                id="data_agendamento"
                type="date"
                value={formData.data_agendamento}
                onChange={(e) => handleInputChange('data_agendamento', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_agendamento && (
                <p className="text-sm text-red-500">{errors.data_agendamento}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_realizacao">Data de Realização</Label>
              <Input
                id="data_realizacao"
                type="date"
                value={formData.data_realizacao}
                onChange={(e) => handleInputChange('data_realizacao', e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_vencimento && (
                <p className="text-sm text-red-500">{errors.data_vencimento}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="reagendado">Reagendado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medico_responsavel">Médico Responsável</Label>
              <Input
                id="medico_responsavel"
                value={formData.medico_responsavel}
                onChange={(e) => handleInputChange('medico_responsavel', e.target.value)}
                placeholder="Nome do médico"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinica_local">Clínica/Local</Label>
              <Input
                id="clinica_local"
                value={formData.clinica_local}
                onChange={(e) => handleInputChange('clinica_local', e.target.value)}
                placeholder="Nome da clínica ou local"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado</Label>
              <Select
                value={formData.resultado}
                onValueChange={(value) => handleInputChange('resultado', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apto">Apto</SelectItem>
                  <SelectItem value="inapto">Inapto</SelectItem>
                  <SelectItem value="apto_com_restricoes">Apto com Restrições</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo">Custo (R$)</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                min="0"
                value={formData.custo}
                onChange={(e) => handleInputChange('custo', e.target.value)}
                placeholder="0.00"
                disabled={isReadOnly}
              />
              {errors.custo && (
                <p className="text-sm text-red-500">{errors.custo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pago">Pago</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pago"
                  checked={formData.pago}
                  onCheckedChange={(checked) => handleInputChange('pago', checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="pago">
                  {formData.pago ? 'Sim' : 'Não'}
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data de Pagamento</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => handleInputChange('data_pagamento', e.target.value)}
                disabled={isReadOnly || !formData.pago}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restricoes">Restrições</Label>
            <Textarea
              id="restricoes"
              value={formData.restricoes}
              onChange={(e) => handleInputChange('restricoes', e.target.value)}
              placeholder="Descreva as restrições médicas..."
              disabled={isReadOnly}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
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
}
