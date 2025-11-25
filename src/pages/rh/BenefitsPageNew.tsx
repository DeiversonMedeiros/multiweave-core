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
  Trash2,
  Users
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import BenefitForm from '@/components/rh/BenefitForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { BenefitConfiguration } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function BenefitsPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitConfiguration | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks usando nova abordagem genérica
  const { data: benefits, isLoading, error } = useRHData<BenefitConfiguration>('benefit_configurations', selectedCompany?.id || '');
  const createBenefit = useCreateEntity<BenefitConfiguration>('rh', 'benefit_configurations', selectedCompany?.id || '');
  const updateBenefit = useUpdateEntity<BenefitConfiguration>('rh', 'benefit_configurations', selectedCompany?.id || '');
  const deleteBenefit = useDeleteEntity('rh', 'benefit_configurations', selectedCompany?.id || '');

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : (key === 'is_active' ? (value === 'active' ? true : value === 'inactive' ? false : undefined) : value)
    }));
  };

  const handleCreate = () => {
    setSelectedBenefit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (benefit: BenefitConfiguration) => {
    setSelectedBenefit(benefit);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (benefit: BenefitConfiguration) => {
    setSelectedBenefit(benefit);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (benefit: BenefitConfiguration) => {
    if (window.confirm(`Tem certeza que deseja excluir o benefício ${benefit.name}?`)) {
      try {
        await deleteBenefit.mutateAsync(benefit.id);
      } catch (error) {
        console.error('Erro ao excluir benefício:', error);
      }
    }
  };

  const handleModalSubmit = async (data: Partial<BenefitConfiguration>) => {
    try {
      // Validar que data não é undefined ou null
      if (!data || typeof data !== 'object') {
        console.error('Erro: dados inválidos para salvar benefício', data);
        return;
      }

      if (modalMode === 'create') {
        await createBenefit.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedBenefit) {
        await updateBenefit.mutateAsync({
          id: selectedBenefit.id,
          data: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar benefício:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando benefícios para CSV...');
  };

  const handleManageAssignments = (benefit: BenefitConfiguration) => {
    navigate(`/rh/employee-benefits?benefit_config_id=${benefit.id}`);
  };

  // Colunas da tabela - formato simplificado para dados diretos
  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (benefit: BenefitConfiguration) => (
        <div className="font-medium">{benefit.name}</div>
      )
    },
    {
      key: 'benefit_type',
      header: 'Tipo',
      render: (benefit: BenefitConfiguration) => {
        const typeConfig = {
          vr_va: { label: 'VR/VA', variant: 'default' as const },
          transporte: { label: 'Transporte', variant: 'secondary' as const },
          equipment_rental: { label: 'Aluguel Equipamento', variant: 'outline' as const },
          premiacao: { label: 'Premiação', variant: 'destructive' as const }
        };
        const config = typeConfig[benefit.benefit_type as keyof typeof typeConfig] || { label: benefit.benefit_type, variant: 'default' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      }
    },
    {
      key: 'calculation_type',
      header: 'Cálculo',
      render: (benefit: BenefitConfiguration) => {
        const typeConfig = {
          fixed_value: 'Valor Fixo',
          daily_value: 'Valor Diário',
          percentage: 'Percentual'
        };
        return (

    <div className="text-sm">
            {typeConfig[benefit.calculation_type as keyof typeof typeConfig] || benefit.calculation_type}
          </div>
        );
      }
    },
    {
      key: 'base_value',
      header: 'Valor Base',
      render: (benefit: BenefitConfiguration) => (
        <div className="font-medium text-green-600">
          {benefit.base_value ? `R$ ${benefit.base_value.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (benefit: BenefitConfiguration) => (
        <Badge variant={benefit.is_active ? 'default' : 'secondary'}>
          {benefit.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (benefit: BenefitConfiguration) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(benefit)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(benefit)
            },
            {
              label: 'Gerenciar Funcionários',
              icon: <Users className="h-4 w-4" />,
              onClick: () => handleManageAssignments(benefit)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(benefit),
              variant: 'destructive' as const
            }
          ]}
          item={benefit}
        />
      )
    }
  ];

  if (error) {
    return (
      
      <div className="p-6">
        <div className="text-red-500">Erro ao carregar benefícios: {error.message}</div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Benefícios</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações de benefícios da empresa
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Benefício
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
          value={filters.benefit_type || 'all'}
          onValueChange={(value) => handleFilterChange('benefit_type', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="vr_va">VR/VA</SelectItem>
            <SelectItem value="transporte">Transporte</SelectItem>
            <SelectItem value="equipment_rental">Aluguel Equipamento</SelectItem>
            <SelectItem value="premiacao">Premiação</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
          onValueChange={(value) => handleFilterChange('is_active', value)}
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
        data={benefits || []}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExportCsv}
        searchPlaceholder="Pesquisar benefícios..."
        emptyMessage="Nenhum benefício encontrado"
        className="mt-6"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Benefício' :
          modalMode === 'edit' ? 'Editar Benefício' :
          'Visualizar Benefício'
        }
        loading={createBenefit.isPending || updateBenefit.isPending}
        size="lg"
        submitLabel={modalMode === 'create' ? 'Criar Benefício' : 'Salvar Alterações'}
        onSubmit={() => {}} // FormModal vai chamar submit via ref
      >
        <BenefitForm
          benefit={selectedBenefit}
          onSubmit={handleModalSubmit}
          mode={modalMode}
          isLoading={createBenefit.isPending || updateBenefit.isPending}
          showSubmitButton={false}
        />
      </FormModal>
    </div>
    );
}
