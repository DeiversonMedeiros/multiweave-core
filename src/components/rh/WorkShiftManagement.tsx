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
  Download,
  Clock,
  Users,
  Calendar,
  Settings
} from 'lucide-react';
import { WorkShiftTable } from './WorkShiftTable';
import { EmployeeShiftManagement } from './EmployeeShiftManagement';
import { WorkShiftForm } from './WorkShiftForm';
import { FormModal } from './FormModal';
import { WorkShift } from '@/integrations/supabase/rh-types';

interface WorkShiftManagementProps {
  workShifts: WorkShift[];
  employeeShifts: any[];
  employees: any[];
  onWorkShiftCreate: (data: any) => void;
  onWorkShiftEdit: (id: string, data: any) => void;
  onWorkShiftDelete: (id: string) => void;
  onEmployeeShiftCreate: (data: any) => void;
  onEmployeeShiftEdit: (id: string, data: any) => void;
  onEmployeeShiftDelete: (id: string) => void;
  isLoading?: boolean;
}

export function WorkShiftManagement({
  workShifts,
  employeeShifts,
  employees,
  onWorkShiftCreate,
  onWorkShiftEdit,
  onWorkShiftDelete,
  onEmployeeShiftCreate,
  onEmployeeShiftEdit,
  onEmployeeShiftDelete,
  isLoading = false
}: WorkShiftManagementProps) {
  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments'>('shifts');
  const [filters, setFilters] = useState({
    status: 'all',
    tipo_turno: 'all',
    tipo_escala: 'all',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showWorkShiftForm, setShowWorkShiftForm] = useState(false);
  const [selectedWorkShift, setSelectedWorkShift] = useState<WorkShift | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Filtrar turnos
  const filteredWorkShifts = workShifts.filter(ws => {
    const matchesSearch = ws.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ws.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ws.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filters.status || filters.status === 'all' || ws.status === filters.status;
    const matchesTipoTurno = !filters.tipo_turno || filters.tipo_turno === 'all' || ws.tipo_turno === filters.tipo_turno;
    const matchesTipoEscala = !filters.tipo_escala || filters.tipo_escala === 'all' || ws.tipo_escala === filters.tipo_escala;
    
    return matchesSearch && matchesStatus && matchesTipoTurno && matchesTipoEscala;
  });

  // Handlers para turnos
  const handleWorkShiftCreate = () => {
    setSelectedWorkShift(null);
    setModalMode('create');
    setShowWorkShiftForm(true);
  };

  const handleWorkShiftView = (workShift: WorkShift) => {
    setSelectedWorkShift(workShift);
    setModalMode('view');
    setShowWorkShiftForm(true);
  };

  const handleWorkShiftEdit = (workShift: WorkShift) => {
    setSelectedWorkShift(workShift);
    setModalMode('edit');
    setShowWorkShiftForm(true);
  };

  const handleWorkShiftDelete = (workShift: WorkShift) => {
    if (confirm(`Tem certeza que deseja excluir o turno "${workShift.nome}"?`)) {
      onWorkShiftDelete(workShift.id);
    }
  };

  const handleWorkShiftSave = (data: any) => {
    console.log('🔍 [DEBUG] WorkShiftManagement - handleWorkShiftSave chamado');
    console.log('🔍 [DEBUG] WorkShiftManagement - modalMode:', modalMode);
    console.log('🔍 [DEBUG] WorkShiftManagement - data recebido:', data);
    console.log('🔍 [DEBUG] WorkShiftManagement - selectedWorkShift:', selectedWorkShift);
    
    if (modalMode === 'create') {
      console.log('🔍 [DEBUG] WorkShiftManagement - Chamando onWorkShiftCreate com:', data);
      onWorkShiftCreate(data);
    } else if (modalMode === 'edit' && selectedWorkShift) {
      console.log('🔍 [DEBUG] WorkShiftManagement - Chamando onWorkShiftEdit com:', selectedWorkShift.id, data);
      onWorkShiftEdit(selectedWorkShift.id, data);
    }
    setShowWorkShiftForm(false);
  };

  // Estatísticas
  const stats = {
    totalShifts: workShifts.length,
    activeShifts: workShifts.filter(ws => ws.status === 'ativo').length,
    templateShifts: workShifts.filter(ws => ws.template_escala).length,
    totalAssignments: employeeShifts.length,
    activeAssignments: employeeShifts.filter(es => es.ativo).length,
  };

  const handleExport = () => {
    // Implementar exportação
    console.log('Exportar dados');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escalas de Trabalho</h1>
          <p className="text-muted-foreground">
            Gerencie as escalas e turnos de trabalho da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {activeTab === 'shifts' && (
            <Button onClick={handleWorkShiftCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Escala
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Escalas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeShifts} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalas Ativas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShifts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.templateShifts} templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnos Diferentes</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(workShifts.map(ws => ws.tipo_escala)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Tipos únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Escalados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAssignments} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'shifts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Turnos de Trabalho
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'assignments'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Atribuições de Funcionários
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'shifts' ? (
        <div className="space-y-6">
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
                  <SelectItem value="all">Todos</SelectItem>
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
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="noturno">Noturno</SelectItem>
                  <SelectItem value="rotativo">Rotativo</SelectItem>
                </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Escala</label>
                  <Select value={filters.tipo_escala} onValueChange={(value) => setFilters({ ...filters, tipo_escala: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as escalas" />
                    </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="fixa">Escala Fixa</SelectItem>
                  <SelectItem value="flexivel_6x1">Flexível 6x1</SelectItem>
                  <SelectItem value="flexivel_5x2">Flexível 5x2</SelectItem>
                  <SelectItem value="flexivel_4x3">Flexível 4x3</SelectItem>
                  <SelectItem value="escala_12x36">12x36</SelectItem>
                  <SelectItem value="escala_24x48">24x48</SelectItem>
                  <SelectItem value="personalizada">Personalizada</SelectItem>
                </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Turnos */}
          <WorkShiftTable
            workShifts={filteredWorkShifts}
            onView={handleWorkShiftView}
            onEdit={handleWorkShiftEdit}
            onDelete={handleWorkShiftDelete}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <EmployeeShiftManagement
          employeeShifts={employeeShifts}
          workShifts={workShifts}
          employees={employees}
          onAdd={onEmployeeShiftCreate}
          onEdit={onEmployeeShiftEdit}
          onDelete={onEmployeeShiftDelete}
          isLoading={isLoading}
        />
      )}

      {/* Modal de Formulário de Turno */}
      <FormModal
        isOpen={showWorkShiftForm}
        onClose={() => setShowWorkShiftForm(false)}
        title={modalMode === 'create' ? 'Nova Escala de Trabalho' : 
               modalMode === 'edit' ? 'Editar Escala de Trabalho' : 'Visualizar Escala de Trabalho'}
        description={modalMode === 'create' ? 'Crie uma nova escala de trabalho para os funcionários' : 
                    modalMode === 'edit' ? 'Edite as informações da escala de trabalho' : 'Visualize as informações da escala de trabalho'}
        onSubmit={modalMode !== 'view' ? handleWorkShiftSave : undefined}
        submitLabel={modalMode === 'create' ? 'Criar Escala' : 'Salvar Alterações'}
        showFooter={modalMode !== 'view'}
      >
        <WorkShiftForm
          workShift={selectedWorkShift}
          mode={modalMode}
          onSave={handleWorkShiftSave}
          isLoading={isLoading}
          onSubmit={handleWorkShiftSave}
        />
      </FormModal>
    </div>
  );
}
