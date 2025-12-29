// =====================================================
// RELATÓRIOS E AUDITORIA - COMBUSTÍVEL
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download,
  Calendar,
  Filter,
  Search,
  Car,
  Users,
  DollarSign
} from 'lucide-react';
import { RequireModule } from '@/components/RequireAuth';
import { 
  useRefuelRequests,
  useRefuelRecords,
  useBudgets
} from '@/hooks/combustivel/useCombustivel';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RelatoriosAuditoria() {
  const currentDate = new Date();
  const [dataInicio, setDataInicio] = useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tipoRelatorio, setTipoRelatorio] = useState<string>('consumo');
  const [filtros, setFiltros] = useState({
    veiculo_id: 'all',
    condutor_id: 'all',
    centro_custo_id: 'all',
    projeto_id: 'all',
    status: 'all',
  });

  const { data: vehicles } = useVehicles({ situacao: 'ativo' });
  const { data: costCenters } = useCostCenters();
  const { data: projects } = useProjects();

  // Buscar dados baseado no tipo de relatório
  const filters: any = {
    data_inicio: dataInicio,
    data_fim: dataFim,
  };
  if (filtros.veiculo_id !== 'all') filters.veiculo_id = filtros.veiculo_id;
  if (filtros.condutor_id !== 'all') filters.condutor_id = filtros.condutor_id;
  if (filtros.centro_custo_id !== 'all') filters.centro_custo_id = filtros.centro_custo_id;
  if (filtros.projeto_id !== 'all') filters.projeto_id = filtros.projeto_id;
  if (filtros.status !== 'all') filters.status = filtros.status;

  const { data: requests } = useRefuelRequests(filters);
  const { data: records } = useRefuelRecords(filters);
  const { data: budgets } = useBudgets({});

  const handleExport = (formato: 'csv' | 'pdf') => {
    // Implementar exportação
    console.log('Exportar', formato, tipoRelatorio, filters);
  };

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios e Auditoria</h1>
            <p className="text-gray-600">Relatórios detalhados e auditoria de combustível</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
                <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumo">Consumo</SelectItem>
                    <SelectItem value="solicitacoes">Solicitações</SelectItem>
                    <SelectItem value="abastecimentos">Abastecimentos</SelectItem>
                    <SelectItem value="orcamento">Orçamento</SelectItem>
                    <SelectItem value="auditoria">Auditoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Veículo</label>
                <Select 
                  value={filtros.veiculo_id} 
                  onValueChange={(v) => setFiltros({ ...filtros, veiculo_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {vehicles?.map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Centro de Custo</label>
                <Select 
                  value={filtros.centro_custo_id} 
                  onValueChange={(v) => setFiltros({ ...filtros, centro_custo_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {costCenters?.data?.map((cc: any) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Projeto</label>
                <Select 
                  value={filtros.projeto_id} 
                  onValueChange={(v) => setFiltros({ ...filtros, projeto_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {projects?.data?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select 
                  value={filtros.status} 
                  onValueChange={(v) => setFiltros({ ...filtros, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="reprovada">Reprovada</SelectItem>
                    <SelectItem value="recarregada">Recarregada</SelectItem>
                    <SelectItem value="registrado">Registrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relatório de Consumo */}
        {tipoRelatorio === 'consumo' && records && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Consumo</CardTitle>
              <CardDescription>
                Período: {format(new Date(dataInicio), "dd/MM/yyyy", { locale: ptBR })} até{' '}
                {format(new Date(dataFim), "dd/MM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {records.data && records.data.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-500">Total de Litros</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {records.data.reduce((sum, r) => sum + (r.litros || 0), 0).toFixed(2)} L
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-500">Total em R$</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            records.data.reduce((sum, r) => sum + (r.valor_total || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-500">Abastecimentos</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {records.data.length}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Data</th>
                            <th className="text-left p-2">Veículo</th>
                            <th className="text-left p-2">Condutor</th>
                            <th className="text-right p-2">Litros</th>
                            <th className="text-right p-2">Valor</th>
                            <th className="text-right p-2">Preço/L</th>
                            <th className="text-right p-2">Consumo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.data.map((record) => (
                            <tr key={record.id} className="border-b">
                              <td className="p-2">
                                {format(new Date(record.data_abastecimento), "dd/MM/yyyy", { locale: ptBR })}
                              </td>
                              <td className="p-2">{record.veiculo_placa || 'N/A'}</td>
                              <td className="p-2">{record.condutor_nome || 'N/A'}</td>
                              <td className="p-2 text-right">{record.litros.toFixed(2)} L</td>
                              <td className="p-2 text-right">{formatCurrency(record.valor_total)}</td>
                              <td className="p-2 text-right">
                                {record.preco_litro ? formatCurrency(record.preco_litro) : 'N/A'}
                              </td>
                              <td className="p-2 text-right">
                                {record.consumo_km_l ? `${record.consumo_km_l.toFixed(2)} km/L` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum registro encontrado para o período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Relatório de Solicitações */}
        {tipoRelatorio === 'solicitacoes' && requests && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Solicitações</CardTitle>
              <CardDescription>
                Período: {format(new Date(dataInicio), "dd/MM/yyyy", { locale: ptBR })} até{' '}
                {format(new Date(dataFim), "dd/MM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.data && requests.data.length > 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-500">Total de Solicitações</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {requests.data.length}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-500">Total Solicitado</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            requests.data.reduce((sum, r) => sum + (r.valor_solicitado || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-500">Pendentes</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {requests.data.filter(r => r.status === 'pendente').length}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-500">Aprovadas</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {requests.data.filter(r => r.status === 'aprovada').length}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Número</th>
                            <th className="text-left p-2">Data</th>
                            <th className="text-left p-2">Veículo</th>
                            <th className="text-left p-2">Condutor</th>
                            <th className="text-right p-2">Valor</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Centro de Custo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.data.map((request) => (
                            <tr key={request.id} className="border-b">
                              <td className="p-2">{request.numero_solicitacao}</td>
                              <td className="p-2">
                                {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </td>
                              <td className="p-2">{request.veiculo_placa || 'N/A'}</td>
                              <td className="p-2">{request.condutor_nome || 'N/A'}</td>
                              <td className="p-2 text-right">{formatCurrency(request.valor_solicitado)}</td>
                              <td className="p-2">
                                <Badge variant="outline">{request.status}</Badge>
                              </td>
                              <td className="p-2">{request.centro_custo_nome || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhuma solicitação encontrada para o período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Relatório de Orçamento */}
        {tipoRelatorio === 'orcamento' && budgets && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Orçamento</CardTitle>
              <CardDescription>Análise de orçamento vs. realizado</CardDescription>
            </CardHeader>
            <CardContent>
              {budgets.data && budgets.data.length > 0 ? (
                <div className="space-y-4">
                  {budgets.data.map((budget) => {
                    const percentual = budget.valor_orcado > 0
                      ? (budget.valor_consumido / budget.valor_orcado) * 100
                      : 0;
                    const saldo = budget.valor_orcado - budget.valor_consumido;

                    return (
                      <div key={budget.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">
                            {budget.centro_custo_nome || budget.projeto_nome || budget.condutor_nome || 'Geral'}
                          </p>
                          <Badge variant={saldo < 0 ? 'destructive' : 'secondary'}>
                            {percentual.toFixed(1)}% utilizado
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Orçado</p>
                            <p className="font-bold">{formatCurrency(budget.valor_orcado)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Consumido</p>
                            <p className="font-bold">{formatCurrency(budget.valor_consumido)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Saldo</p>
                            <p className={`font-bold ${
                              saldo < 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(saldo)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhum orçamento encontrado
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RequireModule>
  );
}

