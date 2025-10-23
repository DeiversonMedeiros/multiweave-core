import React, { useState } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompany } from '@/lib/company-context';
import { useIrrfBrackets, useDeleteIrrfBracket } from '@/hooks/rh/useIrrfBrackets';
import { formatCurrency, formatTaxRate, formatDate } from '@/services/rh/irrfBracketsService';
import { IrrfBracket } from '@/integrations/supabase/rh-types';
import IrrfBracketForm from '@/components/rh/IrrfBracketForm';
import { usePermissions } from '@/hooks/usePermissions';

export default function IrrfBracketsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    ano_vigencia: new Date().getFullYear(),
    mes_vigencia: new Date().getMonth() + 1,
    ativo: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<IrrfBracket | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: bracketsData, isLoading } = useIrrfBrackets(filters);
  const deleteBracketMutation = useDeleteIrrfBracket();

  // Dados
  const brackets = bracketsData?.data || [];
  const totalCount = bracketsData?.count || 0;

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value 
    }));
  };

  const handleCreate = () => {
    setSelectedBracket(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (bracket: IrrfBracket) => {
    setSelectedBracket(bracket);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (bracket: IrrfBracket) => {
    setSelectedBracket(bracket);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (bracket: IrrfBracket) => {
    if (confirm(`Tem certeza que deseja excluir a faixa IRRF ${bracket.codigo}?`)) {
      try {
        await deleteBracketMutation.mutateAsync(bracket.id);
      } catch (error) {
        console.error('Erro ao excluir faixa IRRF:', error);
      }
    }
  };

  const handleExport = () => {
    // TODO: Implementar exportação
    console.log('Exportar faixas IRRF');
  };

  // Filtrar dados localmente
  const filteredBrackets = brackets.filter(bracket =>
    bracket.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bracket.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedCompany) {
    return (

    <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para visualizar as faixas IRRF</p>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faixas IRRF</h1>
          <p className="text-muted-foreground">
            Configure as faixas de Imposto de Renda Retido na Fonte
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
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
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano de Vigência</label>
              <Select 
                value={filters.ano_vigencia.toString()} 
                onValueChange={(value) => handleFilterChange('ano_vigencia', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mês de Vigência</label>
              <Select 
                value={filters.mes_vigencia.toString()} 
                onValueChange={(value) => handleFilterChange('mes_vigencia', parseInt(value))}
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
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Faixas IRRF ({totalCount})</CardTitle>
          <CardDescription>
            Lista de faixas de Imposto de Renda Retido na Fonte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando faixas IRRF...</p>
              </div>
            </div>
          ) : filteredBrackets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma faixa IRRF encontrada</p>
              <Button variant="outline" className="mt-4" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira faixa
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor Mínimo</TableHead>
                    <TableHead>Valor Máximo</TableHead>
                    <TableHead>Alíquota</TableHead>
                    <TableHead>Dedução</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrackets.map((bracket) => (
                    <TableRow key={bracket.id}>
                      <TableCell className="font-medium">{bracket.codigo}</TableCell>
                      <TableCell>{bracket.descricao}</TableCell>
                      <TableCell>{formatCurrency(bracket.valor_minimo)}</TableCell>
                      <TableCell>{formatCurrency(bracket.valor_maximo)}</TableCell>
                      <TableCell>{formatTaxRate(bracket.aliquota)}</TableCell>
                      <TableCell>{formatCurrency(bracket.valor_deducao)}</TableCell>
                      <TableCell>
                        {bracket.mes_vigencia}/{bracket.ano_vigencia}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bracket.ativo ? 'default' : 'secondary'}>
                          {bracket.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(bracket)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(bracket)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(bracket)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <IrrfBracketForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={modalMode}
          bracket={selectedBracket}
        />
      )}
    </div>
    );
}
