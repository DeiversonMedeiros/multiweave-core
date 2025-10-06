// =====================================================
// PÁGINA PRINCIPAL DE CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Heart,
  Users,
  DollarSign,
  Calendar
} from 'lucide-react';
import { 
  useMedicalAgreements, 
  useMedicalPlans, 
  useEmployeeMedicalPlans,
  useAgreementTypes,
  usePlanCategories,
  usePlanStatuses,
  useMedicalAgreementsStats
} from '@/hooks/rh/useMedicalAgreements';
import { 
  formatCurrency, 
  formatDate, 
  getAgreementTypeLabel, 
  getAgreementTypeColor,
  getPlanCategoryLabel,
  getPlanCategoryColor,
  getPlanStatusLabel,
  getPlanStatusColor
} from '@/services/rh/medicalAgreementsService';
import { useEmployees } from '@/hooks/rh/useEmployees';
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
import { useDeleteMedicalAgreement, useDeleteMedicalPlan, useDeleteEmployeeMedicalPlan } from '@/hooks/rh/useMedicalAgreements';
import { toast } from 'sonner';

const MedicalAgreementsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('agreements');

  // Hooks para dados
  const { data: agreements, isLoading: loadingAgreements } = useMedicalAgreements({
    tipo: selectedType === 'all' ? undefined : selectedType,
    nome: searchTerm || undefined,
  });
  
  const { data: plans, isLoading: loadingPlans } = useMedicalPlans({
    categoria: selectedCategory === 'all' ? undefined : selectedCategory,
    nome: searchTerm || undefined,
  });
  
  const { data: employeePlans, isLoading: loadingEmployeePlans } = useEmployeeMedicalPlans({
    status: selectedStatus === 'all' ? undefined : selectedStatus,
  });

  const { data: stats } = useMedicalAgreementsStats();
  const { data: employees } = useEmployees();
  
  // Hooks utilitários
  const agreementTypes = useAgreementTypes();
  const planCategories = usePlanCategories();
  const planStatuses = usePlanStatuses();
  
  // Hooks de mutação
  const deleteAgreement = useDeleteMedicalAgreement();
  const deletePlan = useDeleteMedicalPlan();
  const deleteEmployeePlan = useDeleteEmployeeMedicalPlan();

  const getEmployeeName = (employeeId: string) => {
    if (!employees || employees.length === 0) {
      return 'Carregando...';
    }
    return employees.find(emp => emp.id === employeeId)?.nome || 'Funcionário Desconhecido';
  };

  const handleDeleteAgreement = async (id: string, nome: string) => {
    try {
      await deleteAgreement.mutateAsync(id);
      toast.success(`Convênio "${nome}" excluído com sucesso!`);
    } catch (error) {
      toast.error('Erro ao excluir convênio.', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleDeletePlan = async (id: string, nome: string) => {
    try {
      await deletePlan.mutateAsync(id);
      toast.success(`Plano "${nome}" excluído com sucesso!`);
    } catch (error) {
      toast.error('Erro ao excluir plano.', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleDeleteEmployeePlan = async (id: string, employeeName: string) => {
    try {
      await deleteEmployeePlan.mutateAsync(id);
      toast.success(`Adesão de "${employeeName}" excluída com sucesso!`);
    } catch (error) {
      toast.error('Erro ao excluir adesão.', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  if (loadingAgreements || loadingPlans || loadingEmployeePlans) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando convênios médicos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Convênios Médicos e Odontológicos
          </h1>
          <p className="text-muted-foreground">
            Gerencie convênios, planos e adesões dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/rh/medical-agreements/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Convênio
            </Button>
          </Link>
          <Link to="/rh/medical-plans/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          </Link>
          <Link to="/rh/employee-medical-plans/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Adesão
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convênios Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_agreements || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Disponíveis</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_plans || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adesões Ativas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_employee_plans || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Mensal Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_monthly_value || 0)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Convênio</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {agreementTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria do Plano</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {planCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {planStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agreements">Convênios ({agreements?.length || 0})</TabsTrigger>
          <TabsTrigger value="plans">Planos ({plans?.length || 0})</TabsTrigger>
          <TabsTrigger value="employee-plans">Adesões ({employeePlans?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Tab: Convênios */}
        <TabsContent value="agreements">
          <Card>
            <CardHeader>
              <CardTitle>Convênios Médicos e Odontológicos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements?.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell className="font-medium">{agreement.nome}</TableCell>
                      <TableCell>
                        <Badge className={getAgreementTypeColor(agreement.tipo)}>
                          {getAgreementTypeLabel(agreement.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>{agreement.cnpj || '-'}</TableCell>
                      <TableCell>
                        {agreement.telefone && <div>{agreement.telefone}</div>}
                        {agreement.email && <div className="text-sm text-muted-foreground">{agreement.email}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={agreement.ativo ? 'default' : 'secondary'}>
                          {agreement.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/rh/medical-agreements/${agreement.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/rh/medical-agreements/${agreement.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o convênio "{agreement.nome}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAgreement(agreement.id, agreement.nome)}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Planos */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos dos Convênios</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor Titular</TableHead>
                    <TableHead>Valor Dependente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans?.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.nome}</TableCell>
                      <TableCell>{plan.agreement?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getPlanCategoryColor(plan.categoria)}>
                          {getPlanCategoryLabel(plan.categoria)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(plan.valor_titular)}</TableCell>
                      <TableCell>{formatCurrency(plan.valor_dependente)}</TableCell>
                      <TableCell>
                        <Badge variant={plan.ativo ? 'default' : 'secondary'}>
                          {plan.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/rh/medical-plans/${plan.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/rh/medical-plans/${plan.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o plano "{plan.nome}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePlan(plan.id, plan.nome)}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Adesões dos Funcionários */}
        <TabsContent value="employee-plans">
          <Card>
            <CardHeader>
              <CardTitle>Adesões dos Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeePlans?.map((employeePlan) => (
                    <TableRow key={employeePlan.id}>
                      <TableCell className="font-medium">
                        {getEmployeeName(employeePlan.employee_id)}
                      </TableCell>
                      <TableCell>{employeePlan.plan?.nome || '-'}</TableCell>
                      <TableCell>{formatDate(employeePlan.data_inicio)}</TableCell>
                      <TableCell>{formatCurrency(employeePlan.valor_mensal)}</TableCell>
                      <TableCell>
                        <Badge className={getPlanStatusColor(employeePlan.status)}>
                          {getPlanStatusLabel(employeePlan.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/rh/employee-medical-plans/${employeePlan.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/rh/employee-medical-plans/${employeePlan.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a adesão de "{getEmployeeName(employeePlan.employee_id)}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEmployeePlan(employeePlan.id, getEmployeeName(employeePlan.employee_id))}>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicalAgreementsPage;
