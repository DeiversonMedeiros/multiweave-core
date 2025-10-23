import React, { useState } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAttendanceCorrectionsStats } from '@/hooks/rh/useAttendanceCorrections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Edit,
  Save,
  X,
  Plus,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CorrectionSettings {
  dias_liberacao_correcao: number;
  permitir_correcao_futura: boolean;
  exigir_justificativa: boolean;
  permitir_correcao_apos_aprovacao: boolean;
  dias_limite_correcao: number;
}

interface EmployeePermission {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  mes_ano: string;
  liberado: boolean;
  liberado_por?: string;
  liberado_em?: string;
  observacoes?: string;
}

export function TimeRecordCorrectionControl() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  
  // Estados locais
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [settings, setSettings] = useState<CorrectionSettings>({
    dias_liberacao_correcao: 7,
    permitir_correcao_futura: false,
    exigir_justificativa: true,
    permitir_correcao_apos_aprovacao: false,
    dias_limite_correcao: 30
  });
  const [permissions, setPermissions] = useState<EmployeePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Hooks de dados
  const { data: stats } = useAttendanceCorrectionsStats(selectedCompany?.id || '');

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar salvamento das configurações
      toast({
        title: "Configurações salvas!",
        description: "As configurações de correção foram atualizadas com sucesso.",
      });
      setIsSettingsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar configurações",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPermissions = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar carregamento das permissões do mês
      setPermissions([]);
      toast({
        title: "Permissões carregadas!",
        description: `Permissões para ${selectedMonth} carregadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar permissões",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = (employeeId: string) => {
    setPermissions(prev => prev.map(perm => 
      perm.employee_id === employeeId 
        ? { ...perm, liberado: !perm.liberado }
        : perm
    ));
  };

  const handleSavePermissions = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar salvamento das permissões
      toast({
        title: "Permissões salvas!",
        description: "As permissões de correção foram atualizadas com sucesso.",
      });
      setIsPermissionsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar permissões",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Correção de Ponto</h1>
          <p className="text-gray-600">
            Configure e gerencie as permissões de correção de ponto
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Correções</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Aprovadas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.aprovadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejeitadas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejeitadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configurações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Configure as regras de correção de ponto da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prazo de Liberação</Label>
              <p className="text-sm text-gray-600">
                {settings.dias_liberacao_correcao} dias após o mês
              </p>
            </div>
            <div className="space-y-2">
              <Label>Justificativa Obrigatória</Label>
              <p className="text-sm text-gray-600">
                {settings.exigir_justificativa ? 'Sim' : 'Não'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Correção Futura</Label>
              <p className="text-sm text-gray-600">
                {settings.permitir_correcao_futura ? 'Permitida' : 'Bloqueada'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Limite de Correção</Label>
              <p className="text-sm text-gray-600">
                {settings.dias_limite_correcao} dias
              </p>
            </div>
            <Button 
              onClick={() => setIsSettingsDialogOpen(true)}
              className="w-full"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Configurações
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Permissões por Funcionário
            </CardTitle>
            <CardDescription>
              Gerencie as permissões de correção por funcionário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="month-select">Mês/Ano</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Funcionários com Permissão</Label>
              <p className="text-sm text-gray-600">
                {permissions.filter(p => p.liberado).length} de {permissions.length} funcionários
              </p>
            </div>
            <Button 
              onClick={() => setIsPermissionsDialogOpen(true)}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Gerenciar Permissões
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Configurações */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Correção
            </DialogTitle>
            <DialogDescription>
              Configure as regras de correção de ponto da empresa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dias-liberacao">Prazo de Liberação (dias)</Label>
                <Input
                  id="dias-liberacao"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.dias_liberacao_correcao}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    dias_liberacao_correcao: parseInt(e.target.value) || 7
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="dias-limite">Limite de Correção (dias)</Label>
                <Input
                  id="dias-limite"
                  type="number"
                  min="1"
                  max="90"
                  value={settings.dias_limite_correcao}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    dias_limite_correcao: parseInt(e.target.value) || 30
                  }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="permitir-futura"
                  checked={settings.permitir_correcao_futura}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    permitir_correcao_futura: e.target.checked
                  }))}
                  className="rounded"
                />
                <Label htmlFor="permitir-futura">Permitir correção de datas futuras</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="exigir-justificativa"
                  checked={settings.exigir_justificativa}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    exigir_justificativa: e.target.checked
                  }))}
                  className="rounded"
                />
                <Label htmlFor="exigir-justificativa">Exigir justificativa obrigatória</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="permitir-apos-aprovacao"
                  checked={settings.permitir_correcao_apos_aprovacao}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    permitir_correcao_apos_aprovacao: e.target.checked
                  }))}
                  className="rounded"
                />
                <Label htmlFor="permitir-apos-aprovacao">Permitir correção após aprovação</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Permissões */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Permissões de Correção - {formatMonth(selectedMonth)}
            </DialogTitle>
            <DialogDescription>
              Gerencie as permissões de correção de ponto por funcionário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleLoadPermissions}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Carregar Funcionários
              </Button>
              <div className="text-sm text-gray-600">
                {permissions.filter(p => p.liberado).length} de {permissions.length} funcionários com permissão
              </div>
            </div>

            {permissions.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow key={permission.employee_id}>
                        <TableCell>
                          <p className="font-medium">{permission.funcionario_nome}</p>
                        </TableCell>
                        <TableCell>{permission.funcionario_matricula}</TableCell>
                        <TableCell>
                          <Badge 
                            className={permission.liberado 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {permission.liberado ? 'Liberado' : 'Bloqueado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600">
                            {permission.observacoes || '-'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePermission(permission.employee_id)}
                            className={permission.liberado 
                              ? 'text-red-600 hover:text-red-700' 
                              : 'text-green-600 hover:text-green-700'
                            }
                          >
                            {permission.liberado ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Bloquear
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Liberar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {permissions.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum funcionário carregado</p>
                <p className="text-sm text-gray-400">Clique em "Carregar Funcionários" para começar</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={isLoading || permissions.length === 0}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
