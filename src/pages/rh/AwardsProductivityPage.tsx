// =====================================================
// PÁGINA DE PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2, Gift, DollarSign, Users, TrendingUp, Upload, Download, CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react';
import { useAwardsProductivity, useAwardStats, useAwardTypes, useAwardStatuses, useAwardImports, useImportAwardsFromCSV, useDeleteAwardProductivity, useApproveAward, useMarkAsPaid } from '@/hooks/rh/useAwardsProductivity';
import { AwardProductivityFilters } from '@/integrations/supabase/rh-types';
import { formatCurrency, formatDate, getAwardTypeLabel, getAwardTypeColor, getAwardStatusLabel, getAwardStatusColor, downloadCSVTemplate } from '@/services/rh/awardsProductivityService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useRHData } from '@/hooks/generic/useEntityData';
import { Employee } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const AwardsProductivityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<AwardProductivityFilters>({
    tipo: '',
    status: '',
    mes_inicio: '',
    mes_fim: ''
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );

  const { selectedCompany } = useCompany();
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { data: awards, isLoading, error, refetch } = useAwardsProductivity(filters);
  const { data: stats } = useAwardStats();
  const { data: imports } = useAwardImports(selectedMonth);
  
  // Carregar funcionários usando useRHData
  const { data: employeesData } = useRHData<Employee>('employees', selectedCompany?.id || '');
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
  const awardTypes = useAwardTypes();
  const awardStatuses = useAwardStatuses();
  
  const deleteMutation = useDeleteAwardProductivity();
  const approveMutation = useApproveAward();
  const markAsPaidMutation = useMarkAsPaid();
  const importMutation = useImportAwardsFromCSV();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Premiação excluída com sucesso!');
    } catch (err) {
      toast.error('Erro ao excluir premiação.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleApprove = async (id: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      await approveMutation.mutateAsync({ id, approvedBy: user.id });
      toast.success('Premiação aprovada com sucesso!');
    } catch (err) {
      toast.error('Erro ao aprovar premiação.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaidMutation.mutateAsync(id);
      toast.success('Premiação marcada como paga!');
    } catch (err) {
      toast.error('Erro ao marcar como pago.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleViewAccountsPayable = (accountsPayableId: string) => {
    navigate(`/financeiro/contas-pagar?conta=${accountsPayableId}`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      importMutation.mutate({
        mesReferencia: `${selectedMonth}-01`,
        csvData: data,
        fileName: file.name
      });
    };
    reader.readAsText(file);
  };

  const getEmployeeName = (employeeId: string) => {
    if (!employees || employees.length === 0) {
      return 'Carregando...';
    }
    return employees.find(emp => emp.id === employeeId)?.nome || 'Funcionário Desconhecido';
  };

  if (isLoading) return <div>Carregando premiações...</div>;
  if (error) return <div>Erro ao carregar premiações: {error.message}</div>;

  return (
    <RequirePage pagePath="/rh/AwardsProductivityPage*" action="read">
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8" />
            Premiações e Produtividade
          </h1>
          <p className="text-muted-foreground">
            Gestão de premiações e pagamentos por produtividade
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={downloadCSVTemplate}
            title="Baixar template CSV com campos necessários"
          >
            <Download className="mr-2" size={16} />
            Template CSV
          </Button>
          <label htmlFor="csv-upload">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2" size={16} />
                Importar CSV
              </span>
            </Button>
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <PermissionButton page="/rh/awards-productivity*" action="create">
            <Button asChild>
              <Link to="/rh/awards-productivity/new">
                <PlusCircle className="mr-2" size={20} />
                Nova Premiação
              </Link>
            </Button>
          </PermissionButton>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Premiações</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_awards}</div>
              <p className="text-xs text-muted-foreground">
                {stats.awards_by_status.pago || 0} pagas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_value)}</div>
              <p className="text-xs text-muted-foreground">
                Premiações não canceladas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.awards_by_status.pendente || 0}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Importações</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successful_imports}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_imported_records} registros importados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Abas */}
      <Tabs defaultValue="premiacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="premiacoes">Premiações</TabsTrigger>
          <TabsTrigger value="importacoes">Importações</TabsTrigger>
        </TabsList>

        <TabsContent value="premiacoes" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Input
                  placeholder="Buscar por nome..."
                  className="max-w-sm"
                  onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                />
                <Select
                  value={filters.tipo || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    {awardTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {awardStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Premiações */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Premiações</CardTitle>
              <CardDescription>
                Ao aprovar uma premiação, ela é automaticamente enviada para Flash, que gera o boleto e cria a conta a pagar.
                A conta a pagar passa pelo sistema de aprovações configurado em Configurações/Aprovações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Mês Referência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Integrações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awards?.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell>{getEmployeeName(award.employee_id)}</TableCell>
                      <TableCell className="font-medium">{award.nome}</TableCell>
                      <TableCell>
                        <Badge className={getAwardTypeColor(award.tipo)}>
                          {getAwardTypeLabel(award.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(award.valor)}</TableCell>
                      <TableCell>{formatDate(award.mes_referencia)}</TableCell>
                      <TableCell>
                        <Badge className={getAwardStatusColor(award.status)}>
                          {getAwardStatusLabel(award.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {award.accounts_payable_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAccountsPayable(award.accounts_payable_id!)}
                              title="Ver Conta a Pagar"
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {award.flash_invoice_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://flash-api.example.com/invoices/${award.flash_invoice_id}`, '_blank')}
                              title="Ver Boleto Flash"
                            >
                              <ExternalLink className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {award.status === 'pendente' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(award.id)}
                              disabled={approveMutation.isPending}
                              title="Aprovar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {award.status === 'aprovado' && (
                            <>
                              {/* Status automático: após aprovação, envia para Flash automaticamente */}
                              {award.flash_invoice_id && (
                                <Badge variant="outline" className="text-xs">
                                  Flash: {award.flash_invoice_id.substring(0, 8)}...
                                </Badge>
                              )}
                              {award.accounts_payable_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewAccountsPayable(award.accounts_payable_id!)}
                                  title="Ver Conta a Pagar"
                                >
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsPaid(award.id)}
                                disabled={markAsPaidMutation.isPending}
                                title="Marcar como Pago"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Link to={`/rh/awards-productivity/${award.id}`}>
                            <Button variant="outline" size="sm" title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a premiação.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(award.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {awards?.length === 0 && (
                <p className="text-center text-gray-500 mt-4">Nenhuma premiação encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="importacoes" className="space-y-4">
          {/* Histórico de Importações */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Importações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Mês Referência</TableHead>
                    <TableHead>Total de Registros</TableHead>
                    <TableHead>Processados</TableHead>
                    <TableHead>Erros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports?.map((importRecord) => (
                    <TableRow key={importRecord.id}>
                      <TableCell className="font-medium">{importRecord.nome_arquivo}</TableCell>
                      <TableCell>{formatDate(importRecord.mes_referencia)}</TableCell>
                      <TableCell>{importRecord.total_registros}</TableCell>
                      <TableCell>{importRecord.registros_processados}</TableCell>
                      <TableCell>
                        {importRecord.registros_com_erro > 0 && (
                          <Badge variant="destructive">{importRecord.registros_com_erro}</Badge>
                        )}
                        {importRecord.registros_com_erro === 0 && (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          importRecord.status === 'concluido' ? 'default' :
                          importRecord.status === 'erro' ? 'destructive' :
                          importRecord.status === 'processando' ? 'secondary' : 'outline'

                        }>
                          {importRecord.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(importRecord.data_inicio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {imports?.length === 0 && (
                <p className="text-center text-gray-500 mt-4">Nenhuma importação encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </RequirePage>
  );
};

export default AwardsProductivityPage;
