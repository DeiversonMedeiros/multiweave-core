import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Laptop, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  DollarSign,
  Search,
  Plus
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { RequireEntity } from '@/components/RequireAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface EquipmentRentalApproval {
  id: string;
  employee_id: string;
  company_id: string;
  tipo_equipamento: string;
  valor_mensal: number;
  data_inicio: string;
  data_fim?: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'ativo' | 'finalizado';
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    nome: string;
    matricula: string;
  };
}

const EquipmentRentalApprovalsPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<EquipmentRentalApproval | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    tipo_equipamento: '',
    valor_mensal: '',
    data_inicio: '',
    data_fim: '',
    justificativa: ''
  });

  // Buscar funcionários
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const result = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: selectedCompany.id,
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    },
    enabled: !!selectedCompany?.id
  });

  // Buscar solicitações de aluguel de equipamentos
  const { data: approvals = [], isLoading, refetch } = useQuery({
    queryKey: ['equipment-rental-approvals', selectedCompany?.id, statusFilter],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<EquipmentRentalApproval>({
        schema: 'rh',
        table: 'equipment_rental_approvals',
        companyId: selectedCompany.id,
        filters: statusFilter !== 'all' ? { status: statusFilter } : {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      // Buscar dados dos funcionários
      const approvalsWithEmployees = await Promise.all(
        result.data.map(async (approval) => {
          try {
            const { data: employee } = await EntityService.getById({
              schema: 'rh',
              table: 'employees',
              id: approval.employee_id,
              companyId: selectedCompany.id
            });
            return {
              ...approval,
              employee: employee ? {
                id: employee.id,
                nome: employee.nome || '',
                matricula: employee.matricula || ''
              } : undefined
            };
          } catch {
            return approval;
          }
        })
      );

      return approvalsWithEmployees;
    },
    enabled: !!selectedCompany?.id
  });

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = 
      approval.employee?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.employee?.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.tipo_equipamento?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'ativo': return 'bg-blue-100 text-blue-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Laptop className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'ativo': return <Laptop className="h-4 w-4 text-blue-600" />;
      case 'finalizado': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <Laptop className="h-4 w-4" />;
    }
  };

  const handleCreate = () => {
    setSelectedApproval(null);
    setFormData({
      employee_id: '',
      tipo_equipamento: '',
      valor_mensal: '',
      data_inicio: '',
      data_fim: '',
      justificativa: ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany?.id) {
      toast.error('Empresa não selecionada');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const approvalData = {
        company_id: selectedCompany.id,
        employee_id: formData.employee_id,
        tipo_equipamento: formData.tipo_equipamento,
        valor_mensal: parseFloat(formData.valor_mensal),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim || null,
        justificativa: formData.justificativa,
        status: 'pendente' as const
      };

      await EntityService.create({
        schema: 'rh',
        table: 'equipment_rental_approvals',
        data: approvalData,
        companyId: selectedCompany.id
      });

      toast.success('Solicitação de aluguel de equipamento criada com sucesso!');
      setIsFormOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-approvals'] });
    } catch (error: any) {
      console.error('Erro ao criar solicitação:', error);
      toast.error(error?.message || 'Erro ao criar solicitação de aluguel de equipamento');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <RequireEntity entityName="payroll" action="read">
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-6 w-6" />
                  Solicitações de Aluguel de Equipamentos
                </CardTitle>
                <CardDescription>
                  Gerencie as solicitações de aluguel de equipamentos dos funcionários
                </CardDescription>
              </div>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por funcionário ou tipo de equipamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma solicitação encontrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo de Equipamento</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Data Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {approval.employee?.nome || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {approval.employee?.matricula || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{approval.tipo_equipamento}</TableCell>
                      <TableCell>{formatCurrency(approval.valor_mensal)}</TableCell>
                      <TableCell>
                        {format(new Date(approval.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {approval.data_fim 
                          ? format(new Date(approval.data_fim), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Indefinido'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(approval.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(approval.status)}
                            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(approval.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de criação */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Solicitação de Aluguel de Equipamento</DialogTitle>
              <DialogDescription>
                Preencha os dados da solicitação de aluguel de equipamento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_id">Funcionário *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee: any) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nome} ({employee.matricula})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipo_equipamento">Tipo de Equipamento *</Label>
                  <Input
                    id="tipo_equipamento"
                    value={formData.tipo_equipamento}
                    onChange={(e) => setFormData({ ...formData, tipo_equipamento: e.target.value })}
                    placeholder="Ex: Notebook, Celular, etc."
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor_mensal">Valor Mensal (R$) *</Label>
                  <Input
                    id="valor_mensal"
                    type="number"
                    step="0.01"
                    value={formData.valor_mensal}
                    onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_inicio">Data Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="data_fim">Data Fim (opcional)</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Textarea
                  id="justificativa"
                  value={formData.justificativa}
                  onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                  placeholder="Descreva a justificativa para o aluguel do equipamento..."
                  rows={4}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Solicitação</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RequireEntity>
  );
};

export default EquipmentRentalApprovalsPage;
