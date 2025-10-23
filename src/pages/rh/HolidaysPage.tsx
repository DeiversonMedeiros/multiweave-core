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
  Calendar,
  Globe,
  MapPin,
  Building,
  Clock,
  Eye,
  Edit,
  Trash2,
  Upload
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { HolidayForm } from '@/components/rh/HolidayForm';
import { useHolidays, useHolidayMutations, useHolidayStats } from '@/hooks/rh/useHolidays';
import { Holiday } from '@/integrations/supabase/rh-types';
import { 
  getHolidayTypeColor, 
  getHolidayTypeLabel,
  formatDate,
  formatDateWithWeekday
} from '@/services/rh/holidaysService';
import { useCompany } from '@/lib/company-context';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function HolidaysPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    tipo: 'all',
    ativo: 'all',
    ano: new Date().getFullYear(),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: holidaysData, isLoading, error, refetch } = useHolidays(selectedCompany?.id || '', filters);
  const { data: statsData } = useHolidayStats(selectedCompany?.id || '');
  const { createMutation, updateMutation, deleteMutation, importNationalMutation, isLoading: isMutating } = useHolidayMutations(selectedCompany?.id || '');

  // Filtrar dados por termo de busca
  const filteredData = holidaysData?.data?.filter(item => 
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = () => {
    setSelectedHoliday(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este feriado?')) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Erro ao excluir feriado:', error);
      }
    }
  };

  const handleImportNational = async () => {
    if (window.confirm(`Importar feriados nacionais brasileiros para ${filters.ano}?`)) {
      try {
        await importNationalMutation.mutateAsync(filters.ano);
      } catch (error) {
        console.error('Erro ao importar feriados:', error);
      }
    }
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (item: Holiday) => item.nome,
    },
    {
      key: 'data',
      label: 'Data',
      render: (item: Holiday) => (
        <div>
          <div className="font-medium">{formatDate(item.data)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDateWithWeekday(item.data)}
          </div>
        </div>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item: Holiday) => (
        <Badge className={getHolidayTypeColor(item.tipo)}>
          {getHolidayTypeLabel(item.tipo)}
        </Badge>
      ),
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (item: Holiday) => (
        <Badge variant={item.ativo ? 'default' : 'secondary'}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (item: Holiday) => item.descricao || '-',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: Holiday) => (
        <TableActions
          onView={() => handleView(item)}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item.id)}
        />
      ),
    },
  ];

  const stats = statsData || {
    total_holidays: 0,
    by_type: { nacional: 0, estadual: 0, municipal: 0, pontos_facultativos: 0, outros: 0 },
    active: 0,
    inactive: 0
  };

  return (
    <RequireEntity entityName="holidays" action="read">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feriados</h1>
          <p className="text-muted-foreground">
            Gestão de feriados e pontos facultativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleImportNational} 
            variant="outline"
            className="flex items-center gap-2"
            disabled={importNationalMutation.isPending}
          >
            <Upload className="h-4 w-4" />
            Importar Nacionais {filters.ano}
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Feriado
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_holidays}</div>
            <p className="text-xs text-muted-foreground">
              Feriados cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nacionais</CardTitle>
            <Globe className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_type.nacional}</div>
            <p className="text-xs text-muted-foreground">
              Feriados nacionais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estaduais</CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_type.estadual}</div>
            <p className="text-xs text-muted-foreground">
              Feriados estaduais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Municipais</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.by_type.municipal}</div>
            <p className="text-xs text-muted-foreground">
              Feriados municipais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Feriados ativos
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters({ ...filters, tipo: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="pontos_facultativos">Pontos Facultativos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.ativo} onValueChange={(value) => setFilters({ ...filters, ativo: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Input
                type="number"
                value={filters.ano}
                onChange={(e) => setFilters({ ...filters, ano: parseInt(e.target.value) })}
                min="2020"
                max="2030"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Feriados</CardTitle>
          <CardDescription>
            {filteredData.length} feriado(s) encontrado(s) em {filters.ano}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleDataTable
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            emptyMessage="Nenhum feriado encontrado"
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Feriado' :
          modalMode === 'edit' ? 'Editar Feriado' :
          'Visualizar Feriado'
        }
        mode={modalMode}
      >
        <HolidayForm
          holiday={selectedHoliday}
          mode={modalMode}
          onSave={(data) => {
            if (modalMode === 'create') {
              return createMutation.mutateAsync(data);
            } else {
              return updateMutation.mutateAsync({ ...data, id: selectedHoliday?.id || '' });
            }
          }}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
    </RequireEntity>
  );
}
