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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DisciplinaryAction, DisciplinaryActionCreateData, DisciplinaryActionUpdateData } from '@/integrations/supabase/rh-types';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useCompany } from '@/lib/company-context';

interface DisciplinaryActionFormProps {
  action?: DisciplinaryAction | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: DisciplinaryActionCreateData | DisciplinaryActionUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DisciplinaryActionForm({ action, mode, onSave, onCancel, isLoading }: DisciplinaryActionFormProps) {
  const { selectedCompany } = useCompany();
  const { data: employeesData } = useEmployees(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState({
    employee_id: '',
    tipo_acao: '',
    data_ocorrencia: '',
    data_aplicacao: '',
    gravidade: '',
    motivo: '',
    descricao_ocorrencia: '',
    medidas_corretivas: '',
    status: 'ativo',
    aplicado_por: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (action) {
      setFormData({
        employee_id: action.employee_id,
        tipo_acao: action.tipo_acao,
        data_ocorrencia: action.data_ocorrencia.split('T')[0],
        data_aplicacao: action.data_aplicacao.split('T')[0],
        gravidade: action.gravidade,
        motivo: action.motivo,
        descricao_ocorrencia: action.descricao_ocorrencia,
        medidas_corretivas: action.medidas_corretivas || '',
        status: action.status,
        aplicado_por: action.aplicado_por || '',
        observacoes: action.observacoes || '',
      });
    }
  }, [action]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Funcionário é obrigatório';
    }

    if (!formData.tipo_acao) {
      newErrors.tipo_acao = 'Tipo de ação é obrigatório';
    }

    if (!formData.data_ocorrencia) {
      newErrors.data_ocorrencia = 'Data da ocorrência é obrigatória';
    }

    if (!formData.data_aplicacao) {
      newErrors.data_aplicacao = 'Data de aplicação é obrigatória';
    }

    if (!formData.gravidade) {
      newErrors.gravidade = 'Gravidade é obrigatória';
    }

    if (!formData.motivo) {
      newErrors.motivo = 'Motivo é obrigatório';
    }

    if (!formData.descricao_ocorrencia) {
      newErrors.descricao_ocorrencia = 'Descrição da ocorrência é obrigatória';
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
        ...(action && { id: action.id }),
      };

      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
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
          <CardTitle>Informações da Ação Disciplinar</CardTitle>
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
              <Label htmlFor="tipo_acao">Tipo de Ação *</Label>
              <Select
                value={formData.tipo_acao}
                onValueChange={(value) => handleInputChange('tipo_acao', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertencia">Advertência</SelectItem>
                  <SelectItem value="suspensao">Suspensão</SelectItem>
                  <SelectItem value="demissao_justa_causa">Demissão por Justa Causa</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_acao && (
                <p className="text-sm text-red-500">{errors.tipo_acao}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_ocorrencia">Data da Ocorrência *</Label>
              <Input
                id="data_ocorrencia"
                type="date"
                value={formData.data_ocorrencia}
                onChange={(e) => handleInputChange('data_ocorrencia', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_ocorrencia && (
                <p className="text-sm text-red-500">{errors.data_ocorrencia}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_aplicacao">Data de Aplicação *</Label>
              <Input
                id="data_aplicacao"
                type="date"
                value={formData.data_aplicacao}
                onChange={(e) => handleInputChange('data_aplicacao', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_aplicacao && (
                <p className="text-sm text-red-500">{errors.data_aplicacao}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gravidade">Gravidade *</Label>
              <Select
                value={formData.gravidade}
                onValueChange={(value) => handleInputChange('gravidade', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a gravidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                  <SelectItem value="gravissima">Gravíssima</SelectItem>
                </SelectContent>
              </Select>
              {errors.gravidade && (
                <p className="text-sm text-red-500">{errors.gravidade}</p>
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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Input
              id="motivo"
              value={formData.motivo}
              onChange={(e) => handleInputChange('motivo', e.target.value)}
              placeholder="Motivo da ação disciplinar"
              disabled={isReadOnly}
            />
            {errors.motivo && (
              <p className="text-sm text-red-500">{errors.motivo}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao_ocorrencia">Descrição da Ocorrência *</Label>
            <Textarea
              id="descricao_ocorrencia"
              value={formData.descricao_ocorrencia}
              onChange={(e) => handleInputChange('descricao_ocorrencia', e.target.value)}
              placeholder="Descreva detalhadamente a ocorrência..."
              disabled={isReadOnly}
              rows={4}
            />
            {errors.descricao_ocorrencia && (
              <p className="text-sm text-red-500">{errors.descricao_ocorrencia}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="medidas_corretivas">Medidas Corretivas</Label>
            <Textarea
              id="medidas_corretivas"
              value={formData.medidas_corretivas}
              onChange={(e) => handleInputChange('medidas_corretivas', e.target.value)}
              placeholder="Descreva as medidas corretivas aplicadas..."
              disabled={isReadOnly}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aplicado_por">Aplicado Por</Label>
            <Input
              id="aplicado_por"
              value={formData.aplicado_por}
              onChange={(e) => handleInputChange('aplicado_por', e.target.value)}
              placeholder="Nome da pessoa que aplicou a ação"
              disabled={isReadOnly}
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
