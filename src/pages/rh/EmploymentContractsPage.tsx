import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  FileText,
  Edit,
  Trash2,
  Eye,
  User
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { EmploymentContractForm } from '@/components/rh/EmploymentContractForm';
import { useEmploymentContracts, useEmploymentContractMutations } from '@/hooks/rh/useEmploymentContracts';
import { EmploymentContractWithEmployee } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
// Funções utilitárias locais
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export default function EmploymentContractsPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    status: '',
    tipo_contrato: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<EmploymentContractWithEmployee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { contracts, isLoading, error, refetch } = useEmploymentContracts(selectedCompany?.id || '', filters);
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = useEmploymentContractMutations(selectedCompany?.id || '');

  // Filtrar dados por termo de busca
  const filteredContracts = contracts.filter(contract =>
    contract.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.employee.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.employee.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.tipo_contrato.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Colunas da tabela
  const columns = [
    {
      key: 'employee',
      label: 'Funcionário',
      render: (contract: EmploymentContractWithEmployee) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{contract.employee.nome}</div>
            {contract.employee.matricula && (
              <div className="text-sm text-muted-foreground">{contract.employee.matricula}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contract',
      label: 'Contrato',
      render: (contract: EmploymentContractWithEmployee) => (
        <div>
          <div className="font-medium">{contract.numero_contrato}</div>
          <div className="text-sm text-muted-foreground">{contract.tipo_contrato}</div>
        </div>
      ),
    },
    {
      key: 'periodo',
      label: 'Período',
      render: (contract: EmploymentContractWithEmployee) => (
        <div className="text-sm">
          <div>Início: {formatDate(contract.data_inicio)}</div>
          {contract.data_fim && (
            <div>Fim: {formatDate(contract.data_fim)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'salario',
      label: 'Salário',
      render: (contract: EmploymentContractWithEmployee) => (
        <div className="text-sm">
          <div className="font-medium">{formatCurrency(contract.salario_base)}</div>
          <div className="text-muted-foreground">{contract.carga_horaria_semanal}h/semana</div>
        </div>
      ),
    },
    {
      key: 'regime',
      label: 'Regime',
      render: (contract: EmploymentContractWithEmployee) => (
        <div className="text-sm">
          <div>{contract.regime_trabalho.replace('_', ' ')}</div>
          <div className="text-muted-foreground">{contract.tipo_jornada}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (contract: EmploymentContractWithEmployee) => (
        <Badge 
          variant={
            contract.status === 'ativo' ? 'default' : 
            contract.status === 'suspenso' ? 'secondary' :
            contract.status === 'encerrado' ? 'outline' : 'destructive'
          }
        >
          {contract.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (contract: EmploymentContractWithEmployee) => (
        <TableActions
          onView={() => handleView(contract)}
          onEdit={() => handleEdit(contract)}
          onDelete={() => handleDelete(contract)}
        />
      ),
    },
  ];

  // Handlers
  const handleCreate = () => {
    setSelectedContract(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleView = (contract: EmploymentContractWithEmployee) => {
    setSelectedContract(contract);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (contract: EmploymentContractWithEmployee) => {
    setSelectedContract(contract);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (contract: EmploymentContractWithEmployee) => {
    if (confirm(`Tem certeza que deseja excluir o contrato "${contract.numero_contrato}"?`)) {
      try {
        await deleteMutation(contract.id);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir contrato:', error);
      }
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await createMutation({ ...data, company_id: selectedCompany?.id });
      } else if (modalMode === 'edit' && selectedContract) {
        await updateMutation({ id: selectedContract.id, ...data });
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
    }
  };

  const handleExport = () => {
    // Implementar exportação CSV
    console.log('Exportar dados');
  };

  return (
    <RequirePage pagePath="/rh/EmploymentContractsPage*" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos de Trabalho</h1>
          <p className="text-muted-foreground">
            Gerencie os contratos de trabalho dos funcionários
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Funcionário, contrato ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                  <SelectItem value="rescisao">Rescisão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Contrato</label>
              <Select value={filters.tipo_contrato} onValueChange={(value) => setFilters({ ...filters, tipo_contrato: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Estagiário">Estagiário</SelectItem>
                  <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                  <SelectItem value="Temporário">Temporário</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <SimpleDataTable
        data={filteredContracts}
        columns={columns}
        isLoading={isLoading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Novo Contrato de Trabalho' : 
               modalMode === 'edit' ? 'Editar Contrato de Trabalho' : 'Visualizar Contrato de Trabalho'}
        mode={modalMode}
      >
        <EmploymentContractForm
          contract={selectedContract}
          mode={modalMode}
          onSave={handleSave}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
    </RequirePage>
  );
}
