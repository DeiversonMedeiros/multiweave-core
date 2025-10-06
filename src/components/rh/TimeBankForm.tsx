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
import { TimeBank, TimeBankCreateData, TimeBankUpdateData } from '@/integrations/supabase/rh-types';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useCompany } from '@/lib/company-context';

interface TimeBankFormProps {
  timeBank?: TimeBank | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: TimeBankCreateData | TimeBankUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TimeBankForm({ timeBank, mode, onSave, onCancel, isLoading }: TimeBankFormProps) {
  const { selectedCompany } = useCompany();
  const { data: employeesData } = useEmployees(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState({
    employee_id: '',
    data_registro: '',
    tipo_hora: '',
    quantidade_horas: '',
    motivo: '',
    status: 'pendente',
    data_expiracao: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (timeBank) {
      setFormData({
        employee_id: timeBank.employee_id,
        data_registro: timeBank.data_registro.split('T')[0],
        tipo_hora: timeBank.tipo_hora,
        quantidade_horas: timeBank.quantidade_horas.toString(),
        motivo: timeBank.motivo || '',
        status: timeBank.status,
        data_expiracao: timeBank.data_expiracao ? timeBank.data_expiracao.split('T')[0] : '',
        observacoes: timeBank.observacoes || '',
      });
    }
  }, [timeBank]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Funcionário é obrigatório';
    }

    if (!formData.data_registro) {
      newErrors.data_registro = 'Data do registro é obrigatória';
    }

    if (!formData.tipo_hora) {
      newErrors.tipo_hora = 'Tipo de hora é obrigatório';
    }

    if (!formData.quantidade_horas || parseFloat(formData.quantidade_horas) <= 0) {
      newErrors.quantidade_horas = 'Quantidade de horas deve ser maior que zero';
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
        quantidade_horas: parseFloat(formData.quantidade_horas),
        ...(timeBank && { id: timeBank.id }),
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
          <CardTitle>Informações do Registro</CardTitle>
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
              <Label htmlFor="data_registro">Data do Registro *</Label>
              <Input
                id="data_registro"
                type="date"
                value={formData.data_registro}
                onChange={(e) => handleInputChange('data_registro', e.target.value)}
                disabled={isReadOnly}
              />
              {errors.data_registro && (
                <p className="text-sm text-red-500">{errors.data_registro}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_hora">Tipo de Hora *</Label>
              <Select
                value={formData.tipo_hora}
                onValueChange={(value) => handleInputChange('tipo_hora', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extra">Hora Extra</SelectItem>
                  <SelectItem value="compensatoria">Hora Compensatória</SelectItem>
                  <SelectItem value="sobreaviso">Sobreaviso</SelectItem>
                  <SelectItem value="adicional_noturno">Adicional Noturno</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_hora && (
                <p className="text-sm text-red-500">{errors.tipo_hora}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade_horas">Quantidade de Horas *</Label>
              <Input
                id="quantidade_horas"
                type="number"
                step="0.5"
                min="0"
                value={formData.quantidade_horas}
                onChange={(e) => handleInputChange('quantidade_horas', e.target.value)}
                placeholder="Ex: 2.5 (2h30min)"
                disabled={isReadOnly}
              />
              {errors.quantidade_horas && (
                <p className="text-sm text-red-500">{errors.quantidade_horas}</p>
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
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                  <SelectItem value="utilizado">Utilizado</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_expiracao">Data de Expiração</Label>
              <Input
                id="data_expiracao"
                type="date"
                value={formData.data_expiracao}
                onChange={(e) => handleInputChange('data_expiracao', e.target.value)}
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Data limite para utilização das horas (opcional)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              value={formData.motivo}
              onChange={(e) => handleInputChange('motivo', e.target.value)}
              placeholder="Descreva o motivo das horas extras..."
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
