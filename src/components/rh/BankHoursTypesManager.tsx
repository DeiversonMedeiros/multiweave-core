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
  Star,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useBankHoursTypes, useCreateBankHoursType, useUpdateBankHoursType, useDeleteBankHoursType, useSetDefaultBankHoursType } from '../../hooks/useBankHoursTypes';
import { BankHoursTypeForm, BANK_HOURS_TYPE_DEFAULTS } from '../../integrations/supabase/bank-hours-types-v2';

interface BankHoursTypesManagerProps {
  companyId: string;
}

export function BankHoursTypesManager({ companyId }: BankHoursTypesManagerProps) {
  const { data: typesData, loading, error } = useBankHoursTypes();
  const createType = useCreateBankHoursType();
  const updateType = useUpdateBankHoursType();
  const deleteType = useDeleteBankHoursType();
  const setDefaultType = useSetDefaultBankHoursType();
  
  const types = typesData?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankHoursTypeForm>({
    name: '',
    description: '',
    code: '',
    has_bank_hours: true,
    accumulation_period_months: BANK_HOURS_TYPE_DEFAULTS.accumulation_period_months,
    max_accumulation_hours: BANK_HOURS_TYPE_DEFAULTS.max_accumulation_hours,
    compensation_rate: BANK_HOURS_TYPE_DEFAULTS.compensation_rate,
    auto_compensate: BANK_HOURS_TYPE_DEFAULTS.auto_compensate,
    compensation_priority: BANK_HOURS_TYPE_DEFAULTS.compensation_priority,
    expires_after_months: BANK_HOURS_TYPE_DEFAULTS.expires_after_months,
    allow_negative_balance: BANK_HOURS_TYPE_DEFAULTS.allow_negative_balance,
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar valores numéricos antes de enviar
    const validatedData = {
      ...formData,
      max_accumulation_hours: Math.min(Math.max(formData.max_accumulation_hours, 0), 999.99),
      compensation_rate: Math.min(Math.max(formData.compensation_rate, 0.5), 99.99),
      accumulation_period_months: Math.min(Math.max(formData.accumulation_period_months, 1), 24),
      expires_after_months: Math.min(Math.max(formData.expires_after_months, 1), 24),
    };
    
    // Log dos dados que serão enviados
    console.log('🔍 [DEBUG] Dados validados para envio:', validatedData);
    console.log('🔍 [DEBUG] max_accumulation_hours:', validatedData.max_accumulation_hours, typeof validatedData.max_accumulation_hours);
    console.log('🔍 [DEBUG] compensation_rate:', validatedData.compensation_rate, typeof validatedData.compensation_rate);
    
    try {
      if (editingType) {
        await updateType.mutateAsync({ id: editingType, type: validatedData });
      } else {
        await createType.mutateAsync(validatedData);
      }
      setShowForm(false);
      setEditingType(null);
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar tipo:', err);
    }
  };

  const handleEdit = (type: any) => {
    setEditingType(type.id);
    setFormData({
      name: type.name,
      description: type.description || '',
      code: type.code,
      has_bank_hours: type.has_bank_hours,
      accumulation_period_months: type.accumulation_period_months,
      max_accumulation_hours: type.max_accumulation_hours,
      compensation_rate: type.compensation_rate,
      auto_compensate: type.auto_compensate,
      compensation_priority: type.compensation_priority,
      expires_after_months: type.expires_after_months,
      allow_negative_balance: type.allow_negative_balance,
      is_default: type.is_default,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingType(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo? Esta ação não pode ser desfeita.')) {
      try {
        await deleteType.mutateAsync(id);
      } catch (err) {
        console.error('Erro ao excluir tipo:', err);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultType.mutateAsync(id);
    } catch (err) {
      console.error('Erro ao definir como padrão:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      has_bank_hours: true,
      accumulation_period_months: BANK_HOURS_TYPE_DEFAULTS.accumulation_period_months,
      max_accumulation_hours: BANK_HOURS_TYPE_DEFAULTS.max_accumulation_hours,
      compensation_rate: BANK_HOURS_TYPE_DEFAULTS.compensation_rate,
      auto_compensate: BANK_HOURS_TYPE_DEFAULTS.auto_compensate,
      compensation_priority: BANK_HOURS_TYPE_DEFAULTS.compensation_priority,
      expires_after_months: BANK_HOURS_TYPE_DEFAULTS.expires_after_months,
      allow_negative_balance: BANK_HOURS_TYPE_DEFAULTS.allow_negative_balance,
      is_default: false,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando tipos de banco de horas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tipos de Banco de Horas</h2>
          <p className="text-muted-foreground">
            Configure os tipos de banco de horas disponíveis para atribuir aos colaboradores
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
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
              {editingType ? 'Editar Tipo' : 'Novo Tipo de Banco de Horas'}
            </CardTitle>
            <CardDescription>
              Configure os parâmetros do tipo de banco de horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Tipo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Padrão, Gerencial, Operacional"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: PADRAO, GERENCIAL"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição opcional do tipo"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="has_bank_hours"
                  checked={formData.has_bank_hours}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_bank_hours: checked }))}
                />
                <Label htmlFor="has_bank_hours">Possui Banco de Horas</Label>
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
                        max="999.99"
                        value={formData.max_accumulation_hours}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const clampedValue = Math.min(Math.max(value, 0), 999.99);
                          setFormData(prev => ({ 
                            ...prev, 
                            max_accumulation_hours: clampedValue 
                          }));
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        Máximo: 999.99 horas
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="compensation_rate">Taxa de Compensação</Label>
                      <Input
                        id="compensation_rate"
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="99.99"
                        value={formData.compensation_rate}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 1.0;
                          const clampedValue = Math.min(Math.max(value, 0.5), 99.99);
                          setFormData(prev => ({ 
                            ...prev, 
                            compensation_rate: clampedValue 
                          }));
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        1.0 = 1:1, 1.5 = 1.5:1, etc. Máximo: 99.99
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
                  {editingType ? 'Atualizar' : 'Criar'} Tipo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {types.map((type) => (
          <Card key={type.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{type.name}</h3>
                    <Badge variant="secondary">{type.code}</Badge>
                    {type.is_default && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Padrão
                      </Badge>
                    )}
                    <Badge variant={type.is_active ? 'default' : 'secondary'}>
                      {type.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  {type.description && (
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  )}
                  
                  {type.has_bank_hours && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Período:</span> {type.accumulation_period_months} meses
                      </div>
                      <div>
                        <span className="font-medium">Máximo:</span> {type.max_accumulation_hours}h
                      </div>
                      <div>
                        <span className="font-medium">Taxa:</span> {type.compensation_rate}:1
                      </div>
                      <div>
                        <span className="font-medium">Expira:</span> {type.expires_after_months} meses
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm">
                    {type.auto_compensate && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Compensação automática</span>
                      </div>
                    )}
                    {type.allow_negative_balance && (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span>Saldo negativo permitido</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!type.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(type.id)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(type)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {types.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum tipo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie tipos de banco de horas para organizar as configurações dos colaboradores.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Tipo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
