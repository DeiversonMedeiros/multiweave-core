import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Calculator,
  Code,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useRubricas } from '@/hooks/rh/useRubricas';
import { useCreateRubrica, useUpdateRubrica, useDeleteRubrica } from '@/hooks/rh/useRubricas';
import { Rubrica } from '@/integrations/supabase/rh-types';
import { toast } from 'sonner';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface RubricaFilters {
  search: string;
  tipo: string;
  categoria: string;
  ativo: string;
}

interface FormulaSimulation {
  rubrica: Rubrica;
  baseSalary: number;
  result: number;
  isValid: boolean;
  errors: string[];
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function RubricasManagement() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('list');
  const [filters, setFilters] = useState<RubricaFilters>({
    search: '',
    tipo: 'all',
    categoria: 'all',
    ativo: 'all'
  });
  const [selectedRubrica, setSelectedRubrica] = useState<Rubrica | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulationData, setSimulationData] = useState<FormulaSimulation | null>(null);

  // Hooks
  const { rubricas, isLoading } = useRubricas(selectedCompany?.id || '');
  const createRubrica = useCreateRubrica();
  const updateRubrica = useUpdateRubrica();
  const deleteRubrica = useDeleteRubrica();

  // Filtrar rubricas
  const filteredRubricas = rubricas?.filter(rubrica => {
    const matchesSearch = rubrica.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
                         rubrica.codigo.toLowerCase().includes(filters.search.toLowerCase());
    const matchesTipo = filters.tipo === 'all' || rubrica.tipo === filters.tipo;
    const matchesCategoria = filters.categoria === 'all' || rubrica.categoria === filters.categoria;
    const matchesAtivo = filters.ativo === 'all' || (filters.ativo === 'true' ? rubrica.ativo : !rubrica.ativo);
    
    return matchesSearch && matchesTipo && matchesCategoria && matchesAtivo;
  }) || [];

  // Handlers
  const handleCreate = () => {
    setSelectedRubrica(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rubrica: Rubrica) => {
    setSelectedRubrica(rubrica);
    setIsModalOpen(true);
  };

  const handleDelete = async (rubrica: Rubrica) => {
    if (window.confirm(`Tem certeza que deseja excluir a rubrica "${rubrica.nome}"?`)) {
      try {
        await deleteRubrica.mutateAsync(rubrica.id);
        toast.success('Rubrica excluída com sucesso');
      } catch (error) {
        toast.error('Erro ao excluir rubrica');
      }
    }
  };

  const handleSimulate = (rubrica: Rubrica) => {
    setSelectedRubrica(rubrica);
    setIsSimulatorOpen(true);
  };

  const handleCopy = (rubrica: Rubrica) => {
    // TODO: Implementar cópia de rubrica
    toast.info('Funcionalidade de cópia será implementada em breve');
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      provento: 'Provento',
      desconto: 'Desconto',
      base_calculo: 'Base de Cálculo',
      informacao: 'Informação'
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const getTipoBadge = (tipo: string) => {
    const config = {
      provento: { variant: 'default' as const, label: 'Provento' },
      desconto: { variant: 'destructive' as const, label: 'Desconto' },
      base_calculo: { variant: 'secondary' as const, label: 'Base de Cálculo' },
      informacao: { variant: 'outline' as const, label: 'Informação' }
    };
    
    const tipoConfig = config[tipo as keyof typeof config] || config.informacao;
    return <Badge variant={tipoConfig.variant}>{tipoConfig.label}</Badge>;
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels = {
      salario: 'Salário',
      hora_extra: 'Hora Extra',
      beneficio: 'Benefício',
      imposto: 'Imposto',
      desconto: 'Desconto',
      adicional: 'Adicional'
    };
    return labels[categoria as keyof typeof labels] || categoria;
  };

  return (
    <RequirePage pagePath="/rh/rubricas*" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciador de Rubricas</h1>
          <p className="text-muted-foreground">
            Gerencie as rubricas de cálculo da folha de pagamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Rubrica
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar rubricas..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}>
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
              <Label>Categoria</Label>
              <Select value={filters.categoria} onValueChange={(value) => setFilters(prev => ({ ...prev, categoria: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="salario">Salário</SelectItem>
                  <SelectItem value="hora_extra">Hora Extra</SelectItem>
                  <SelectItem value="beneficio">Benefício</SelectItem>
                  <SelectItem value="imposto">Imposto</SelectItem>
                  <SelectItem value="desconto">Desconto</SelectItem>
                  <SelectItem value="adicional">Adicional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.ativo} onValueChange={(value) => setFilters(prev => ({ ...prev, ativo: value }))}>
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
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Rubricas</p>
                <p className="text-2xl font-bold">{rubricas?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold">{rubricas?.filter(r => r.ativo).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Proventos</p>
                <p className="text-2xl font-bold">{rubricas?.filter(r => r.tipo === 'provento').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Descontos</p>
                <p className="text-2xl font-bold">{rubricas?.filter(r => r.tipo === 'desconto').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Lista de Rubricas</TabsTrigger>
          <TabsTrigger value="formulas">Editor de Fórmulas</TabsTrigger>
          <TabsTrigger value="simulator">Simulador</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Rubricas</CardTitle>
                  <CardDescription>
                    {filteredRubricas.length} rubricas encontradas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor/Percentual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRubricas.map((rubrica) => (
                    <TableRow key={rubrica.id}>
                      <TableCell className="font-medium">{rubrica.codigo}</TableCell>
                      <TableCell>{rubrica.nome}</TableCell>
                      <TableCell>{getTipoBadge(rubrica.tipo)}</TableCell>
                      <TableCell>{getCategoriaLabel(rubrica.categoria || '')}</TableCell>
                      <TableCell>
                        {rubrica.valor_fixo ? (
                          <span>R$ {rubrica.valor_fixo.toFixed(2)}</span>
                        ) : rubrica.percentual ? (
                          <span>{(rubrica.percentual * 100).toFixed(2)}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rubrica.ativo ? 'default' : 'secondary'}>
                          {rubrica.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSimulate(rubrica)}
                            title="Simular"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rubrica)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(rubrica)}
                            title="Copiar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rubrica)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="formulas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Editor de Fórmulas</CardTitle>
              <CardDescription>
                Crie e edite fórmulas complexas para cálculos de rubricas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Editor de fórmulas será implementado em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulador de Cálculos</CardTitle>
              <CardDescription>
                Teste fórmulas e cálculos de rubricas com dados de exemplo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Simulador será implementado em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Rubricas</CardTitle>
              <CardDescription>
                Configure parâmetros globais para o sistema de rubricas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Configurações serão implementadas em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Simulação */}
      <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulador de Rubrica</DialogTitle>
            <DialogDescription>
              Teste a rubrica "{selectedRubrica?.nome}" com diferentes valores
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRubrica && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="base-salary">Salário Base (R$)</Label>
                  <Input
                    id="base-salary"
                    type="number"
                    placeholder="0.00"
                    onChange={(e) => {
                      const baseSalary = parseFloat(e.target.value) || 0;
                      // TODO: Implementar cálculo da simulação
                      setSimulationData({
                        rubrica: selectedRubrica,
                        baseSalary,
                        result: 0,
                        isValid: true,
                        errors: []
                      });
                    }}
                  />
                </div>
                
                {simulationData && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Resultado da Simulação</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Salário Base:</span>
                        <span>R$ {simulationData.baseSalary.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Calculado:</span>
                        <span>R$ {simulationData.result.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSimulatorOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePage>
  );
}
