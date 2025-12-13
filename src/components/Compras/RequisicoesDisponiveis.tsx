import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Loader2
} from 'lucide-react';
import { usePurchaseRequisitions } from '@/hooks/compras/useComprasData';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { useCompany } from '@/lib/company-context';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RequisicoesDisponiveisProps {
  onGerarCotacao: (requisicoesIds: string[]) => void;
}

export function RequisicoesDisponiveis({ onGerarCotacao }: RequisicoesDisponiveisProps) {
  const { selectedCompany } = useCompany();
  const { data: requisicoes = [], isLoading } = usePurchaseRequisitions();
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { users } = useUsers();
  
  const [selectedRequisicoes, setSelectedRequisicoes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo: 'all',
    centro_custo_id: 'all',
    projeto_id: 'all',
    data_inicio: '',
    data_fim: '',
    apenas_emergenciais: false,
    somente_pendentes: true,
    buscar_item: '',
  });

  // Mapear IDs para nomes
  const costCentersMap = useMemo(() => {
    const map = new Map<string, string>();
    const costCenters = costCentersData?.data || [];
    costCenters.forEach((cc: any) => {
      map.set(cc.id, cc.nome);
    });
    return map;
  }, [costCentersData]);

  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    const projects = projectsData?.data || [];
    projects.forEach((proj: any) => {
      map.set(proj.id, proj.nome);
    });
    return map;
  }, [projectsData]);

  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(user => {
      map.set(user.id, user.nome);
    });
    return map;
  }, [users]);

  // Filtrar requisições disponíveis (aprovadas e não em cotação)
  const requisicoesDisponiveis = useMemo(() => {
    return requisicoes.filter((req: any) => {
      const status = req.workflow_state || req.status;
      // Apenas requisições aprovadas que ainda não estão em cotação
      return status === 'aprovada' || status === 'em_cotacao';
    });
  }, [requisicoes]);

  // Aplicar filtros
  const filtered = useMemo(() => {
    let result = requisicoesDisponiveis;

    // Filtro de busca geral
    if (search) {
      result = result.filter((req: any) =>
        req.numero_requisicao?.toLowerCase().includes(search.toLowerCase()) ||
        usersMap.get(req.solicitante_id)?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtro de tipo
    if (filters.tipo && filters.tipo !== 'all') {
      result = result.filter((req: any) => req.tipo_requisicao === filters.tipo);
    }

    // Filtro de centro de custo
    if (filters.centro_custo_id && filters.centro_custo_id !== 'all') {
      result = result.filter((req: any) => req.centro_custo_id === filters.centro_custo_id);
    }

    // Filtro de projeto
    if (filters.projeto_id && filters.projeto_id !== 'all') {
      result = result.filter((req: any) => req.projeto_id === filters.projeto_id);
    }

    // Filtro de período
    if (filters.data_inicio) {
      result = result.filter((req: any) => {
        if (!req.data_solicitacao) return false;
        return new Date(req.data_solicitacao) >= new Date(filters.data_inicio);
      });
    }

    if (filters.data_fim) {
      result = result.filter((req: any) => {
        if (!req.data_solicitacao) return false;
        const reqDate = new Date(req.data_solicitacao);
        const filterDate = new Date(filters.data_fim);
        filterDate.setHours(23, 59, 59, 999);
        return reqDate <= filterDate;
      });
    }

    // Filtro apenas emergenciais
    if (filters.apenas_emergenciais) {
      result = result.filter((req: any) => 
        req.tipo_requisicao === 'emergencial' || req.prioridade === 'alta'
      );
    }

    // Filtro somente pendentes (já aplicado no requisicoesDisponiveis, mas manter para compatibilidade)
    if (filters.somente_pendentes) {
      result = result.filter((req: any) => {
        const status = req.workflow_state || req.status;
        return status === 'aprovada' || status === 'em_cotacao';
      });
    }

    return result;
  }, [requisicoesDisponiveis, search, filters, usersMap]);

  // Projetos filtrados por centro de custo
  const filteredProjects = useMemo(() => {
    const allProjects = projectsData?.data || [];
    if (!filters.centro_custo_id || filters.centro_custo_id === 'all') {
      return allProjects;
    }
    return allProjects.filter((proj: any) => 
      proj.cost_center_id?.toString() === filters.centro_custo_id?.toString()
    );
  }, [projectsData, filters.centro_custo_id]);

  const handleSelectRequisicao = (requisicaoId: string, checked: boolean) => {
    setSelectedRequisicoes(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(requisicaoId);
      } else {
        newSet.delete(requisicaoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequisicoes(new Set(filtered.map((r: any) => r.id)));
    } else {
      setSelectedRequisicoes(new Set());
    }
  };

  const handleGerarCotacao = () => {
    if (selectedRequisicoes.size > 0) {
      onGerarCotacao(Array.from(selectedRequisicoes));
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return <Badge variant="outline" className="text-red-600 bg-red-50">Alta</Badge>;
      case 'normal':
        return <Badge variant="outline" className="text-yellow-600 bg-yellow-50">Normal</Badge>;
      case 'baixa':
        return <Badge variant="outline" className="text-green-600 bg-green-50">Baixa</Badge>;
      default:
        return <Badge variant="outline">{prioridade || 'Normal'}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'emergencial':
        return <Badge variant="outline" className="text-orange-600 bg-orange-50">
          <Zap className="h-3 w-3 mr-1" />
          Emergencial
        </Badge>;
      case 'reposicao':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50">Reposição</Badge>;
      case 'compra_direta':
        return <Badge variant="outline" className="text-purple-600 bg-purple-50">Compra Direta</Badge>;
      default:
        return <Badge variant="outline">{tipo || '—'}</Badge>;
    }
  };

  const allSelected = filtered.length > 0 && selectedRequisicoes.size === filtered.length;
  const someSelected = selectedRequisicoes.size > 0 && selectedRequisicoes.size < filtered.length;

  return (
    <div className="space-y-4">
      {/* Header com botão Gerar Cotação */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar requisições..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button
            onClick={handleGerarCotacao}
            disabled={selectedRequisicoes.size === 0}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Gerar Cotação ({selectedRequisicoes.size})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Painel de Filtros */}
        {showFilters && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo da Requisição</Label>
                <Select
                  value={filters.tipo}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="reposicao">Reposição</SelectItem>
                    <SelectItem value="compra_direta">Compra Direta</SelectItem>
                    <SelectItem value="emergencial">Emergencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select
                  value={filters.centro_custo_id}
                  onValueChange={(value) => setFilters({ ...filters, centro_custo_id: value, projeto_id: 'all' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(costCentersData?.data || []).map((cc: any) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select
                  value={filters.projeto_id}
                  onValueChange={(value) => setFilters({ ...filters, projeto_id: value })}
                  disabled={!filters.centro_custo_id || filters.centro_custo_id === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filteredProjects.map((proj: any) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período - De</Label>
                <Input
                  type="date"
                  value={filters.data_inicio}
                  onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Período - Até</Label>
                <Input
                  type="date"
                  value={filters.data_fim}
                  onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apenas_emergenciais"
                  checked={filters.apenas_emergenciais}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, apenas_emergenciais: checked as boolean })
                  }
                />
                <Label htmlFor="apenas_emergenciais" className="text-sm font-normal cursor-pointer">
                  Apenas emergenciais
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="somente_pendentes"
                  checked={filters.somente_pendentes}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, somente_pendentes: checked as boolean })
                  }
                />
                <Label htmlFor="somente_pendentes" className="text-sm font-normal cursor-pointer">
                  Somente pendentes
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Buscar Item</Label>
                <Input
                  placeholder="Código ou descrição do item"
                  value={filters.buscar_item}
                  onChange={(e) => setFilters({ ...filters, buscar_item: e.target.value })}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilters({
                    tipo: 'all',
                    centro_custo_id: 'all',
                    projeto_id: 'all',
                    data_inicio: '',
                    data_fim: '',
                    apenas_emergenciais: false,
                    somente_pendentes: true,
                    buscar_item: '',
                  });
                }}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Grid de Requisições */}
        <Card className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando requisições...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma requisição disponível para cotação</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = someSelected;
                          }
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((requisicao: any) => {
                    const isSelected = selectedRequisicoes.has(requisicao.id);
                    return (
                      <TableRow
                        key={requisicao.id}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleSelectRequisicao(requisicao.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {requisicao.numero_requisicao || requisicao.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          {requisicao.data_solicitacao
                            ? new Date(requisicao.data_solicitacao).toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {getTipoBadge(requisicao.tipo_requisicao)}
                        </TableCell>
                        <TableCell>
                          {getPrioridadeBadge(requisicao.prioridade)}
                        </TableCell>
                        <TableCell>
                          {usersMap.get(requisicao.solicitante_id) || '—'}
                        </TableCell>
                        <TableCell>
                          {costCentersMap.get(requisicao.centro_custo_id) || '—'}
                        </TableCell>
                        <TableCell>
                          {projectsMap.get(requisicao.projeto_id) || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Aguardando cotação
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
