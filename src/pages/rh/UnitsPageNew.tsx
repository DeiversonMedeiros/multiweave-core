import React, { useState } from 'react';
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
  Plus, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { UnitForm } from '@/components/rh/UnitForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Unit } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { CostCenter } from '@/integrations/supabase/rh-types';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function UnitsPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingCostCenters, setLoadingCostCenters] = useState(false);

  // Hooks usando nova abordagem genérica
  const { data: units, isLoading, error } = useRHData<Unit>('units', selectedCompany?.id || '', filters);
  const createUnit = useCreateEntity<Unit>('rh', 'units', selectedCompany?.id || '');
  const updateUnit = useUpdateEntity<Unit>('rh', 'units', selectedCompany?.id || '');
  const deleteUnit = useDeleteEntity('rh', 'units', selectedCompany?.id || '');

  // Buscar centros de custo
  React.useEffect(() => {
    const fetchCostCenters = async () => {
      if (!selectedCompany?.id) return;
      
      setLoadingCostCenters(true);
      try {
        const { data, error } = await supabase
          .from('cost_centers')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        setCostCenters(data || []);
      } catch (error) {
        console.error('Erro ao buscar centros de custo:', error);
      } finally {
        setLoadingCostCenters(false);
      }
    };

    fetchCostCenters();
  }, [selectedCompany?.id]);

  // Função para obter o nome do centro de custo
  const getCostCenterName = (costCenterId: string | undefined) => {
    if (!costCenterId) return '-';
    const costCenter = costCenters.find(cc => cc.id === costCenterId);
    return costCenter ? `${costCenter.nome} (${costCenter.codigo})` : '-';
  };

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleCreate = () => {
    setSelectedUnit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (unit: Unit) => {
    setSelectedUnit(unit);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (unit: Unit) => {
    if (window.confirm(`Tem certeza que deseja excluir o departamento ${unit.nome}?`)) {
      try {
        await deleteUnit.mutateAsync(unit.id);
      } catch (error) {
        console.error('Erro ao excluir departamento:', error);
      }
    }
  };

  const handleModalSubmit = async (data: Partial<Unit>) => {
    try {
      if (modalMode === 'create') {
        await createUnit.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedUnit) {
        await updateUnit.mutateAsync({
          id: selectedUnit.id,
          updatedEntity: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar departamento:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando departamentos para CSV...');
  };

  // Colunas da tabela - formato simplificado para dados diretos
  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (unit: Unit) => (
        <div className="font-medium">{unit.nome}</div>
      )
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (unit: Unit) => (
        <div className="max-w-[200px] truncate">
          {unit.descricao || '-'}
        </div>
      )
    },
    {
      key: 'codigo',
      header: 'Código',
      render: (unit: Unit) => (
        <div className="font-mono text-sm">
          {unit.codigo || '-'}
        </div>
      )
    },
    {
      key: 'cost_center',
      header: 'Centro de Custo',
      render: (unit: Unit) => (
        <div className="text-sm">
          {getCostCenterName(unit.cost_center_id)}
        </div>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (unit: Unit) => (
        <Badge variant={unit.is_active ? 'default' : 'secondary'}>
          {unit.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (unit: Unit) => (
        <div className="text-sm text-muted-foreground">
          {unit.created_at ? new Date(unit.created_at).toLocaleDateString('pt-BR') : '-'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (unit: Unit) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(unit)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(unit)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(unit),
              variant: 'destructive' as const
            }
          ]}
          item={unit}
        />
      )
    }
  ];

  if (error) {
    return (

    <div className="p-6">
        <div className="text-red-500">Erro ao carregar departamentos: {error.message}</div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os departamentos da empresa
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Departamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select
          value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
          onValueChange={(value) => handleFilterChange('is_active', value === 'active' ? true : value === 'inactive' ? false : undefined)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleExportCsv}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabela */}
      <SimpleDataTable
        data={units || []}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExportCsv}
        searchPlaceholder="Pesquisar departamentos..."
        emptyMessage="Nenhum departamento encontrado"
        className="mt-6"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Departamento' :
          modalMode === 'edit' ? 'Editar Departamento' :
          'Visualizar Departamento'
        }
        onSubmit={handleModalSubmit}
        loading={createUnit.isPending || updateUnit.isPending}
        size="lg"
        submitLabel={modalMode === 'create' ? 'Criar Departamento' : 'Salvar Alterações'}
      >
        <UnitForm
          unit={selectedUnit}
          onSubmit={handleModalSubmit}
          mode={modalMode}
          costCenters={costCenters}
          loadingCostCenters={loadingCostCenters}
        />
      </FormModal>
    </div>
    );
}
