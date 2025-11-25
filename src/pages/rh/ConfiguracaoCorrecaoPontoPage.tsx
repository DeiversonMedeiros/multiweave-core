import React, { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { CorrectionSettingsService, CorrectionSettings, EmployeePermission } from '@/services/rh/correctionSettingsService';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Save, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmployeePermissionWithDetails extends EmployeePermission {
  employee_name: string;
  employee_matricula: string;
}

export default function ConfiguracaoCorrecaoPontoPage() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Buscar dados do usuário na empresa atual
  const { data: userCompanyData } = useQuery({
    queryKey: ['user-company-data', selectedCompany?.id, user?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return null;
      
      const result = await EntityService.list({
        schema: 'public',
        table: 'user_companies',
        companyId: selectedCompany.id,
        filters: { user_id: user.id, company_id: selectedCompany.id },
        pageSize: 1
      });
      
      return result.data?.[0] || null;
    },
    enabled: !!user?.id && !!selectedCompany?.id
  });
  
  // Estados locais
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [permissions, setPermissions] = useState<EmployeePermissionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar configurações da empresa
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['correction-settings', selectedCompany?.id],
    queryFn: async (): Promise<CorrectionSettings | null> => {
      if (!selectedCompany?.id) return null;
      return await CorrectionSettingsService.getSettings(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id
  });

  // Buscar funcionários da empresa
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: selectedCompany.id,
        filters: { company_id: selectedCompany.id, status: 'ativo' },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });

      return result.data || [];
    },
    enabled: !!selectedCompany?.id
  });

  // Buscar permissões do mês selecionado
  const { data: monthPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['employee-permissions', selectedCompany?.id, selectedMonth],
    queryFn: async (): Promise<EmployeePermissionWithDetails[]> => {
      if (!selectedCompany?.id) return [];
      
      const permissions = await CorrectionSettingsService.getPermissions(selectedCompany.id, selectedMonth);

      // Enriquecer com dados dos funcionários
      const enrichedPermissions = permissions.map(permission => {
        const employee = employees?.find(emp => emp.id === permission.employee_id);
        return {
          ...permission,
          employee_name: employee?.nome || 'Funcionário não encontrado',
          employee_matricula: employee?.matricula || 'N/A'
        };
      });

      return enrichedPermissions;
    },
    enabled: !!selectedCompany?.id && !!employees
  });

  // Mutation para salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: CorrectionSettings) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await CorrectionSettingsService.saveSettings(newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correction-settings'] });
      toast({
        title: "Configurações salvas!",
        description: "As configurações de correção foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  });

  // Mutation para salvar permissões
  const savePermissionsMutation = useMutation({
    mutationFn: async (permissionsData: EmployeePermission[]) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await CorrectionSettingsService.savePermissions(permissionsData);
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a correção de ponto
      queryClient.invalidateQueries({ queryKey: ['employee-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['employee-correction-status'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-time-records'] });
      toast({
        title: "Permissões salvas!",
        description: "As permissões de correção foram atualizadas com sucesso.",
      });
      setIsPermissionsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar permissões",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  });

  // Inicializar configurações padrão se não existirem
  const [localSettings, setLocalSettings] = useState<CorrectionSettings>({
    company_id: selectedCompany?.id || '',
    dias_liberacao_correcao: 7,
    permitir_correcao_futura: false,
    exigir_justificativa: true,
    permitir_correcao_apos_aprovacao: false,
    dias_limite_correcao: 30,
    is_active: true
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(localSettings);
  };

  const handleLoadPermissions = () => {
    if (!employees) return;
    
    // Criar permissões para todos os funcionários do mês selecionado
    const newPermissions: EmployeePermissionWithDetails[] = employees.map(employee => {
      const existingPermission = monthPermissions?.find(p => p.employee_id === employee.id);
      return {
        id: existingPermission?.id || '',
        employee_id: employee.id,
        company_id: selectedCompany?.id || '',
        employee_name: employee.nome,
        employee_matricula: employee.matricula,
        mes_ano: selectedMonth,
        liberado: existingPermission?.liberado || false,
        liberado_por: existingPermission?.liberado_por,
        liberado_em: existingPermission?.liberado_em,
        observacoes: existingPermission?.observacoes || ''
      };
    });
    
    setPermissions(newPermissions);
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = () => {
    // Converter para o tipo correto removendo os campos extras
    const permissionsToSave: EmployeePermission[] = permissions.map(p => ({
      id: p.id,
      employee_id: p.employee_id,
      company_id: p.company_id,
      mes_ano: p.mes_ano,
      liberado: p.liberado,
      liberado_por: p.liberado_por,
      liberado_em: p.liberado_em,
      observacoes: p.observacoes,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    
    savePermissionsMutation.mutate(permissionsToSave);
  };

  const togglePermission = (employeeId: string) => {
    setPermissions(prev => prev.map(p => 
      p.employee_id === employeeId 
        ? { 
            ...p, 
            liberado: !p.liberado, 
            liberado_em: !p.liberado ? new Date().toISOString() : undefined,
            liberado_por: !p.liberado ? userCompanyData?.profile_id : undefined
          }
        : p
    ));
  };

  const updatePermissionObservations = (employeeId: string, observacoes: string) => {
    setPermissions(prev => prev.map(p => 
      p.employee_id === employeeId 
        ? { ...p, observacoes }
        : p
    ));
  };

  const toggleAllPermissions = (liberado: boolean) => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      liberado,
      liberado_em: liberado ? new Date().toISOString() : undefined,
      liberado_por: liberado ? userCompanyData?.profile_id : undefined
    })));
  };

  const areAllEnabled = permissions.every(p => p.liberado);
  const areAllDisabled = permissions.every(p => !p.liberado);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  if (settingsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar configurações: {settingsError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de Correção de Ponto</h1>
          <p className="text-muted-foreground">
            Configure as regras e permissões para correção de registros de ponto
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleLoadPermissions} disabled={!employees?.length}>
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Permissões
          </Button>
        </div>
      </div>

      {/* Configurações Globais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Globais da Empresa
          </CardTitle>
          <CardDescription>
            Defina as regras gerais para correção de ponto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dias-liberacao">Prazo de Liberação (dias)</Label>
              <Input
                id="dias-liberacao"
                type="number"
                min="1"
                max="30"
                value={localSettings.dias_liberacao_correcao}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  dias_liberacao_correcao: parseInt(e.target.value) || 7
                }))}
              />
              <p className="text-sm text-muted-foreground">
                Quantos dias após o mês para liberar correções
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias-limite">Limite de Correção (dias)</Label>
              <Input
                id="dias-limite"
                type="number"
                min="1"
                max="90"
                value={localSettings.dias_limite_correcao}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  dias_limite_correcao: parseInt(e.target.value) || 30
                }))}
              />
              <p className="text-sm text-muted-foreground">
                Máximo de dias para fazer correções
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir Correção Futura</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir correções de datas futuras
                </p>
              </div>
              <Switch
                checked={localSettings.permitir_correcao_futura}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  permitir_correcao_futura: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Exigir Justificativa</Label>
                <p className="text-sm text-muted-foreground">
                  Obrigar justificativa em todas as correções
                </p>
              </div>
              <Switch
                checked={localSettings.exigir_justificativa}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  exigir_justificativa: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Correção Após Aprovação</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir correções após aprovação do gestor
                </p>
              </div>
              <Switch
                checked={localSettings.permitir_correcao_apos_aprovacao}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  permitir_correcao_apos_aprovacao: checked
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings} 
              disabled={saveSettingsMutation.isPending}
            >
              {saveSettingsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo das Configurações Atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo das Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Prazo: {localSettings.dias_liberacao_correcao} dias</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-sm">Futura: {localSettings.permitir_correcao_futura ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Justificativa: {localSettings.exigir_justificativa ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Limite: {localSettings.dias_limite_correcao} dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Permissões */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Permissões de Correção
            </DialogTitle>
            <DialogDescription>
              Configure as permissões de correção por funcionário para o mês selecionado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label htmlFor="mes-ano">Mês/Ano:</Label>
                <Input
                  id="mes-ano"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {permissions.filter(p => p.liberado).length} Liberados
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <X className="h-3 w-3 text-red-500" />
                    {permissions.filter(p => !p.liberado).length} Bloqueados
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPermissions(true)}
                    disabled={areAllEnabled}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Liberar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPermissions(false)}
                    disabled={areAllDisabled}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Bloquear Todos
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Liberado</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.employee_id}>
                      <TableCell className="font-medium">
                        {permission.employee_name}
                      </TableCell>
                      <TableCell>{permission.employee_matricula}</TableCell>
                      <TableCell>
                        <Switch
                          checked={permission.liberado}
                          onCheckedChange={() => togglePermission(permission.employee_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Observações..."
                          value={permission.observacoes || ''}
                          onChange={(e) => updatePermissionObservations(permission.employee_id, e.target.value)}
                          className="min-h-[60px]"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={savePermissionsMutation.isPending}
            >
              {savePermissionsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
