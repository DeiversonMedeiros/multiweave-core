import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Download, 
  Filter,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  DollarSign,
  PieChart,
  FileText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRelatoriosEstoque } from '@/hooks/almoxarifado/useRelatoriosEstoqueQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { toast } from 'sonner';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const RelatoriosPage: React.FC = () => {
  const [selectedRelatorio, setSelectedRelatorio] = useState<string>('movimentacoes');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [almoxarifadoId, setAlmoxarifadoId] = useState<string>('todos');
  const [diasAntecedencia, setDiasAntecedencia] = useState<number>(30);
  const [relatorioData, setRelatorioData] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);

  // Hooks para dados
  const { 
    loading, 
    error, 
    gerarRelatorioMovimentacoes,
    gerarRelatorioABC,
    gerarRelatorioValidade,
    gerarKPIsEstoque,
    exportarRelatorio
  } = useRelatoriosEstoque();

  const { data: almoxarifadosData } = useAlmoxarifados();
  const almoxarifados = almoxarifadosData || [];

  // Definir datas padrão (último mês)
  useEffect(() => {
    const hoje = new Date();
    const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    
    setDataInicio(mesPassado.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
  }, []);

  // Carregar KPIs ao montar o componente
  useEffect(() => {
    const carregarKPIs = async () => {
      try {
        const kpisData = await gerarKPIsEstoque();
        setKpis(kpisData);
      } catch (error) {
        console.error('Erro ao carregar KPIs:', error);
      }
    };

    carregarKPIs();
  }, [gerarKPIsEstoque]);

  const handleGerarRelatorio = async () => {
    try {
      let dados;
      
      switch (selectedRelatorio) {
        case 'movimentacoes':
          dados = await gerarRelatorioMovimentacoes({
            data_inicio: dataInicio,
            data_fim: dataFim,
            almoxarifado_id: almoxarifadoId !== 'todos' ? almoxarifadoId : undefined
          });
          break;
        case 'abc':
          dados = await gerarRelatorioABC(
            almoxarifadoId !== 'todos' ? almoxarifadoId : undefined
          );
          break;
        case 'validade':
          dados = await gerarRelatorioValidade(diasAntecedencia);
          break;
        default:
          throw new Error('Tipo de relatório não suportado');
      }

      setRelatorioData(dados);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
      console.error(error);
    }
  };

  const handleExportar = async (formato: 'excel' | 'csv' | 'pdf') => {
    if (!relatorioData) {
      toast.error('Nenhum relatório para exportar');
      return;
    }

    try {
      await exportarRelatorio(relatorioData, formato);
      toast.success(`Relatório exportado em formato ${formato.toUpperCase()}`);
    } catch (error) {
      toast.error('Erro ao exportar relatório');
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      vencido: { color: 'bg-red-100 text-red-800', text: 'Vencido' },
      vencendo: { color: 'bg-yellow-100 text-yellow-800', text: 'Vencendo' },
      ok: { color: 'bg-green-100 text-green-800', text: 'OK' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ok;

    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const getClassificacaoBadge = (classificacao: string) => {
    const classConfig = {
      A: { color: 'bg-red-100 text-red-800', text: 'A' },
      B: { color: 'bg-yellow-100 text-yellow-800', text: 'B' },
      C: { color: 'bg-green-100 text-green-800', text: 'C' }
    };

    const config = classConfig[classificacao as keyof typeof classConfig] || classConfig.C;

    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  return (
    <RequireEntity entityName="warehouse_reports" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <BarChart3 className="inline-block mr-3 h-8 w-8" />
              Relatórios de Estoque
            </h1>
            <p className="text-gray-600">
              Relatórios avançados e análises de estoque
            </p>
          </div>
        </div>

        {/* KPIs Resumo */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Valor Total Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.valor_total_estoque)}</div>
                <p className="text-xs text-gray-500">{kpis.total_materiais} materiais</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Itens em Ruptura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.itens_ruptura}</div>
                <p className="text-xs text-gray-500">Necessitam reposição</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Alertas Validade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.alertas_validade}</div>
                <p className="text-xs text-gray-500">Próximos do vencimento</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Movimentações Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.movimentacoes_mes}</div>
                <p className="text-xs text-gray-500">Este mês</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
                <Select value={selectedRelatorio} onValueChange={setSelectedRelatorio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movimentacoes">Movimentações</SelectItem>
                    <SelectItem value="abc">Análise ABC</SelectItem>
                    <SelectItem value="validade">Validade de Materiais</SelectItem>
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
                <label className="text-sm font-medium mb-2 block">Almoxarifado</label>
                <Select value={almoxarifadoId} onValueChange={setAlmoxarifadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Almoxarifados</SelectItem>
                    {almoxarifados.map(almoxarifado => (
                      <SelectItem key={almoxarifado.id} value={almoxarifado.id}>
                        {almoxarifado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedRelatorio === 'validade' && (
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Dias de Antecedência</label>
                <Input
                  type="number"
                  value={diasAntecedencia}
                  onChange={(e) => setDiasAntecedencia(Number(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div className="mt-4 flex space-x-2">
              <Button onClick={handleGerarRelatorio} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>

              {relatorioData && (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => handleExportar('excel')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleExportar('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => handleExportar('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Movimentações */}
      {relatorioData && selectedRelatorio === 'movimentacoes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Relatório de Movimentações
            </CardTitle>
            <CardDescription>
              Período: {relatorioData.periodo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold text-green-600">Entradas</h3>
                <p className="text-2xl font-bold">{formatNumber(relatorioData.entradas.quantidade)}</p>
                <p className="text-sm text-gray-600">{formatCurrency(relatorioData.entradas.valor)}</p>
                <p className="text-xs text-gray-500">{relatorioData.entradas.materiais} materiais</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <h3 className="font-semibold text-red-600">Saídas</h3>
                <p className="text-2xl font-bold">{formatNumber(relatorioData.saidas.quantidade)}</p>
                <p className="text-sm text-gray-600">{formatCurrency(relatorioData.saidas.valor)}</p>
                <p className="text-xs text-gray-500">{relatorioData.saidas.materiais} materiais</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold text-blue-600">Transferências</h3>
                <p className="text-2xl font-bold">{formatNumber(relatorioData.transferencias.quantidade)}</p>
                <p className="text-xs text-gray-500">{relatorioData.transferencias.materiais} materiais</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-semibold text-orange-600">Ajustes</h3>
                <p className="text-2xl font-bold">{formatNumber(relatorioData.ajustes.quantidade)}</p>
                <p className="text-sm text-gray-600">{formatCurrency(relatorioData.ajustes.valor)}</p>
                <p className="text-xs text-gray-500">{relatorioData.ajustes.materiais} materiais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório ABC */}
      {relatorioData && selectedRelatorio === 'abc' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Análise ABC
            </CardTitle>
            <CardDescription>
              Classificação de materiais por valor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatorioData.slice(0, 20).map((item: any, index: number) => (
                <div key={item.material_id} className="flex justify-between items-center p-2 border rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <span className="font-medium">{item.descricao}</span>
                      <br />
                      <span className="text-sm text-gray-600">{item.codigo_interno}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.valor_total)}</div>
                      <div className="text-sm text-gray-600">{item.percentual_valor.toFixed(1)}%</div>
                    </div>
                    {getClassificacaoBadge(item.classificacao)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Validade */}
      {relatorioData && selectedRelatorio === 'validade' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Relatório de Validade
            </CardTitle>
            <CardDescription>
              Materiais próximos do vencimento (próximos {diasAntecedencia} dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatorioData.map((item: any) => (
                <div key={item.material_id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{item.descricao}</span>
                    <br />
                    <span className="text-sm text-gray-600">{item.codigo_interno}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.valor_total)}</div>
                      <div className="text-sm text-gray-600">
                        {item.dias_vencimento !== undefined 
                          ? `${item.dias_vencimento} dias` 
                          : 'Sem data definida'
                        }
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </RequireEntity>
  );
};

export default RelatoriosPage;
