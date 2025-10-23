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
  Building
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/rh/EnhancedDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { usePositions, useDeletePosition } from '@/hooks/rh/usePositions';
import { Position } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function PositionsPage() {
  console.log('🔍 [DEBUG] PositionsPage renderizado');
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  
  console.log('🔍 [DEBUG] Permissões:', { canCreateEntity, canEditEntity, canDeleteEntity });
  console.log('🔍 [DEBUG] canCreateEntity("positions"):', canCreateEntity('positions'));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');


  // Hooks
  const { data: positions = [], isLoading } = usePositions();
  const deletePositionMutation = useDeletePosition();

  // Filtrar dados
  const filteredPositions = positions.filter(position => {
    const matchesSearch = !searchTerm || 
      position.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && position.is_active) ||
      (statusFilter === 'inactive' && !position.is_active);
    
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
    console.log('🔍 [DEBUG] handleCreate chamado');
    console.log('🔍 [DEBUG] Estado antes:', { isModalOpen, modalMode, selectedPosition });
    setSelectedPosition(null);
    setModalMode('create');
    setIsModalOpen(true);
    console.log('🔍 [DEBUG] Estado após:', { isModalOpen: true, modalMode: 'create', selectedPosition: null });
  };

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (position: Position) => {
    setSelectedPosition(position);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (position: Position) => {
    if (confirm(`Tem certeza que deseja excluir o cargo ${position.nome}?`)) {
      try {
        await deletePositionMutation.mutateAsync(position.id);
      } catch (error) {
        console.error('Erro ao excluir cargo:', error);
      }
    }
  };

  const handleExport = () => {
    console.log('Exportar cargos');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPosition(null);
  };

  const handleModalSubmit = (data: any) => {
    console.log('Salvar cargo:', data);
    handleModalClose();
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ row }: { row: { original: Position } }) => (
        <div>
          <div className="font-medium">{row.original.nome}</div>
          {row.original.descricao && (
            <div className="text-sm text-muted-foreground">
              {row.original.descricao}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'nivel_hierarquico',
      header: 'Nível',
      cell: ({ row }: { row: { original: Position } }) => (
        <Badge variant="outline">
          Nível {row.original.nivel_hierarquico}
        </Badge>
      ),
    },
    {
      accessorKey: 'carga_horaria',
      header: 'Carga Horária',
      cell: ({ row }: { row: { original: Position } }) => (
        <span className="text-sm">
          {row.original.carga_horaria}h/semana
        </span>
      ),
    },
    {
      accessorKey: 'salario_minimo',
      header: 'Faixa Salarial',
      cell: ({ row }: { row: { original: Position } }) => {
        const { salario_minimo, salario_maximo } = row.original;
        if (salario_minimo && salario_maximo) {
          return (
            <span className="text-sm font-mono">
              R$ {salario_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - 
              R$ {salario_maximo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          );
        } else if (salario_minimo) {
          return (
            <span className="text-sm font-mono">
              A partir de R$ {salario_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          );
        }
        return <span className="text-sm text-muted-foreground">Não definido</span>;
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }: { row: { original: Position } }) => {
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
      confirmationMessage: 'Tem certeza que deseja excluir este cargo? Esta ação não pode ser desfeita.',
    },
  ];

  return (
    <RequireEntity entityName="positions" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cargos</h1>
          <p className="text-muted-foreground">
            Gerencie os cargos e posições da empresa
          </p>
        </div>
        <Button onClick={() => {
          console.log('🔍 [DEBUG] Botão Novo Cargo clicado');
          handleCreate();
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
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
        data={filteredPositions}
        columns={columns}
        loading={isLoading}
        searchable={false} // Já temos busca customizada
        filterable={false} // Já temos filtros customizados
        pagination={true}
        actions={actions}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Buscar cargos..."
        emptyMessage="Nenhum cargo encontrado"
        pageSize={10}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === 'create' ? 'Novo Cargo' :
          modalMode === 'edit' ? 'Editar Cargo' :
          'Detalhes do Cargo'
        }
        description={
          modalMode === 'create' ? 'Preencha os dados do novo cargo' :
          modalMode === 'edit' ? 'Atualize os dados do cargo' :
          'Visualize os dados do cargo'
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
                    {selectedPosition?.nome}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Nível Hierárquico</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPosition?.nivel_hierarquico}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Carga Horária</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPosition?.carga_horaria}h/semana
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPosition?.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
              {selectedPosition?.descricao && (
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPosition.descricao}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input placeholder="Nome do cargo" />
                </div>
                <div>
                  <label className="text-sm font-medium">Nível Hierárquico</label>
                  <Input type="number" placeholder="1" min="1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Carga Horária</label>
                  <Input type="number" placeholder="40" min="1" max="60" />
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
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea 
                  className="w-full p-2 border rounded-md"
                  placeholder="Descrição do cargo"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Salário Mínimo</label>
                  <Input type="number" step="0.01" placeholder="0,00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Salário Máximo</label>
                  <Input type="number" step="0.01" placeholder="0,00" />
                </div>
              </div>
            </div>
          )}
        </div>
      </FormModal>
    </div>
    </RequireEntity>
  );
}
