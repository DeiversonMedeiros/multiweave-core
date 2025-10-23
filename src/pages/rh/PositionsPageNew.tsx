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
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Position } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function PositionsPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    nivel_hierarquico: 1,
    carga_horaria: 40,
    is_active: true
  });

  // Hooks usando nova abordagem genérica
  const { data: positionsData, isLoading, error } = useRHData<Position>('positions', selectedCompany?.id || '', filters);
  const createPosition = useCreateEntity<Position>('rh', 'positions', selectedCompany?.id || '');
  const updatePosition = useUpdateEntity<Position>('rh', 'positions', selectedCompany?.id || '');
  const deletePosition = useDeleteEntity('rh', 'positions', selectedCompany?.id || '');

  // Dados
  const positions = positionsData?.data || [];
  const totalCount = positionsData?.totalCount || 0;

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
    setSelectedPosition(null);
    setModalMode('create');
    setFormData({
      nome: '',
      descricao: '',
      nivel_hierarquico: 1,
      carga_horaria: 40,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
    setModalMode('edit');
    setFormData({
      nome: position.nome || '',
      descricao: position.descricao || '',
      nivel_hierarquico: position.nivel_hierarquico || 1,
      carga_horaria: position.carga_horaria || 40,
      is_active: position.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleView = (position: Position) => {
    setSelectedPosition(position);
    setModalMode('view');
    setFormData({
      nome: position.nome || '',
      descricao: position.descricao || '',
      nivel_hierarquico: position.nivel_hierarquico || 1,
      carga_horaria: position.carga_horaria || 40,
      is_active: position.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (position: Position) => {
    if (window.confirm(`Tem certeza que deseja excluir o cargo ${position.nome}?`)) {
      try {
        await deletePosition.mutateAsync(position.id);
      } catch (error) {
        console.error('Erro ao excluir cargo:', error);
      }
    }
  };

  const handleModalSubmit = async () => {
    try {
      console.log('🔍 [DEBUG] Dados do formulário:', formData);
      console.log('🔍 [DEBUG] Tipos dos dados:', {
        nome: typeof formData.nome,
        descricao: typeof formData.descricao,
        nivel_hierarquico: typeof formData.nivel_hierarquico,
        carga_horaria: typeof formData.carga_horaria,
        is_active: typeof formData.is_active
      });

      if (modalMode === 'create') {
        // Limpar dados para evitar referências circulares e garantir tipos corretos
        const cleanData = {
          nome: formData.nome || '',
          descricao: formData.descricao || '',
          nivel_hierarquico: Number(formData.nivel_hierarquico) || 1,
          carga_horaria: Number(formData.carga_horaria) || 40,
          is_active: Boolean(formData.is_active),
          // Não incluir company_id aqui pois já é passado no hook
        };
        
        console.log('🔍 [DEBUG] Dados limpos para criação:', cleanData);
        console.log('🔍 [DEBUG] Tipos dos dados limpos:', {
          nome: typeof cleanData.nome,
          descricao: typeof cleanData.descricao,
          nivel_hierarquico: typeof cleanData.nivel_hierarquico,
          carga_horaria: typeof cleanData.carga_horaria,
          is_active: typeof cleanData.is_active
        });
        
        await createPosition.mutateAsync(cleanData);
      } else if (modalMode === 'edit' && selectedPosition) {
        // Limpar dados para evitar referências circulares e garantir tipos corretos
        const cleanData = {
          nome: formData.nome || '',
          descricao: formData.descricao || '',
          nivel_hierarquico: Number(formData.nivel_hierarquico) || 1,
          carga_horaria: Number(formData.carga_horaria) || 40,
          is_active: Boolean(formData.is_active),
        };
        
        console.log('🔍 [DEBUG] Dados limpos para edição:', cleanData);
        console.log('🔍 [DEBUG] Tipos dos dados limpos:', {
          nome: typeof cleanData.nome,
          descricao: typeof cleanData.descricao,
          nivel_hierarquico: typeof cleanData.nivel_hierarquico,
          carga_horaria: typeof cleanData.carga_horaria,
          is_active: typeof cleanData.is_active
        });
        
        await updatePosition.mutateAsync({
          id: selectedPosition.id,
          data: cleanData
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('❌ [ERROR] Erro ao salvar cargo:', error);
      console.error('❌ [ERROR] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportCsv = () => {
    console.log('Exportando cargos para CSV...');
  };

  // Colunas da tabela - formato simplificado
  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (position: Position) => (
        <div className="font-medium">{position.nome}</div>
      )
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (position: Position) => (
        <div className="max-w-[200px] truncate">
          {position.descricao || '-'}
        </div>
      )
    },
    {
      key: 'nivel_hierarquico',
      header: 'Nível',
      render: (position: Position) => {
        return position.nivel_hierarquico ? `Nível ${position.nivel_hierarquico}` : '-';
      }
    },
    {
      key: 'carga_horaria',
      header: 'Carga Horária',
      render: (position: Position) => {
        return position.carga_horaria ? `${position.carga_horaria}h/semana` : '-';
      }
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (position: Position) => (
        <Badge variant={position.is_active ? 'default' : 'secondary'}>
          {position.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (position: Position) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(position)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(position)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(position),
              variant: 'destructive' as const
            }
          ]}
          item={position}
        />
      )
    }
  ];

  if (error) {
    return (

    <div className="p-6">
        <div className="text-red-500">Erro ao carregar cargos: {error.message}</div>
      </div>
    );
  }

  return (
    <RequireEntity entityName="positions" action="read">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cargos</h1>
          <p className="text-muted-foreground">
            Gerencie os cargos e posições da empresa
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Cargo
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
        data={positions || []}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExportCsv}
        searchPlaceholder="Pesquisar cargos..."
        emptyMessage="Nenhum cargo encontrado"
        className="mt-6"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Cargo' :
          modalMode === 'edit' ? 'Editar Cargo' :
          'Visualizar Cargo'
        }
        onSubmit={handleModalSubmit}
        loading={createPosition.isPending || updatePosition.isPending}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="nome" className="text-sm font-medium">Nome do Cargo *</label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Ex: Desenvolvedor Senior"
              disabled={modalMode === 'view'}
              required
            />
          </div>
          <div>
            <label htmlFor="descricao" className="text-sm font-medium">Descrição</label>
            <textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Descrição do cargo..."
              disabled={modalMode === 'view'}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nivel_hierarquico" className="text-sm font-medium">Nível Hierárquico</label>
              <Input
                id="nivel_hierarquico"
                type="number"
                value={formData.nivel_hierarquico}
                onChange={(e) => handleInputChange('nivel_hierarquico', parseInt(e.target.value) || 1)}
                placeholder="1"
                disabled={modalMode === 'view'}
                min="1"
              />
            </div>
            <div>
              <label htmlFor="carga_horaria" className="text-sm font-medium">Carga Horária (h/semana)</label>
              <Input
                id="carga_horaria"
                type="number"
                value={formData.carga_horaria}
                onChange={(e) => handleInputChange('carga_horaria', parseInt(e.target.value) || 40)}
                placeholder="40"
                disabled={modalMode === 'view'}
                min="1"
                max="60"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              disabled={modalMode === 'view'}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium">
              Cargo ativo
            </label>
          </div>
        </div>
      </FormModal>
      </div>
    </RequireEntity>
  );
}
