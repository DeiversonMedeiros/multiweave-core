import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useBankHoursConfig } from '../../hooks/useBankHours';
import { BankHoursConfigForm, BANK_HOURS_DEFAULTS } from '../../integrations/supabase/bank-hours-types';
import { useEmployees } from '../../hooks/rh/useEmployees';

interface BankHoursConfigProps {
  companyId: string;
}

export function BankHoursConfig({ companyId }: BankHoursConfigProps) {
  const { configs, loading, error, createConfig, updateConfig, deleteConfig } = useBankHoursConfig(companyId);
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankHoursConfigForm>({
    employee_id: '',
    has_bank_hours: true,
    accumulation_period_months: BANK_HOURS_DEFAULTS.accumulation_period_months,
    max_accumulation_hours: BANK_HOURS_DEFAULTS.max_accumulation_hours,
    compensation_rate: BANK_HOURS_DEFAULTS.compensation_rate,
    auto_compensate: BANK_HOURS_DEFAULTS.auto_compensate,
    compensation_priority: BANK_HOURS_DEFAULTS.compensation_priority,
    expires_after_months: BANK_HOURS_DEFAULTS.expires_after_months,
    allow_negative_balance: BANK_HOURS_DEFAULTS.allow_negative_balance,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await updateConfig(editingConfig, formData);
      } else {
        await createConfig(formData);
      }
      setShowForm(false);
      setEditingConfig(null);
      setFormData({
        employee_id: '',
        has_bank_hours: true,
        accumulation_period_months: BANK_HOURS_DEFAULTS.accumulation_period_months,
        max_accumulation_hours: BANK_HOURS_DEFAULTS.max_accumulation_hours,
        compensation_rate: BANK_HOURS_DEFAULTS.compensation_rate,
        auto_compensate: BANK_HOURS_DEFAULTS.auto_compensate,
        compensation_priority: BANK_HOURS_DEFAULTS.compensation_priority,
        expires_after_months: BANK_HOURS_DEFAULTS.expires_after_months,
        allow_negative_balance: BANK_HOURS_DEFAULTS.allow_negative_balance,
      });
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
    }
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config.id);
    setFormData({
      employee_id: config.employee_id,
      has_bank_hours: config.has_bank_hours,
      accumulation_period_months: config.accumulation_period_months,
      max_accumulation_hours: config.max_accumulation_hours,
      compensation_rate: config.compensation_rate,
      auto_compensate: config.auto_compensate,
      compensation_priority: config.compensation_priority,
      expires_after_months: config.expires_after_months,
      allow_negative_balance: config.allow_negative_balance,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
    setFormData({
      employee_id: '',
      has_bank_hours: true,
      accumulation_period_months: BANK_HOURS_DEFAULTS.accumulation_period_months,
      max_accumulation_hours: BANK_HOURS_DEFAULTS.max_accumulation_hours,
      compensation_rate: BANK_HOURS_DEFAULTS.compensation_rate,
      auto_compensate: BANK_HOURS_DEFAULTS.auto_compensate,
      compensation_priority: BANK_HOURS_DEFAULTS.compensation_priority,
      expires_after_months: BANK_HOURS_DEFAULTS.expires_after_months,
      allow_negative_balance: BANK_HOURS_DEFAULTS.allow_negative_balance,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta configuração?')) {
      try {
        await deleteConfig(id);
      } catch (err) {
        console.error('Erro ao excluir configuração:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração do Banco de Horas</h2>
          <p className="text-muted-foreground">
            Configure quais colaboradores terão banco de horas e os parâmetros de acumulação
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
            </CardTitle>
            <CardDescription>
              Configure os parâmetros do banco de horas para o colaborador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Colaborador *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                    disabled={employeesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter(emp => !configs.some(c => c.employee_id === emp.id))
                        .map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.nome} {employee.matricula && `(${employee.matricula})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_bank_hours"
                    checked={formData.has_bank_hours}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_bank_hours: checked }))}
                  />
                  <Label htmlFor="has_bank_hours">Possui Banco de Horas</Label>
                </div>
              </div>

              {formData.has_bank_hours && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accumulation_period_months">Período de Acumulação (meses)</Label>
                      <Input
                        id="accumulation_period_months"
                        type="number"
                        min="1"
                        max="24"
                        value={formData.accumulation_period_months}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          accumulation_period_months: parseInt(e.target.value) || 12 
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_accumulation_hours">Máximo de Horas (h)</Label>
                      <Input
                        id="max_accumulation_hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.max_accumulation_hours}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          max_accumulation_hours: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="compensation_rate">Taxa de Compensação</Label>
                      <Input
                        id="compensation_rate"
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="2.0"
                        value={formData.compensation_rate}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          compensation_rate: parseFloat(e.target.value) || 1.0 
                        }))}
                      />
                      <p className="text-sm text-muted-foreground">
                        1.0 = 1:1, 1.5 = 1.5:1, etc.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expires_after_months">Expira Após (meses)</Label>
                      <Input
                        id="expires_after_months"
                        type="number"
                        min="1"
                        max="24"
                        value={formData.expires_after_months}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          expires_after_months: parseInt(e.target.value) || 12 
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto_compensate"
                        checked={formData.auto_compensate}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_compensate: checked }))}
                      />
                      <Label htmlFor="auto_compensate">Compensação Automática</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow_negative_balance"
                        checked={formData.allow_negative_balance}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_negative_balance: checked }))}
                      />
                      <Label htmlFor="allow_negative_balance">Permitir Saldo Negativo</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="compensation_priority">Prioridade de Compensação</Label>
                      <Select
                        value={formData.compensation_priority}
                        onValueChange={(value: 'fifo' | 'lifo' | 'manual') => 
                          setFormData(prev => ({ ...prev, compensation_priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fifo">FIFO (Primeiro a entrar, primeiro a sair)</SelectItem>
                          <SelectItem value="lifo">LIFO (Último a entrar, primeiro a sair)</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingConfig ? 'Atualizar' : 'Criar'} Configuração
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">
                      {config.employee?.nome || 'Colaborador não encontrado'}
                    </h3>
                    {config.employee?.matricula && (
                      <Badge variant="secondary">{config.employee.matricula}</Badge>
                    )}
                    <Badge variant={config.has_bank_hours ? 'default' : 'secondary'}>
                      {config.has_bank_hours ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  {config.has_bank_hours && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Período:</span> {config.accumulation_period_months} meses
                      </div>
                      <div>
                        <span className="font-medium">Máximo:</span> {config.max_accumulation_hours}h
                      </div>
                      <div>
                        <span className="font-medium">Taxa:</span> {config.compensation_rate}:1
                      </div>
                      <div>
                        <span className="font-medium">Expira:</span> {config.expires_after_months} meses
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm">
                    {config.auto_compensate && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Compensação automática</span>
                      </div>
                    )}
                    {config.allow_negative_balance && (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span>Saldo negativo permitido</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(config)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(config.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Configure o banco de horas para os colaboradores que precisam desta funcionalidade.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Configuração
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
