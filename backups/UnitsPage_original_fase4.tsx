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

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function UnitsPage() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
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
      unit.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || unit.ativo === (statusFilter === 'ativo');
    
    return matchesSearch && matchesStatus;
  });

  // Handlers
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
    if (window.confirm(`Tem certeza que deseja excluir a unidade ${unit.nome}?`)) {
      try {
        await deleteUnitMutation.mutateAsync(unit.id);
      } catch (error) {
        console.error('Erro ao excluir unidade:', error);
      }
    }
  };

  const handleExport = () => {
    // Implementar exportação
    console.log('Exportar unidades');
  };

  // Colunas da tabela
  const columns = [
    {
      header: 'Nome da Unidade',
      accessor: 'nome',
      cell: (unit: Unit) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{unit.nome}</div>
            <div className="text-sm text-gray-500">{unit.descricao}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Responsável',
      accessor: 'responsavel',
      cell: (unit: Unit) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">
            {unit.responsavel || 'Não definido'}
          </span>
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      cell: (unit: Unit) => (
        <Badge variant="outline" className="text-xs">
          {unit.tipo || 'Não definido'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: 'ativo',
      cell: (unit: Unit) => (
        <Badge variant={unit.ativo ? 'default' : 'secondary'}>
          {unit.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      accessor: 'actions',
      cell: (unit: Unit) => (
        <TableActions
          onView={() => handleView(unit)}
          onEdit={() => handleEdit(unit)}
          onDelete={() => handleDelete(unit)}
          canView={true}
          canEdit={canEditModule('units')}
          canDelete={canDeleteModule('units')}
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
            <h1 className="text-3xl font-bold">Unidades</h1>
            <p className="text-muted-foreground">
              Gerencie as unidades organizacionais da empresa
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionButton module="units" action="create">
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </PermissionButton>
            <PermissionButton module="units" action="read">
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
                placeholder="Buscar unidades..."
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
          data={filteredUnits}
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
            modalMode === 'create' ? 'Nova Unidade' :
            modalMode === 'edit' ? 'Editar Unidade' :
            'Visualizar Unidade'
          }
          mode={modalMode}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Unidade
              </label>
              <Input
                value={selectedUnit?.nome || ''}
                onChange={(e) => setSelectedUnit(prev => 
                  prev ? { ...prev, nome: e.target.value } : null
                )}
                placeholder="Digite o nome da unidade"
                disabled={modalMode === 'view'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <Input
                value={selectedUnit?.descricao || ''}
                onChange={(e) => setSelectedUnit(prev => 
                  prev ? { ...prev, descricao: e.target.value } : null
                )}
                placeholder="Digite a descrição da unidade"
                disabled={modalMode === 'view'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável
              </label>
              <Input
                value={selectedUnit?.responsavel || ''}
                onChange={(e) => setSelectedUnit(prev => 
                  prev ? { ...prev, responsavel: e.target.value } : null
                )}
                placeholder="Digite o nome do responsável"
                disabled={modalMode === 'view'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <Input
                value={selectedUnit?.tipo || ''}
                onChange={(e) => setSelectedUnit(prev => 
                  prev ? { ...prev, tipo: e.target.value } : null
                )}
                placeholder="Digite o tipo da unidade"
                disabled={modalMode === 'view'}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ativo"
                checked={selectedUnit?.ativo || false}
                onChange={(e) => setSelectedUnit(prev => 
                  prev ? { ...prev, ativo: e.target.checked } : null
                )}
                disabled={modalMode === 'view'}
                className="rounded border-gray-300"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                Unidade ativa
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
                  console.log('Salvar unidade:', selectedUnit);
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
