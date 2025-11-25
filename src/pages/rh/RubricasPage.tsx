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
  Calculator,
  Edit,
  Trash2,
  Eye,
  DollarSign
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { RubricaForm } from '@/components/rh/RubricaForm';
import { useRubricas, useCreateRubrica, useUpdateRubrica, useDeleteRubrica } from '@/hooks/rh/useRubricas';
import { Rubrica } from '@/integrations/supabase/rh-types';
import { getRubricaTypeColor, getRubricaNatureColor, formatCurrency, formatPercent } from '@/services/rh/rubricasService';
import { useCompany } from '@/lib/company-context';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function RubricasPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    tipo: 'all',
    categoria: 'all',
    natureza: 'all',
    ativo: 'all',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRubrica, setSelectedRubrica] = useState<Rubrica | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  console.log('🔍 [RubricasPage] Renderizando com:', { 
    companyId: selectedCompany?.id, 
    hasCompany: !!selectedCompany,
    companyName: selectedCompany?.nome_fantasia,
    filters 
  });
  
  const rubricasQuery = useRubricas(selectedCompany?.id || '', filters);
  
  console.log('🔍 [RubricasPage] Hook retornou:', {
    hasData: !!rubricasQuery.data,
    dataType: typeof rubricasQuery.data,
    isArray: Array.isArray(rubricasQuery.data),
    dataLength: rubricasQuery.data?.length || 0,
    isLoading: rubricasQuery.isLoading,
    isError: rubricasQuery.isError,
    error: rubricasQuery.error?.message,
    status: rubricasQuery.status,
    queryKey: rubricasQuery.dataUpdatedAt
  });
  
  const rubricas = rubricasQuery.data || [];
  const isLoading = rubricasQuery.isLoading;
  const error = rubricasQuery.error;
  const refetch = rubricasQuery.refetch;
  
  console.log('📊 [RubricasPage] Estado após processamento:', {
    rubricasLength: rubricas.length,
    firstRubrica: rubricas[0] ? { id: rubricas[0].id, codigo: rubricas[0].codigo, nome: rubricas[0].nome } : null,
    isLoading,
    hasError: !!error,
    error: error?.message
  });
  const createMutation = useCreateRubrica();
  const updateMutation = useUpdateRubrica();
  const deleteMutation = useDeleteRubrica();
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Filtrar dados por termo de busca
  const filteredRubricas = (rubricas || []).filter(rubrica =>
    rubrica.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rubrica.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rubrica.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rubrica.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Colunas da tabela
  const columns = [
    {
      key: 'codigo',
      label: 'Código',
      render: (rubrica: Rubrica) => (
        <div>
          <div className="font-mono font-medium">{rubrica.codigo}</div>
          <div className="text-sm text-muted-foreground">#{rubrica.ordem_exibicao}</div>
        </div>
      ),
    },
    {
      key: 'nome',
      label: 'Nome',
      render: (rubrica: Rubrica) => (
        <div>
          <div className="font-medium">{rubrica.nome}</div>
          {rubrica.descricao && (
            <div className="text-sm text-muted-foreground">{rubrica.descricao}</div>
          )}
        </div>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (rubrica: Rubrica) => (
        <Badge className={getRubricaTypeColor(rubrica.tipo)}>
          {rubrica.tipo}
        </Badge>
      ),
    },
    {
      key: 'natureza',
      label: 'Natureza',
      render: (rubrica: Rubrica) => (
        <Badge variant="outline" className={getRubricaNatureColor(rubrica.natureza)}>
          {rubrica.natureza}
        </Badge>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      render: (rubrica: Rubrica) => (
        <div className="text-sm">
          {rubrica.categoria || '-'}
        </div>
      ),
    },
    {
      key: 'valor',
      label: 'Valor/Percentual',
      render: (rubrica: Rubrica) => (
        <div className="text-sm">
          {rubrica.valor_fixo ? (
            <div className="font-medium">{formatCurrency(rubrica.valor_fixo)}</div>
          ) : rubrica.percentual ? (
            <div className="font-medium">{formatPercent(rubrica.percentual)}</div>
          ) : (
            <div className="text-muted-foreground">-</div>
          )}
        </div>
      ),
    },
    {
      key: 'incidencias',
      label: 'Incidências',
      render: (rubrica: Rubrica) => (
        <div className="flex gap-1 flex-wrap">
          {rubrica.incidencia_ir && <Badge variant="outline" className="text-xs">IR</Badge>}
          {rubrica.incidencia_inss && <Badge variant="outline" className="text-xs">INSS</Badge>}
          {rubrica.incidencia_fgts && <Badge variant="outline" className="text-xs">FGTS</Badge>}
          {rubrica.incidencia_contribuicao_sindical && <Badge variant="outline" className="text-xs">SIND</Badge>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (rubrica: Rubrica) => (
        <Badge variant={rubrica.ativo ? 'default' : 'secondary'}>
          {rubrica.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (rubrica: Rubrica) => (
        <TableActions
          onView={() => handleView(rubrica)}
          onEdit={() => handleEdit(rubrica)}
          onDelete={() => handleDelete(rubrica)}
        />
      ),
    },
  ];

  // Handlers
  const handleCreate = () => {
    setSelectedRubrica(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleView = (rubrica: Rubrica) => {
    setSelectedRubrica(rubrica);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (rubrica: Rubrica) => {
    setSelectedRubrica(rubrica);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (rubrica: Rubrica) => {
    if (confirm(`Tem certeza que deseja excluir a rubrica "${rubrica.nome}"?`)) {
      try {
        await deleteMutation(rubrica.id);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir rubrica:', error);
      }
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await createMutation({ ...data, company_id: selectedCompany?.id });
      } else if (modalMode === 'edit' && selectedRubrica) {
        await updateMutation({ id: selectedRubrica.id, ...data });
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar rubrica:', error);
    }
  };

  const handleExport = () => {
    // Implementar exportação CSV
    console.log('Exportar dados');
  };

  return (
    <RequireEntity entityName="rubricas" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rubricas</h1>
          <p className="text-muted-foreground">
            Configure as rubricas da folha de pagamento
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Rubrica
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
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
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters({ ...filters, tipo: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="provento">Provento</SelectItem>
                  <SelectItem value="desconto">Desconto</SelectItem>
                  <SelectItem value="base_calculo">Base de Cálculo</SelectItem>
                  <SelectItem value="informacao">Informação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Natureza</label>
              <Select value={filters.natureza} onValueChange={(value) => setFilters({ ...filters, natureza: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as naturezas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="eventual">Eventual</SelectItem>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
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
        data={filteredRubricas}
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
        title={modalMode === 'create' ? 'Nova Rubrica' : 
               modalMode === 'edit' ? 'Editar Rubrica' : 'Visualizar Rubrica'}
        mode={modalMode}
      >
        <RubricaForm
          rubrica={selectedRubrica}
          mode={modalMode}
          onSave={handleSave}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
    </RequireEntity>
  );
}
