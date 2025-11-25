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
  Calendar,
  TrendingUp
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { InssBracketForm } from '@/components/rh/InssBracketForm';
import { useInssBrackets, useInssBracketMutations } from '@/hooks/rh/useInssBrackets';
import { InssBracket } from '@/integrations/supabase/rh-types';
import { formatCurrency, formatTaxRate, formatDate } from '@/services/rh/inssBracketsService';
import { useCompany } from '@/lib/company-context';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function InssBracketsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    ano_vigencia: 2024,
    mes_vigencia: 1,
    ativo: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<InssBracket | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  console.log('🔍 [InssBracketsPage] Renderizando com:', { 
    companyId: selectedCompany?.id, 
    hasCompany: !!selectedCompany,
    filters 
  });
  
  const bracketsQuery = useInssBrackets(selectedCompany?.id || '', filters);
  
  console.log('🔍 [InssBracketsPage] Hook retornou:', {
    hasBrackets: !!bracketsQuery.brackets,
    bracketsType: typeof bracketsQuery.brackets,
    isArray: Array.isArray(bracketsQuery.brackets),
    bracketsLength: bracketsQuery.brackets?.length || 0,
    isLoading: bracketsQuery.isLoading,
    isError: !!bracketsQuery.error,
    error: bracketsQuery.error
  });
  
  const brackets = bracketsQuery.brackets || [];
  const isLoading = bracketsQuery.isLoading;
  const error = bracketsQuery.error;
  const refetch = bracketsQuery.refetch;
  
  console.log('📊 [InssBracketsPage] Estado após processamento:', {
    bracketsLength: brackets.length,
    firstBracket: brackets[0] ? { id: brackets[0].id, codigo: brackets[0].codigo, descricao: brackets[0].descricao } : null,
    isLoading,
    hasError: !!error,
    error: error
  });
  const { createMutation, updateMutation, deleteMutation, isLoading: isMutating } = useInssBracketMutations(selectedCompany?.id || '');

  // Dados para exibição (sem filtro manual, o SimpleDataTable faz isso)
  const filteredBrackets = brackets;

  // Colunas da tabela
  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      render: (bracket: InssBracket) => (
        <div className="font-mono font-medium">{bracket.codigo}</div>
      ),
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (bracket: InssBracket) => (
        <div>
          <div className="font-medium">{bracket.descricao}</div>
          <div className="text-sm text-muted-foreground">
            {formatDate(bracket.ano_vigencia, bracket.mes_vigencia)}
          </div>
        </div>
      ),
    },
    {
      key: 'faixa_salarial',
      header: 'Faixa Salarial',
      render: (bracket: InssBracket) => (
        <div className="text-sm">
          <div className="font-medium">
            {formatCurrency(bracket.valor_minimo)}
            {bracket.valor_maximo ? ` - ${formatCurrency(bracket.valor_maximo)}` : '+'}
          </div>
        </div>
      ),
    },
    {
      key: 'aliquota',
      header: 'Alíquota',
      render: (bracket: InssBracket) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {formatTaxRate(bracket.aliquota)}
        </Badge>
      ),
    },
    {
      key: 'valor_deducao',
      header: 'Dedução',
      render: (bracket: InssBracket) => (
        <div className="text-sm">
          {bracket.valor_deducao > 0 ? (
            <span className="text-red-600">-{formatCurrency(bracket.valor_deducao)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'vigencia',
      header: 'Vigência',
      render: (bracket: InssBracket) => (
        <div className="text-sm">
          <div className="font-medium">{bracket.ano_vigencia}</div>
          <div className="text-muted-foreground">
            Mês {bracket.mes_vigencia}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (bracket: InssBracket) => (
        <Badge variant={bracket.ativo ? 'default' : 'secondary'}>
          {bracket.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (bracket: InssBracket) => (
        <TableActions
          onView={() => handleView(bracket)}
          onEdit={() => handleEdit(bracket)}
          onDelete={() => handleDelete(bracket)}
        />
      ),
    },
  ];

  // Handlers
  const handleCreate = () => {
    setSelectedBracket(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleView = (bracket: InssBracket) => {
    setSelectedBracket(bracket);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (bracket: InssBracket) => {
    setSelectedBracket(bracket);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (bracket: InssBracket) => {
    if (confirm(`Tem certeza que deseja excluir a faixa INSS "${bracket.descricao}"?`)) {
      try {
        await deleteMutation(bracket.id);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir faixa INSS:', error);
      }
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await createMutation({ ...data, company_id: selectedCompany?.id });
      } else if (modalMode === 'edit' && selectedBracket) {
        await updateMutation({ id: selectedBracket.id, ...data });
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar faixa INSS:', error);
    }
  };

  const handleExport = () => {
    // Implementar exportação CSV
    console.log('Exportar dados');
  };

  const handleLoadDefaults = async () => {
    if (confirm('Deseja carregar as faixas INSS padrão de 2024?')) {
      // Implementar carregamento das faixas padrão
      console.log('Carregar faixas padrão');
    }
  };

  return (
    <RequireEntity entityName="inss_brackets" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faixas INSS</h1>
          <p className="text-muted-foreground">
            Configure as faixas de contribuição do INSS para cálculo da folha
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleLoadDefaults}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Carregar Padrão 2024
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Faixa
          </Button>
        </div>
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
                  placeholder="Código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select 
                value={filters.ano_vigencia.toString()} 
                onValueChange={(value) => setFilters({ ...filters, ano_vigencia: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select 
                value={filters.mes_vigencia.toString()} 
                onValueChange={(value) => setFilters({ ...filters, mes_vigencia: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

             <div className="space-y-2">
               <label className="text-sm font-medium">Status</label>
               <Select 
                 value={filters.ativo || "all"} 
                 onValueChange={(value) => setFilters({ ...filters, ativo: value === "all" ? "" : value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Todos" />
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
        data={filteredBrackets}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Pesquisar faixas..."
        emptyMessage="Nenhuma faixa INSS encontrada"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Nova Faixa INSS' : 
               modalMode === 'edit' ? 'Editar Faixa INSS' : 'Visualizar Faixa INSS'}
        mode={modalMode}
      >
        <InssBracketForm
          bracket={selectedBracket}
          mode={modalMode}
          onSave={handleSave}
          isLoading={isMutating}
        />
      </FormModal>
    </div>
    </RequireEntity>
  );
}
