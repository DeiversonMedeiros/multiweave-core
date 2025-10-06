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
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { WorkShiftForm } from '@/components/rh/WorkShiftForm';
import { useWorkShifts, useWorkShiftMutations } from '@/hooks/rh/useWorkShifts';
import { WorkShift } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export default function WorkShiftsPage() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    status: '',
    tipo_turno: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkShift, setSelectedWorkShift] = useState<WorkShift | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { workShifts, isLoading, error, refetch } = useWorkShifts(selectedCompany?.id || '', filters);
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = useWorkShiftMutations(selectedCompany?.id || '');

  // Filtrar dados por termo de busca
  const filteredWorkShifts = workShifts.filter(ws =>
    ws.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Colunas da tabela
  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (workShift: WorkShift) => (
        <div>
          <div className="font-medium">{workShift.nome}</div>
          {workShift.codigo && (
            <div className="text-sm text-muted-foreground">{workShift.codigo}</div>
          )}
        </div>
      ),
    },
    {
      key: 'horario',
      label: 'Horário',
      render: (workShift: WorkShift) => (
        <div className="text-sm">
          <div>{workShift.hora_inicio} - {workShift.hora_fim}</div>
          {workShift.intervalo_inicio && workShift.intervalo_fim && (
            <div className="text-muted-foreground">
              Intervalo: {workShift.intervalo_inicio} - {workShift.intervalo_fim}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'horas_diarias',
      label: 'Horas/Dia',
      render: (workShift: WorkShift) => (
        <Badge variant="outline">{workShift.horas_diarias}h</Badge>
      ),
    },
    {
      key: 'tipo_turno',
      label: 'Tipo',
      render: (workShift: WorkShift) => (
        <Badge 
          variant={workShift.tipo_turno === 'noturno' ? 'destructive' : 
                  workShift.tipo_turno === 'rotativo' ? 'secondary' : 'default'}
        >
          {workShift.tipo_turno}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (workShift: WorkShift) => (
        <Badge variant={workShift.status === 'ativo' ? 'default' : 'secondary'}>
          {workShift.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (workShift: WorkShift) => (
        <TableActions
          onView={() => handleView(workShift)}
          onEdit={() => handleEdit(workShift)}
          onDelete={() => handleDelete(workShift)}
        />
      ),
    },
  ];

  // Handlers
  const handleCreate = () => {
    setSelectedWorkShift(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleView = (workShift: WorkShift) => {
    setSelectedWorkShift(workShift);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (workShift: WorkShift) => {
    setSelectedWorkShift(workShift);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (workShift: WorkShift) => {
    if (confirm(`Tem certeza que deseja excluir o turno "${workShift.nome}"?`)) {
      try {
        await deleteMutation(workShift.id);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir turno:', error);
      }
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await createMutation({ ...data, company_id: selectedCompany?.id });
      } else if (modalMode === 'edit' && selectedWorkShift) {
        await updateMutation({ id: selectedWorkShift.id, ...data });
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar turno:', error);
    }
  };

  const handleExport = () => {
    // Implementar exportação CSV
    console.log('Exportar dados');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Turnos de Trabalho</h1>
          <p className="text-muted-foreground">
            Gerencie os turnos de trabalho da empresa
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Turno
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
                  placeholder="Nome, código ou descrição..."
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
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Turno</label>
              <Select value={filters.tipo_turno} onValueChange={(value) => setFilters({ ...filters, tipo_turno: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="noturno">Noturno</SelectItem>
                  <SelectItem value="rotativo">Rotativo</SelectItem>
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
        data={filteredWorkShifts}
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
        title={modalMode === 'create' ? 'Novo Turno de Trabalho' : 
               modalMode === 'edit' ? 'Editar Turno de Trabalho' : 'Visualizar Turno de Trabalho'}
        mode={modalMode}
      >
        <WorkShiftForm
          workShift={selectedWorkShift}
          mode={modalMode}
          onSave={handleSave}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
  );
}

