import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  Save, 
  Settings, 
  Clock, 
  Users, 
  Bell, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Calendar,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { timeRecordSignatureService, TimeRecordSignatureConfig } from '@/services/rh/timeRecordSignatureService';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterType = 'all' | 'signed' | 'not_signed' | 'pending';

export default function TimeRecordSignatureConfigPage() {
  const [config, setConfig] = useState<TimeRecordSignatureConfig>({
    company_id: '',
    is_enabled: false,
    signature_period_days: 5,
    reminder_days: 3,
    require_manager_approval: true,
    auto_close_month: true,
  });

  // Estados para controle de mês/ano
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [monthYear, setMonthYear] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Estados para dados do mês selecionado
  const [monthStats, setMonthStats] = useState<any>(null);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [monthStatus, setMonthStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiTenancy();

  useEffect(() => {
    if (currentCompany?.id) {
      loadConfig();
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      setMonthYear(`${selectedYear}-${selectedMonth}`);
    }
  }, [selectedMonth, selectedYear]);

  // Buscar status automaticamente quando mês/ano mudar
  useEffect(() => {
    if (currentCompany?.id && monthYear) {
      loadMonthStatus();
    } else {
      setMonthStatus(null);
    }
  }, [currentCompany?.id, monthYear]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      if (!currentCompany?.id) {
        toast({
          title: 'Erro',
          description: 'Empresa não selecionada.',
          variant: 'destructive',
        });
        return;
      }

      const response = await timeRecordSignatureService.getConfig(currentCompany.id);
      setConfig(response);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      
      if (currentCompany?.id) {
        const defaultConfig = {
          company_id: currentCompany.id,
          is_enabled: false,
          signature_period_days: 5,
          reminder_days: 3,
          require_manager_approval: true,
          auto_close_month: true,
        };
        setConfig(defaultConfig);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMonthStatus = async () => {
    if (!currentCompany?.id || !monthYear) {
      return;
    }

    try {
      setLoadingStatus(true);
      const status = await timeRecordSignatureService.getMonthStatus(currentCompany.id, monthYear);
      setMonthStatus(status);
    } catch (error: any) {
      console.error('Erro ao buscar status do mês:', error);
      // Não mostrar toast para erro de status, apenas log
      setMonthStatus({
        month_year: monthYear,
        is_locked: false,
        has_control: false
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadMonthData = async () => {
    if (!currentCompany?.id || !monthYear) {
      toast({
        title: 'Atenção',
        description: 'Selecione mês e ano para carregar os dados.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoadingMonth(true);
      
      const [stats, employees] = await Promise.all([
        timeRecordSignatureService.getMonthStats(currentCompany.id, monthYear),
        timeRecordSignatureService.getEmployeeSignatureList(currentCompany.id, monthYear)
      ]);

      setMonthStats(stats);
      setEmployeeList(employees);
      
      // Atualizar status também
      await loadMonthStatus();
    } catch (error: any) {
      console.error('Erro ao carregar dados do mês:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar dados do mês.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMonth(false);
    }
  };

  const handleUnlock = async () => {
    if (!currentCompany?.id || !monthYear) {
      toast({
        title: 'Atenção',
        description: 'Selecione mês e ano antes de liberar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoadingAction(true);
      const result = await timeRecordSignatureService.unlockSignaturesForMonth(
        currentCompany.id,
        monthYear,
        notes
      );

      if (result.success) {
        toast({
          title: 'Sucesso',
          description: result.message || 'Assinaturas liberadas com sucesso!',
        });
        await loadMonthStatus(); // Atualizar status imediatamente
        await loadMonthData();
        setNotes('');
      }
    } catch (error: any) {
      console.error('Erro ao liberar assinaturas:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao liberar assinaturas.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLock = async () => {
    if (!currentCompany?.id || !monthYear) {
      toast({
        title: 'Atenção',
        description: 'Selecione mês e ano antes de bloquear.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoadingAction(true);
      const result = await timeRecordSignatureService.lockSignaturesForMonth(
        currentCompany.id,
        monthYear,
        notes
      );

      if (result.success) {
        toast({
          title: 'Sucesso',
          description: result.message || 'Assinaturas bloqueadas com sucesso!',
        });
        await loadMonthStatus(); // Atualizar status imediatamente
        await loadMonthData();
        setNotes('');
      }
    } catch (error: any) {
      console.error('Erro ao bloquear assinaturas:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao bloquear assinaturas.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!currentCompany?.id) {
        toast({
          title: 'Erro',
          description: 'Empresa não selecionada.',
          variant: 'destructive',
        });
        return;
      }

      const configToSave = {
        ...config,
        company_id: currentCompany.id,
      };

      await timeRecordSignatureService.updateConfig(configToSave);
      
      toast({
        title: 'Sucesso',
        description: 'Configuração salva com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof TimeRecordSignatureConfig) => {
    setConfig(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleInputChange = (field: keyof TimeRecordSignatureConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusBadge = (status: string, hasSigned: boolean) => {
    if (hasSigned || status === 'signed' || status === 'approved') {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Assinado</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" /> Pendente</Badge>;
    }
    if (status === 'expired') {
      return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Expirado</Badge>;
    }
    return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> Não Assinado</Badge>;
  };

  const filteredEmployees = employeeList.filter(emp => {
    if (filterType === 'all') return true;
    if (filterType === 'signed') return emp.has_signed;
    if (filterType === 'not_signed') return !emp.has_signed;
    if (filterType === 'pending') return emp.signature_status === 'pending';
    return true;
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, '0');
    const monthName = format(new Date(2024, i, 1), 'MMMM', { locale: ptBR });
    return { value: month, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => (currentYear - i).toString());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de Assinatura de Ponto</h1>
          <p className="text-muted-foreground">
            Configure as regras e gerencie a liberação de assinaturas de registros de ponto mensais
          </p>
        </div>
      </div>

      {/* Configurações Gerais */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Habilitar Assinatura de Ponto</Label>
                <p className="text-sm text-muted-foreground">
                  Ativa o sistema de assinatura de registros de ponto
                </p>
              </div>
              <Switch
                id="enabled"
                checked={config.is_enabled}
                onCheckedChange={() => handleToggle('is_enabled')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_close">Fechamento Automático do Mês</Label>
                <p className="text-sm text-muted-foreground">
                  Gera automaticamente as assinaturas no início do mês seguinte
                </p>
              </div>
              <Switch
                id="auto_close"
                checked={config.auto_close_month}
                onCheckedChange={() => handleToggle('auto_close_month')}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signature_period">Período para Assinatura (dias)</Label>
                <Input
                  id="signature_period"
                  type="number"
                  min="1"
                  max="30"
                  value={config.signature_period_days}
                  onChange={(e) => handleInputChange('signature_period_days', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Quantos dias após o fechamento do mês para assinar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_days">Dias para Lembrete</Label>
                <Input
                  id="reminder_days"
                  type="number"
                  min="1"
                  max="10"
                  value={config.reminder_days}
                  onChange={(e) => handleInputChange('reminder_days', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Quantos dias antes do vencimento enviar lembrete
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="manager_approval">Exigir Aprovação do Gestor</Label>
                <p className="text-sm text-muted-foreground">
                  Assinaturas precisam ser aprovadas pelo gestor imediato
                </p>
              </div>
              <Switch
                id="manager_approval"
                checked={config.require_manager_approval}
                onCheckedChange={() => handleToggle('require_manager_approval')}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Controle de Mês/Ano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Controle de Assinaturas por Mês/Ano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={loadMonthData} disabled={loadingMonth || !monthYear} className="w-full">
                  {loadingMonth ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Carregar Dados
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Indicador de Status - Aparece automaticamente */}
            {monthYear && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  {loadingStatus ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Verificando status...</span>
                    </div>
                  ) : monthStatus ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {monthStatus.is_locked ? (
                          <>
                            <Lock className="h-5 w-5 text-red-500" />
                            <div>
                              <div className="font-semibold text-red-600">BLOQUEADO</div>
                              <div className="text-xs text-muted-foreground">
                                {monthStatus.locked_at 
                                  ? `Bloqueado em ${format(new Date(monthStatus.locked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                                  : 'Status bloqueado'}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5 text-green-500" />
                            <div>
                              <div className="font-semibold text-green-600">LIBERADO</div>
                              <div className="text-xs text-muted-foreground">
                                {monthStatus.unlocked_at 
                                  ? `Liberado em ${format(new Date(monthStatus.unlocked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                                  : monthStatus.has_control 
                                    ? 'Status liberado'
                                    : 'Ainda não configurado'}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleUnlock}
                          disabled={loadingAction || !monthStatus.is_locked}
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {loadingAction ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Liberar
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleLock}
                          disabled={loadingAction || monthStatus.is_locked}
                          variant="destructive"
                          size="sm"
                        >
                          {loadingAction ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              Bloquear
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Selecione mês e ano para ver o status</span>
                    </div>
                  )}
                </div>

                {/* Campo de observações - sempre visível quando há status */}
                {monthStatus && (
                  <div className="space-y-2">
                    <Label>Observações (opcional)</Label>
                    <Textarea
                      placeholder="Adicione observações sobre a liberação/bloqueio..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {monthStats && (
              <>
                <Separator />
              </>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas */}
        {monthStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Estatísticas do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total de Funcionários</div>
                  <div className="text-2xl font-bold">{monthStats.total_employees || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Assinaturas Liberadas</div>
                  <div className="text-2xl font-bold">{monthStats.total_signatures || 0}</div>
                </div>
                <div className="p-4 border rounded-lg bg-green-50">
                  <div className="text-sm text-muted-foreground">Assinadas</div>
                  <div className="text-2xl font-bold text-green-600">
                    {monthStats.signed_count + monthStats.approved_count || 0}
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50">
                  <div className="text-sm text-muted-foreground">Pendentes</div>
                  <div className="text-2xl font-bold text-yellow-600">{monthStats.pending_count || 0}</div>
                </div>
                <div className="p-4 border rounded-lg bg-red-50">
                  <div className="text-sm text-muted-foreground">Expiradas</div>
                  <div className="text-2xl font-bold text-red-600">{monthStats.expired_count || 0}</div>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="text-sm text-muted-foreground">Não Assinadas</div>
                  <div className="text-2xl font-bold text-gray-600">{monthStats.not_signed_count || 0}</div>
                </div>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="text-sm text-muted-foreground">Aprovadas</div>
                  <div className="text-2xl font-bold text-blue-600">{monthStats.approved_count || 0}</div>
                </div>
                <div className="p-4 border rounded-lg bg-orange-50">
                  <div className="text-sm text-muted-foreground">Rejeitadas</div>
                  <div className="text-2xl font-bold text-orange-600">{monthStats.rejected_count || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Funcionários */}
        {monthStats && employeeList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Funcionários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  Todos ({employeeList.length})
                </Button>
                <Button
                  variant={filterType === 'signed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('signed')}
                >
                  Assinados ({employeeList.filter(e => e.has_signed).length})
                </Button>
                <Button
                  variant={filterType === 'not_signed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('not_signed')}
                >
                  Não Assinados ({employeeList.filter(e => !e.has_signed).length})
                </Button>
                <Button
                  variant={filterType === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('pending')}
                >
                  Pendentes ({employeeList.filter(e => e.signature_status === 'pending').length})
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data da Assinatura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.employee_id}>
                        <TableCell className="font-medium">{employee.employee_name}</TableCell>
                        <TableCell>{employee.employee_matricula || '-'}</TableCell>
                        <TableCell>
                          {getStatusBadge(employee.signature_status, employee.has_signed)}
                        </TableCell>
                        <TableCell>
                          {employee.signature_timestamp
                            ? format(new Date(employee.signature_timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações Importantes */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Esta funcionalidade está em conformidade com a Portaria 671/2021, 
            que permite a assinatura eletrônica de registros de ponto. As assinaturas são criptografadas 
            e incluem timestamp, IP e user agent para auditoria.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
