import React, { useState } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompany } from '@/lib/company-context';
import { useFgtsConfigs, useDeleteFgtsConfig } from '@/hooks/rh/useFgtsConfig';
import { formatCurrency, formatPercent, formatDate } from '@/services/rh/fgtsConfigService';
import { FgtsConfig } from '@/integrations/supabase/rh-types';
import FgtsConfigForm from '@/components/rh/FgtsConfigForm';

export default function FgtsConfigPage() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    ano_vigencia: new Date().getFullYear(),
    mes_vigencia: new Date().getMonth() + 1,
    ativo: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<FgtsConfig | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: configsData, isLoading } = useFgtsConfigs(filters);
  const deleteConfigMutation = useDeleteFgtsConfig();

  // Dados
  const configs = configsData?.data || [];
  const totalCount = configsData?.count || 0;

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
    setSelectedConfig(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (config: FgtsConfig) => {
    setSelectedConfig(config);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (config: FgtsConfig) => {
    setSelectedConfig(config);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (config: FgtsConfig) => {
    if (confirm(`Tem certeza que deseja excluir a configuração FGTS "${config.descricao}"?`)) {
      try {
        await deleteConfigMutation.mutateAsync(config.id);
      } catch (error) {
        console.error('Erro ao excluir configuração FGTS:', error);
      }
    }
  };

  const handleExport = () => {
    // TODO: Implementar exportação
    console.log('Exportar configurações FGTS');
  };

  // Filtrar dados localmente
  const filteredConfigs = configs.filter(config =>
    config.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para visualizar as configurações FGTS</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações FGTS</h1>
          <p className="text-muted-foreground">
            Configure as alíquotas e percentuais do Fundo de Garantia do Tempo de Serviço
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
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
                  placeholder="Buscar por descrição..."
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
          <CardTitle>Configurações FGTS ({totalCount})</CardTitle>
          <CardDescription>
            Lista de configurações do Fundo de Garantia do Tempo de Serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando configurações FGTS...</p>
              </div>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma configuração FGTS encontrada</p>
              <Button variant="outline" className="mt-4" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira configuração
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Alíquota FGTS</TableHead>
                    <TableHead>Multa Rescisão</TableHead>
                    <TableHead>Teto Salário</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.codigo}</TableCell>
                      <TableCell>{config.descricao}</TableCell>
                      <TableCell>{formatPercent(config.aliquota_fgts)}</TableCell>
                      <TableCell>{formatPercent(config.multa_rescisao || 0)}</TableCell>
                      <TableCell>{formatCurrency(config.teto_salario || 0)}</TableCell>
                      <TableCell>
                        {config.mes_vigencia}/{config.ano_vigencia}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.ativo ? 'default' : 'secondary'}>
                          {config.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(config)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(config)}
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
        <FgtsConfigForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={modalMode}
          config={selectedConfig}
        />
      )}
    </div>
  );
}
