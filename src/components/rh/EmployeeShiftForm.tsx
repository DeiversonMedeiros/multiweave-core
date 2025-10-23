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
import { EmployeeSchedule, WorkShift } from '@/integrations/supabase/rh-types';

interface EmployeeShiftFormProps {
  employeeShift?: EmployeeSchedule | null;
  workShifts: WorkShift[];
  employees: any[]; // Assumindo que existe um tipo Employee
  mode: 'create' | 'edit' | 'view';
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export function EmployeeShiftForm({ 
  employeeShift, 
  workShifts, 
  employees, 
  mode, 
  onSave, 
  isLoading = false 
}: EmployeeShiftFormProps) {
  const [formData, setFormData] = useState({
    funcionario_id: '',
    turno_id: '',
    data_inicio: '',
    data_fim: '',
    ativo: true,
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employeeShift) {
      setFormData({
        funcionario_id: employeeShift.funcionario_id || '',
        turno_id: employeeShift.turno_id || '',
        data_inicio: employeeShift.data_inicio || '',
        data_fim: employeeShift.data_fim || '',
        ativo: employeeShift.ativo || true,
        observacoes: employeeShift.observacoes || ''
      });
    }
  }, [employeeShift]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.funcionario_id) {
      newErrors.funcionario_id = 'Funcionário é obrigatório';
    }

    if (!formData.turno_id) {
      newErrors.turno_id = 'Turno é obrigatório';
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
    }

    if (formData.data_fim && formData.data_inicio && formData.data_fim < formData.data_inicio) {
      newErrors.data_fim = 'Data de fim deve ser maior que data de início';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Atribuição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="funcionario_id">Funcionário *</Label>
              <Select
                value={formData.funcionario_id}
                onValueChange={(value) => handleInputChange('funcionario_id', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger className={errors.funcionario_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.funcionario_id && <p className="text-sm text-red-500">{errors.funcionario_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="turno_id">Turno *</Label>
              <Select
                value={formData.turno_id}
                onValueChange={(value) => handleInputChange('turno_id', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger className={errors.turno_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {workShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      <div>
                        <div className="font-medium">{shift.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {shift.hora_inicio} - {shift.hora_fim}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.turno_id && <p className="text-sm text-red-500">{errors.turno_id}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Período de Vigência */}
      <Card>
        <CardHeader>
          <CardTitle>Período de Vigência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                className={errors.data_fim ? 'border-red-500' : ''}
              />
              {errors.data_fim && <p className="text-sm text-red-500">{errors.data_fim}</p>}
              <p className="text-xs text-muted-foreground">
                Deixe em branco para atribuição permanente
              </p>
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
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              disabled={isReadOnly}
              placeholder="Observações sobre a atribuição do turno..."
              rows={3}
            />
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

