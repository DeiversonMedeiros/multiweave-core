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
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Clock,
  FileText,
  Shield,
  AlertCircle
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { DisciplinaryActionForm } from '@/components/rh/DisciplinaryActionForm';
import { useDisciplinaryActions, useDisciplinaryActionMutations, useDisciplinaryActionStats } from '@/hooks/rh/useDisciplinaryActions';
import { DisciplinaryAction } from '@/integrations/supabase/rh-types';
import { 
  getActionTypeColor, 
  getSeverityColor, 
  getActionStatusColor,
  getActionTypeLabel, 
  getSeverityLabel, 
  getActionStatusLabel,
  formatDate
} from '@/services/rh/disciplinaryActionsService';
import { useCompany } from '@/lib/company-context';

export default function DisciplinaryActionsPage() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    employee_id: 'all',
    tipo_acao: 'all',
    gravidade: 'all',
    status: 'all',
    data_inicio: '',
    data_fim: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<DisciplinaryAction | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: actionsData, isLoading, error, refetch } = useDisciplinaryActions(selectedCompany?.id || '', filters);
  const { data: statsData } = useDisciplinaryActionStats(selectedCompany?.id || '');
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = useDisciplinaryActionMutations(selectedCompany?.id || '');

  // Filtrar dados por termo de busca
  const filteredData = actionsData?.data?.filter(item => 
    item.motivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descricao_ocorrencia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.medidas_corretivas?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = () => {
    setSelectedAction(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (action: DisciplinaryAction) => {
    setSelectedAction(action);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (action: DisciplinaryAction) => {
    setSelectedAction(action);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta ação disciplinar?')) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Erro ao excluir ação disciplinar:', error);
      }
    }
  };

  const columns = [
    {
      key: 'data_ocorrencia',
      label: 'Data Ocorrência',
      render: (item: DisciplinaryAction) => formatDate(item.data_ocorrencia),
    },
    {
      key: 'tipo_acao',
      label: 'Tipo',
      render: (item: DisciplinaryAction) => (
        <Badge className={getActionTypeColor(item.tipo_acao)}>
          {getActionTypeLabel(item.tipo_acao)}
        </Badge>
      ),
    },
    {
      key: 'gravidade',
      label: 'Gravidade',
      render: (item: DisciplinaryAction) => (
        <Badge className={getSeverityColor(item.gravidade)}>
          {getSeverityLabel(item.gravidade)}
        </Badge>
      ),
    },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (item: DisciplinaryAction) => (
        <div className="max-w-xs truncate" title={item.motivo}>
          {item.motivo}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: DisciplinaryAction) => (
        <Badge className={getActionStatusColor(item.status)}>
          {getActionStatusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: 'data_aplicacao',
      label: 'Data Aplicação',
      render: (item: DisciplinaryAction) => formatDate(item.data_aplicacao),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: DisciplinaryAction) => (
        <TableActions
          onView={() => handleView(item)}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item.id)}
          canEdit={item.status === 'ativo'}
          canDelete={item.status === 'ativo' || item.status === 'cancelado'}
        />
      ),
    },
  ];

  const stats = statsData || {
    total_actions: 0,
    by_type: { advertencia: 0, suspensao: 0, demissao_justa_causa: 0, transferencia: 0, outros: 0 },
    by_severity: { leve: 0, moderada: 0, grave: 0, gravissima: 0 },
    by_status: { ativo: 0, suspenso: 0, cancelado: 0, arquivado: 0 },
    recent_actions: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ações Disciplinares</h1>
          <p className="text-muted-foreground">
            Gestão de ações disciplinares e medidas corretivas
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Ação
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_actions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recent_actions} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_status.ativo}</div>
            <p className="text-xs text-muted-foreground">
              Ações em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graves</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_severity.grave + stats.by_severity.gravissima}</div>
            <p className="text-xs text-muted-foreground">
              Ações de alta gravidade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivadas</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_status.arquivado}</div>
            <p className="text-xs text-muted-foreground">
              Ações finalizadas
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
              <Select value={filters.tipo_acao} onValueChange={(value) => setFilters({ ...filters, tipo_acao: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="advertencia">Advertência</SelectItem>
                  <SelectItem value="suspensao">Suspensão</SelectItem>
                  <SelectItem value="demissao_justa_causa">Demissão por Justa Causa</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gravidade</label>
              <Select value={filters.gravidade} onValueChange={(value) => setFilters({ ...filters, gravidade: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as gravidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                  <SelectItem value="gravissima">Gravíssima</SelectItem>
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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
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
          <CardTitle>Ações Disciplinares</CardTitle>
          <CardDescription>
            {filteredData.length} ação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleDataTable
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            emptyMessage="Nenhuma ação disciplinar encontrada"
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Nova Ação Disciplinar' :
          modalMode === 'edit' ? 'Editar Ação' :
          'Visualizar Ação'
        }
        mode={modalMode}
      >
        <DisciplinaryActionForm
          action={selectedAction}
          mode={modalMode}
          onSave={(data) => {
            if (modalMode === 'create') {
              return createMutation.mutateAsync(data);
            } else {
              return updateMutation.mutateAsync({ ...data, id: selectedAction?.id || '' });
            }
          }}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
  );
}
