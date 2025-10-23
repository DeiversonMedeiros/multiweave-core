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

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function PositionsPage() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const { selectedCompany } = useCompany();
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
      position.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || position.ativo === (statusFilter === 'ativo');
    
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreate = () => {
    setSelectedPosition(null);
    setModalMode('create');
    setIsModalOpen(true);
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
    if (window.confirm(`Tem certeza que deseja excluir o cargo ${position.nome}?`)) {
      try {
        await deletePositionMutation.mutateAsync(position.id);
      } catch (error) {
        console.error('Erro ao excluir cargo:', error);
      }
    }
  };

  const handleExport = () => {
    // Implementar exportação
    console.log('Exportar cargos');
  };

  // Colunas da tabela
  const columns = [
    {
      header: 'Nome do Cargo',
      accessor: 'nome',
      cell: (position: Position) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Building className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{position.nome}</div>
            <div className="text-sm text-gray-500">{position.descricao}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Departamento',
      accessor: 'departamento',
      cell: (position: Position) => (
        <Badge variant="outline" className="text-xs">
          {position.departamento || 'Não definido'}
        </Badge>
      ),
    },
    {
      header: 'Nível',
      accessor: 'nivel',
      cell: (position: Position) => (
        <div className="text-sm text-gray-900">
          {position.nivel || 'Não definido'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'ativo',
      cell: (position: Position) => (
        <Badge variant={position.ativo ? 'default' : 'secondary'}>
          {position.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      accessor: 'actions',
      cell: (position: Position) => (
        <TableActions
          onView={() => handleView(position)}
          onEdit={() => handleEdit(position)}
          onDelete={() => handleDelete(position)}
          canView={true}
          canEdit={canEditModule('positions')}
          canDelete={canDeleteModule('positions')}
        />
      ),
    },
  ];

  return (
    <RequireModule moduleName="rh" action="read">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cargos</h1>
            <p className="text-muted-foreground">
              Gerencie os cargos e posições da empresa
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionButton module="positions" action="create">
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cargo
              </Button>
            </PermissionButton>
            <PermissionButton module="positions" action="read">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </PermissionButton>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar cargos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        <EnhancedDataTable
          data={filteredPositions}
          columns={columns}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
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
          mode={modalMode}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Cargo
              </label>
              <Input
                value={selectedPosition?.nome || ''}
                onChange={(e) => setSelectedPosition(prev => 
                  prev ? { ...prev, nome: e.target.value } : null
                )}
                placeholder="Digite o nome do cargo"
                disabled={modalMode === 'view'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <Input
                value={selectedPosition?.descricao || ''}
                onChange={(e) => setSelectedPosition(prev => 
                  prev ? { ...prev, descricao: e.target.value } : null
                )}
                placeholder="Digite a descrição do cargo"
                disabled={modalMode === 'view'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <Input
                value={selectedPosition?.departamento || ''}
                onChange={(e) => setSelectedPosition(prev => 
                  prev ? { ...prev, departamento: e.target.value } : null
                )}
                placeholder="Digite o departamento"
                disabled={modalMode === 'view'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível
              </label>
              <Input
                value={selectedPosition?.nivel || ''}
                onChange={(e) => setSelectedPosition(prev => 
                  prev ? { ...prev, nivel: e.target.value } : null
                )}
                placeholder="Digite o nível do cargo"
                disabled={modalMode === 'view'}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ativo"
                checked={selectedPosition?.ativo || false}
                onChange={(e) => setSelectedPosition(prev => 
                  prev ? { ...prev, ativo: e.target.checked } : null
                )}
                disabled={modalMode === 'view'}
                className="rounded border-gray-300"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                Cargo ativo
              </label>
            </div>
            {modalMode !== 'view' && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={() => {
                  // Implementar salvamento
                  console.log('Salvar cargo:', selectedPosition);
                  setIsModalOpen(false);
                }}>
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </FormModal>
      </div>
    </RequireModule>
  );
}
