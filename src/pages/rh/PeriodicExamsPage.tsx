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
  Stethoscope,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Clock,
  FileText
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { PeriodicExamForm } from '@/components/rh/PeriodicExamForm';
import { usePeriodicExams, usePeriodicExamMutations, useExamStats } from '@/hooks/rh/usePeriodicExams';
import { PeriodicExam } from '@/integrations/supabase/rh-types';
import { 
  getExamTypeColor, 
  getExamStatusColor, 
  getExamResultColor,
  getExamTypeLabel, 
  getExamStatusLabel, 
  getExamResultLabel,
  formatDate,
  formatCurrency
} from '@/services/rh/periodicExamsService';
import { useCompany } from '@/lib/company-context';

export default function PeriodicExamsPage() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    employee_id: 'all',
    tipo_exame: 'all',
    status: 'all',
    resultado: 'all',
    data_inicio: '',
    data_fim: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<PeriodicExam | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: examsData, isLoading, error, refetch } = usePeriodicExams(selectedCompany?.id || '', filters);
  const { data: statsData } = useExamStats(selectedCompany?.id || '');
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = usePeriodicExamMutations(selectedCompany?.id || '');

  // Filtrar dados por termo de busca
  const filteredData = examsData?.data?.filter(item => 
    item.medico_responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.clinica_local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = () => {
    setSelectedExam(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (exam: PeriodicExam) => {
    setSelectedExam(exam);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (exam: PeriodicExam) => {
    setSelectedExam(exam);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este exame?')) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Erro ao excluir exame:', error);
      }
    }
  };

  const columns = [
    {
      key: 'data_agendamento',
      label: 'Data Agendamento',
      render: (item: PeriodicExam) => formatDate(item.data_agendamento),
    },
    {
      key: 'tipo_exame',
      label: 'Tipo',
      render: (item: PeriodicExam) => (
        <Badge className={getExamTypeColor(item.tipo_exame)}>
          {getExamTypeLabel(item.tipo_exame)}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: PeriodicExam) => (
        <Badge className={getExamStatusColor(item.status)}>
          {getExamStatusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (item: PeriodicExam) => (
        <div className={`flex items-center gap-2 ${new Date(item.data_vencimento) < new Date() ? 'text-red-600' : ''}`}>
          <Calendar className="h-4 w-4" />
          {formatDate(item.data_vencimento)}
        </div>
      ),
    },
    {
      key: 'resultado',
      label: 'Resultado',
      render: (item: PeriodicExam) => item.resultado ? (
        <Badge className={getExamResultColor(item.resultado)}>
          {getExamResultLabel(item.resultado)}
        </Badge>
      ) : '-',
    },
    {
      key: 'medico_responsavel',
      label: 'Médico',
      render: (item: PeriodicExam) => item.medico_responsavel || '-',
    },
    {
      key: 'custo',
      label: 'Custo',
      render: (item: PeriodicExam) => item.custo ? formatCurrency(item.custo) : '-',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: PeriodicExam) => (
        <TableActions
          onView={() => handleView(item)}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item.id)}
          canEdit={item.status === 'agendado' || item.status === 'reagendado'}
          canDelete={item.status === 'agendado' || item.status === 'cancelado'}
        />
      ),
    },
  ];

  const stats = statsData || {
    total_exams: 0,
    by_status: { agendado: 0, realizado: 0, vencido: 0, cancelado: 0, reagendado: 0 },
    by_type: { admissional: 0, periodico: 0, demissional: 0, retorno_trabalho: 0, mudanca_funcao: 0, ambiental: 0 },
    by_result: { apto: 0, inapto: 0, apto_com_restricoes: 0, pendente: 0 },
    total_cost: 0,
    paid_exams: 0,
    unpaid_exams: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exames Periódicos</h1>
          <p className="text-muted-foreground">
            Controle de exames médicos ocupacionais e periódicos
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Exame
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_exams}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.total_cost)} em custos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_status.agendado}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando realização
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_status.realizado}</div>
            <p className="text-xs text-muted-foreground">
              Exames concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_status.vencido}</div>
            <p className="text-xs text-muted-foreground">
              Necessitam atenção
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
                  placeholder="Buscar por médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filters.tipo_exame} onValueChange={(value) => setFilters({ ...filters, tipo_exame: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admissional">Admissional</SelectItem>
                  <SelectItem value="periodico">Periódico</SelectItem>
                  <SelectItem value="demissional">Demissional</SelectItem>
                  <SelectItem value="retorno_trabalho">Retorno ao Trabalho</SelectItem>
                  <SelectItem value="mudanca_funcao">Mudança de Função</SelectItem>
                  <SelectItem value="ambiental">Ambiental</SelectItem>
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
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="reagendado">Reagendado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resultado</label>
              <Select value={filters.resultado} onValueChange={(value) => setFilters({ ...filters, resultado: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os resultados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="apto">Apto</SelectItem>
                  <SelectItem value="inapto">Inapto</SelectItem>
                  <SelectItem value="apto_com_restricoes">Apto com Restrições</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
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
          <CardTitle>Exames Periódicos</CardTitle>
          <CardDescription>
            {filteredData.length} exame(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleDataTable
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            emptyMessage="Nenhum exame encontrado"
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Exame Periódico' :
          modalMode === 'edit' ? 'Editar Exame' :
          'Visualizar Exame'
        }
        mode={modalMode}
      >
        <PeriodicExamForm
          exam={selectedExam}
          mode={modalMode}
          onSave={(data) => {
            if (modalMode === 'create') {
              return createMutation.mutateAsync(data);
            } else {
              return updateMutation.mutateAsync({ ...data, id: selectedExam?.id || '' });
            }
          }}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
  );
}