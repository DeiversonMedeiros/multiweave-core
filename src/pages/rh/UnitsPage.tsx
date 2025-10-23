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
  Building2,
  User
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/rh/EnhancedDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { useUnits, useDeleteUnit } from '@/hooks/rh/useUnits';
import { Unit } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function UnitsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: units = [], isLoading } = useUnits();
  const deleteUnitMutation = useDeleteUnit();

  // Filtrar dados
  const filteredUnits = units.filter(unit => {
    const matchesSearch = !searchTerm || 
      unit.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && unit.is_active) ||
      (statusFilter === 'inactive' && !unit.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
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
    if (confirm(`Tem certeza que deseja excluir o departamento ${unit.nome}?`)) {
      try {
        await deleteUnitMutation.mutateAsync(unit.id);
      } catch (error) {
        console.error('Erro ao excluir departamento:', error);
      }
    }
  };

  const handleExport = () => {
    console.log('Exportar departamentos');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  };

  const handleModalSubmit = (data: any) => {
    console.log('Salvar departamento:', data);
    handleModalClose();
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ row }: { row: { original: Unit } }) => (
        <div>
          <div className="font-medium">{row.original.nome}</div>
          {row.original.codigo && (
            <div className="text-sm text-muted-foreground">
              Código: {row.original.codigo}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'responsavel',
      header: 'Responsável',
      cell: ({ row }: { row: { original: Unit } }) => {
        const responsavel = row.original.responsavel;
        if (responsavel) {
          return (
            <RequireEntity entityName="units" action="read">
      <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{responsavel.nome}</span>
            </div>
          );
        }
        return <span className="text-sm text-muted-foreground">Sem responsável</span>;
      },
    },
    {
      accessorKey: 'descricao',
      header: 'Descrição',
      cell: ({ row }: { row: { original: Unit } }) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {row.original.descricao || 'Sem descrição'}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }: { row: { original: Unit } }) => {
        const isActive = row.original.is_active;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        );
      },
    },
  ];

  // Ações da tabela
  const actions = [
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleView,
      variant: 'default' as const,
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      variant: 'default' as const,
    },
    {
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Confirmar Exclusão',
      confirmationMessage: 'Tem certeza que deseja excluir este departamento? Esta ação não pode ser desfeita.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os departamentos e unidades da empresa
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Departamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select
          value={statusFilter}
          onValueChange={handleStatusFilter}
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

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Tabela */}
      <EnhancedDataTable
        data={filteredUnits}
        columns={columns}
        loading={isLoading}
        searchable={false} // Já temos busca customizada
        filterable={false} // Já temos filtros customizados
        pagination={true}
        actions={actions}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Buscar departamentos..."
        emptyMessage="Nenhum departamento encontrado"
        pageSize={10}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === 'create' ? 'Novo Departamento' :
          modalMode === 'edit' ? 'Editar Departamento' :
          'Detalhes do Departamento'
        }
        description={
          modalMode === 'create' ? 'Preencha os dados do novo departamento' :
          modalMode === 'edit' ? 'Atualize os dados do departamento' :
          'Visualize os dados do departamento'
        }
        onSubmit={handleModalSubmit}
        loading={false}
        size="lg"
        submitLabel={modalMode === 'view' ? undefined : 'Salvar'}
        cancelLabel="Fechar"
      >
        <div className="space-y-4">
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUnit?.nome}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUnit?.codigo || 'Não definido'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUnit?.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Responsável</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUnit?.responsavel?.nome || 'Sem responsável'}
                  </p>
                </div>
              </div>
              {selectedUnit?.descricao && (
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUnit.descricao}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input placeholder="Nome do departamento" />
                </div>
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <Input placeholder="Código do departamento" />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Responsável</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {/* Aqui seria carregado a lista de funcionários */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea 
                  className="w-full p-2 border rounded-md"
                  placeholder="Descrição do departamento"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </FormModal>
    </div>
    </RequireEntity>
  );
}
