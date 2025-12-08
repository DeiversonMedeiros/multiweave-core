import React, { useState, useEffect } from 'react';
import { 
  EmployeeMedicalPlan, 
  EmployeePlanDependent,
  EmployeePlanDependentCreateData,
  EmployeePlanDependentUpdateData,
  getParentescoTypes
} from '@/integrations/supabase/rh-types';
import { useDependentsByEmployee } from '@/hooks/rh/useDependents';
import { 
  useEmployeePlanDependents,
  useCreateEmployeePlanDependent,
  useUpdateEmployeePlanDependent,
  useDeleteEmployeePlanDependent
} from '@/hooks/rh/useMedicalAgreements';
import { getPlanValueByAge, calculateAge, formatCurrency } from '@/services/rh/medicalAgreementsService';
import { useCompany } from '@/lib/company-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  Users,
  DollarSign,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeePlanDependentsManagerProps {
  employeePlan: EmployeeMedicalPlan;
  onClose?: () => void;
}

export function EmployeePlanDependentsManager({ 
  employeePlan, 
  onClose 
}: EmployeePlanDependentsManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState<EmployeePlanDependent | null>(null);
  const [selectedEmployeeDependent, setSelectedEmployeeDependent] = useState<any>(null);

  // Hooks para dependentes do funcionário
  const { data: employeeDependents } = useDependentsByEmployee(employeePlan.employee_id);
  
  // Hooks para dependentes do plano
  const { data: planDependents, isLoading } = useEmployeePlanDependents({
    employee_plan_id: employeePlan.id
  });

  // Hooks de mutação
  const createPlanDependent = useCreateEmployeePlanDependent();
  const updatePlanDependent = useUpdateEmployeePlanDependent();
  const deletePlanDependent = useDeleteEmployeePlanDependent();

  // Filtrar dependentes que já estão no plano
  const availableDependents = employeeDependents?.filter(empDep => 
    !planDependents?.some(planDep => planDep.nome === empDep.nome)
  ) || [];

  // Função auxiliar para obter label do parentesco
  const getParentescoLabel = (parentesco: string) => {
    const parentescoTypes = getParentescoTypes();
    return parentescoTypes.find(p => p.value === parentesco)?.label || parentesco;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { variant: 'default' as const, label: 'Ativo', icon: Users },
      suspenso: { variant: 'destructive' as const, label: 'Suspenso', icon: AlertTriangle },
      cancelado: { variant: 'secondary' as const, label: 'Cancelado', icon: Trash2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ativo;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleAddDependent = (employeeDependent: any) => {
    setSelectedEmployeeDependent(employeeDependent);
    setIsAddModalOpen(true);
  };

  const handleEditDependent = (planDependent: EmployeePlanDependent) => {
    setSelectedDependent(planDependent);
    setIsEditModalOpen(true);
  };

  const handleDeleteDependent = (planDependent: EmployeePlanDependent) => {
    setSelectedDependent(planDependent);
    setIsDeleteModalOpen(true);
  };

  const handleAddSubmit = (data: EmployeePlanDependentCreateData) => {
    createPlanDependent.mutate(data);
    setIsAddModalOpen(false);
    setSelectedEmployeeDependent(null);
  };

  const handleEditSubmit = (data: EmployeePlanDependentUpdateData) => {
    if (selectedDependent) {
      updatePlanDependent.mutate({ ...data, id: selectedDependent.id });
      setIsEditModalOpen(false);
      setSelectedDependent(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedDependent) {
      deletePlanDependent.mutate(selectedDependent.id);
      setIsDeleteModalOpen(false);
      setSelectedDependent(null);
    }
  };

  const calculateTotalValue = () => {
    if (!planDependents) return 0;
    return planDependents.reduce((total, dep) => total + dep.valor_mensal, 0);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dependentes do Plano</h2>
          <p className="text-muted-foreground">
            {employeePlan.plan?.nome} - {employeePlan.plan?.agreement?.nome}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dependentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planDependents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              dependentes no plano
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {calculateTotalValue().toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              valor total dos dependentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependentes Disponíveis</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDependents.length}</div>
            <p className="text-xs text-muted-foreground">
              podem ser adicionados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Dependentes do Plano */}
      <Card>
        <CardHeader>
          <CardTitle>Dependentes Incluídos no Plano</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dependentes...</p>
              </div>
            </div>
          ) : planDependents && planDependents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead>Data Inclusão</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planDependents.map((dependent) => (
                  <TableRow key={dependent.id}>
                    <TableCell className="font-medium">{dependent.nome}</TableCell>
                    <TableCell>{getParentescoLabel(dependent.parentesco)}</TableCell>
                    <TableCell>
                      {format(new Date(dependent.data_inclusao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      R$ {dependent.valor_mensal.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell>{getStatusBadge(dependent.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDependent(dependent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDependent(dependent)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum dependente incluído</h3>
              <p className="text-muted-foreground mb-4">
                Adicione dependentes do funcionário ao plano
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Dependentes Disponíveis */}
      {availableDependents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dependentes Disponíveis para Adicionar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead>Data Nascimento</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableDependents.map((dependent) => (
                  <TableRow key={dependent.id}>
                    <TableCell className="font-medium">{dependent.nome}</TableCell>
                    <TableCell>{getParentescoLabel(dependent.parentesco)}</TableCell>
                    <TableCell>
                      {dependent.data_nascimento 
                        ? format(new Date(dependent.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{dependent.cpf || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddDependent(dependent)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal de Adicionar Dependente */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Dependente ao Plano</DialogTitle>
            <DialogDescription>
              Adicione {selectedEmployeeDependent?.nome} ao plano {employeePlan.plan?.nome}
            </DialogDescription>
          </DialogHeader>
          <AddDependentForm
            employeeDependent={selectedEmployeeDependent}
            employeePlan={employeePlan}
            onSubmit={handleAddSubmit}
            onCancel={() => {
              setIsAddModalOpen(false);
              setSelectedEmployeeDependent(null);
            }}
            isLoading={createPlanDependent.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Dependente */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dependente no Plano</DialogTitle>
            <DialogDescription>
              Atualize os dados de {selectedDependent?.nome} no plano
            </DialogDescription>
          </DialogHeader>
          <EditDependentForm
            planDependent={selectedDependent}
            employeePlan={employeePlan}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedDependent(null);
            }}
            isLoading={updatePlanDependent.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{selectedDependent?.nome}</strong> do plano?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente para formulário de adicionar dependente
interface AddDependentFormProps {
  employeeDependent: any;
  employeePlan: EmployeeMedicalPlan;
  onSubmit: (data: EmployeePlanDependentCreateData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function AddDependentForm({ 
  employeeDependent, 
  employeePlan, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: AddDependentFormProps) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  
  // Log completo do employeePlan recebido
  console.log('📋 [AddDependentForm] employeePlan recebido:', {
    employeePlan,
    hasPlan: !!employeePlan.plan,
    plan: employeePlan.plan,
    planId: employeePlan.plan?.id,
    planIdFromEmployeePlan: employeePlan.plan_id,
    employeePlanKeys: Object.keys(employeePlan)
  });
  
  const [valorMensal, setValorMensal] = useState(employeePlan.plan?.valor_dependente || 0);
  const [dataInclusao, setDataInclusao] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');

  // Função auxiliar para obter label do parentesco
  const getParentescoLabel = (parentesco: string) => {
    const parentescoTypes = getParentescoTypes();
    return parentescoTypes.find(p => p.value === parentesco)?.label || parentesco;
  };

  // Calcular valor baseado na idade do dependente automaticamente
  useEffect(() => {
    // Usar plan_id diretamente se plan não estiver disponível
    const planId = employeePlan.plan?.id || employeePlan.plan_id;
    
    console.log('🔄 [AddDependentForm] useEffect disparado:', {
      hasPlanId: !!planId,
      planId: planId,
      planIdFromPlan: employeePlan.plan?.id,
      planIdFromEmployeePlan: employeePlan.plan_id,
      planObject: employeePlan.plan,
      hasDataNascimento: !!employeeDependent?.data_nascimento,
      dataNascimento: employeeDependent?.data_nascimento,
      hasCompanyId: !!companyId,
      companyId,
      employeePlanKeys: Object.keys(employeePlan)
    });
    
    if (planId && employeeDependent?.data_nascimento && companyId) {
      const updateValue = async () => {
        try {
          console.log('🚀 [AddDependentForm] Iniciando cálculo de valor...');
          
          const idade = calculateAge(employeeDependent.data_nascimento);
          console.log('📊 [AddDependentForm] Idade calculada:', {
            dataNascimento: employeeDependent.data_nascimento,
            idade,
            tipo: typeof idade
          });
          
          if (idade === null || idade === undefined) {
            console.warn('⚠️ [AddDependentForm] Idade é null/undefined, não é possível calcular valor');
            setValorMensal(0);
            return;
          }
          
          console.log('📊 [AddDependentForm] Chamando getPlanValueByAge:', {
            planId: planId,
            idade,
            tipo: 'dependente',
            companyId
          });
          
          const valorBase = await getPlanValueByAge(
            planId,
            idade,
            'dependente',
            companyId
          );
          
          console.log('💰 [AddDependentForm] Valor retornado:', {
            valorBase,
            tipo: typeof valorBase,
            isZero: valorBase === 0
          });
          
          setValorMensal(valorBase);
        } catch (error) {
          console.error('❌ [AddDependentForm] Erro ao calcular valor do dependente:', error);
          console.error('❌ [AddDependentForm] Stack trace:', error instanceof Error ? error.stack : 'N/A');
          // Em caso de erro, usar 0
          setValorMensal(0);
        }
      };
      updateValue();
    } else {
      console.warn('⚠️ [AddDependentForm] Condições não atendidas:', {
        hasPlanId: !!employeePlan.plan?.id,
        hasDataNascimento: !!employeeDependent?.data_nascimento,
        hasCompanyId: !!companyId
      });
      // Se não tem data de nascimento, usar 0
      setValorMensal(0);
    }
  }, [employeePlan.plan?.id, employeePlan.plan_id, employeeDependent?.data_nascimento, companyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remover formatação do CPF (apenas números)
    const cpfLimpo = employeeDependent.cpf ? employeeDependent.cpf.replace(/\D/g, '') : undefined;
    
    console.log('💾 [AddDependentForm] Salvando dependente:', {
      cpfOriginal: employeeDependent.cpf,
      cpfLimpo,
      valorMensal
    });
    
    const data: EmployeePlanDependentCreateData = {
      company_id: employeePlan.company_id,
      employee_plan_id: employeePlan.id,
      nome: employeeDependent.nome,
      cpf: cpfLimpo,
      data_nascimento: employeeDependent.data_nascimento,
      parentesco: employeeDependent.parentesco,
      status: 'ativo',
      valor_mensal: valorMensal,
      data_inclusao: dataInclusao,
      observacoes: observacoes || undefined,
    };

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Dependente</Label>
        <Input
          value={employeeDependent?.nome || ''}
          disabled
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label>Parentesco</Label>
        <Input
          value={getParentescoLabel(employeeDependent?.parentesco || '')}
          disabled
          className="bg-muted"
        />
      </div>

      {/* Informação sobre o valor calculado */}
      {employeeDependent?.data_nascimento && (() => {
        const idade = calculateAge(employeeDependent.data_nascimento);
        return idade !== null ? (
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Label className="text-sm font-medium text-blue-900">Valor Mensal Calculado</Label>
            <p className="text-sm text-blue-700">
              <strong>Idade:</strong> {idade} anos
            </p>
            <p className="text-sm text-blue-700">
              <strong>Valor:</strong> {formatCurrency(valorMensal)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              O valor é calculado automaticamente baseado na idade do dependente e nas faixas etárias cadastradas no plano.
            </p>
          </div>
        ) : null;
      })()}
      {!employeeDependent?.data_nascimento && (
        <div className="space-y-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>Atenção:</strong> Para calcular o valor mensal, é necessário que o dependente tenha data de nascimento cadastrada.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="data-inclusao">Data de Inclusão *</Label>
        <Input
          id="data-inclusao"
          type="date"
          value={dataInclusao}
          onChange={(e) => setDataInclusao(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações sobre a inclusão do dependente"
          className="w-full p-2 border rounded-md resize-none"
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Adicionando...' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Componente para formulário de editar dependente
interface EditDependentFormProps {
  planDependent: EmployeePlanDependent | null;
  employeePlan: EmployeeMedicalPlan;
  onSubmit: (data: EmployeePlanDependentUpdateData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function EditDependentForm({ 
  planDependent, 
  employeePlan, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: EditDependentFormProps) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const [valorMensal, setValorMensal] = useState(planDependent?.valor_mensal || 0);
  const [status, setStatus] = useState(planDependent?.status || 'ativo');
  
  // Recalcular valor quando a data de nascimento mudar
  useEffect(() => {
    if (employeePlan.plan?.id && planDependent?.data_nascimento && companyId) {
      const updateValue = async () => {
        try {
          const idade = calculateAge(planDependent.data_nascimento);
          const valorBase = await getPlanValueByAge(
            employeePlan.plan.id,
            idade,
            'dependente',
            companyId
          );
          setValorMensal(valorBase);
        } catch (error) {
          console.error('Erro ao calcular valor do dependente:', error);
          setValorMensal(planDependent?.valor_mensal || 0);
        }
      };
      updateValue();
    }
  }, [employeePlan.plan?.id, planDependent?.data_nascimento, companyId]);
  const [dataExclusao, setDataExclusao] = useState(planDependent?.data_exclusao || '');
  const [motivoExclusao, setMotivoExclusao] = useState(planDependent?.motivo_exclusao || '');
  const [observacoes, setObservacoes] = useState(planDependent?.observacoes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('💾 [EditDependentForm] Salvando atualização:', {
      valorMensal,
      status
    });
    
    const data: EmployeePlanDependentUpdateData = {
      valor_mensal: valorMensal,
      status: status as 'ativo' | 'suspenso' | 'cancelado',
      data_exclusao: dataExclusao || undefined,
      motivo_exclusao: motivoExclusao || undefined,
      observacoes: observacoes || undefined,
    };

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Dependente</Label>
        <Input
          value={planDependent?.nome || ''}
          disabled
          className="bg-muted"
        />
      </div>

      {/* Informação sobre o valor calculado */}
      {planDependent?.data_nascimento && employeePlan.plan?.id && (() => {
        const idade = calculateAge(planDependent.data_nascimento);
        return idade !== null ? (
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Label className="text-sm font-medium text-blue-900">Valor Mensal Calculado</Label>
            <p className="text-sm text-blue-700">
              <strong>Idade:</strong> {idade} anos
            </p>
            <p className="text-sm text-blue-700">
              <strong>Valor:</strong> {formatCurrency(valorMensal)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              O valor é calculado automaticamente baseado na idade do dependente e nas faixas etárias cadastradas no plano.
            </p>
          </div>
        ) : null;
      })()}
      {(!planDependent?.data_nascimento || !employeePlan.plan?.id) && (
        <div className="space-y-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>Atenção:</strong> Para calcular o valor mensal, é necessário que o dependente tenha data de nascimento cadastrada.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status !== 'ativo' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="data-exclusao">Data de Exclusão</Label>
            <Input
              id="data-exclusao"
              type="date"
              value={dataExclusao}
              onChange={(e) => setDataExclusao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo-exclusao">Motivo da Exclusão</Label>
            <Input
              id="motivo-exclusao"
              value={motivoExclusao}
              onChange={(e) => setMotivoExclusao(e.target.value)}
              placeholder="Motivo da exclusão ou suspensão"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações sobre o dependente"
          className="w-full p-2 border rounded-md resize-none"
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
