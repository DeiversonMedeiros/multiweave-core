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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { TimeBankForm } from '@/components/rh/TimeBankForm';
import { useTimeBankEntries, useTimeBankMutations, useTimeBankStats } from '@/hooks/rh/useTimeBank';
import { TimeBank } from '@/integrations/supabase/rh-types';
import { 
  getTimeBankTypeColor, 
  getTimeBankStatusColor, 
  getTimeBankTypeLabel, 
  getTimeBankStatusLabel,
  formatHours,
  formatDate
} from '@/services/rh/timeBankService';
import { useCompany } from '@/lib/company-context';

export default function TimeBankPage() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    employee_id: 'all',
    tipo_hora: 'all',
    status: 'all',
    data_inicio: '',
    data_fim: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimeBank, setSelectedTimeBank] = useState<TimeBank | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: timeBankData, isLoading, error, refetch } = useTimeBankEntries(selectedCompany?.id || '', filters);
  const { data: statsData } = useTimeBankStats(selectedCompany?.id || '');
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = useTimeBankMutations(selectedCompany?.id || '');

  // Filtrar dados por termo de busca
  const filteredData = timeBankData?.data?.filter(item => 
    item.motivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = () => {
    setSelectedTimeBank(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (timeBank: TimeBank) => {
    setSelectedTimeBank(timeBank);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (timeBank: TimeBank) => {
    setSelectedTimeBank(timeBank);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro do banco de horas?')) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
      }
    }
  };

  const columns = [
    {
      key: 'data_registro',
      label: 'Data',
      render: (item: TimeBank) => formatDate(item.data_registro),
    },
    {
      key: 'tipo_hora',
      label: 'Tipo',
      render: (item: TimeBank) => (
        <Badge className={getTimeBankTypeColor(item.tipo_hora)}>
          {getTimeBankTypeLabel(item.tipo_hora)}
        </Badge>
      ),
    },
    {
      key: 'quantidade_horas',
      label: 'Horas',
      render: (item: TimeBank) => formatHours(item.quantidade_horas),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: TimeBank) => (
        <Badge className={getTimeBankStatusColor(item.status)}>
          {getTimeBankStatusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (item: TimeBank) => item.motivo || '-',
    },
    {
      key: 'data_expiracao',
      label: 'Expira em',
      render: (item: TimeBank) => item.data_expiracao ? formatDate(item.data_expiracao) : '-',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: TimeBank) => (
        <TableActions
          onView={() => handleView(item)}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item.id)}
          canEdit={item.status === 'pendente'}
          canDelete={item.status === 'pendente'}
        />
      ),
    },
  ];

  const stats = statsData || {
    total_entries: 0,
    pending_approval: 0,
    approved: 0,
    utilized: 0,
    expired: 0,
    total_hours: 0,
    by_type: { extra: 0, compensatoria: 0, sobreaviso: 0, adicional_noturno: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banco de Horas</h1>
          <p className="text-muted-foreground">
            Controle de horas extras e compensatórias dos funcionários
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_entries}</div>
            <p className="text-xs text-muted-foreground">
              {formatHours(stats.total_hours)} acumuladas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_approval}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para uso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizados</CardTitle>
            <XCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.utilized}</div>
            <p className="text-xs text-muted-foreground">
              Horas compensadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filters.tipo_hora} onValueChange={(value) => setFilters({ ...filters, tipo_hora: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="extra">Hora Extra</SelectItem>
                  <SelectItem value="compensatoria">Hora Compensatória</SelectItem>
                  <SelectItem value="sobreaviso">Sobreaviso</SelectItem>
                  <SelectItem value="adicional_noturno">Adicional Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                  <SelectItem value="utilizado">Utilizado</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Input
                type="date"
                value={filters.data_fim}
                onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Banco de Horas</CardTitle>
          <CardDescription>
            {filteredData.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleDataTable
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            emptyMessage="Nenhum registro de banco de horas encontrado"
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Registro de Banco de Horas' :
          modalMode === 'edit' ? 'Editar Registro' :
          'Visualizar Registro'
        }
        mode={modalMode}
      >
        <TimeBankForm
          timeBank={selectedTimeBank}
          mode={modalMode}
          onSave={(data) => {
            if (modalMode === 'create') {
              return createMutation.mutateAsync(data);
            } else {
              return updateMutation.mutateAsync({ ...data, id: selectedTimeBank?.id || '' });
            }
          }}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
  );
}
