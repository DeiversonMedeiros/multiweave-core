import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequireModule } from '@/components/RequireAuth';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { useOrdensProducao } from '@/hooks/metalurgica/useOrdensProducao';
import { useOrdensServico } from '@/hooks/metalurgica/useOrdensServico';
import { useLotes } from '@/hooks/metalurgica/useLotes';
import { useMaquinas } from '@/hooks/metalurgica/useMaquinas';
import { useOEE, useMTBF, useMTTR } from '@/hooks/metalurgica/useIndicadores';
import { metalurgicaExportService } from '@/services/metalurgica/exportService';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useQuery } from '@tanstack/react-query';

const RelatoriosMetalurgicaPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [dataInicio, setDataInicio] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<string>('');

  const { data: opsData } = useOrdensProducao({
    start_date: dataInicio,
    end_date: dataFim,
  });
  const { data: osData } = useOrdensServico({
    start_date: dataInicio,
    end_date: dataFim,
  });
  const { data: lotesData } = useLotes({
    start_date: dataInicio,
    end_date: dataFim,
  });
  const { data: maquinasData } = useMaquinas();
  const { data: inspecoesData } = useQuery({
    queryKey: ['metalurgica', 'inspecoes', selectedCompany?.id, dataInicio, dataFim],
    queryFn: () => metalurgicaService.listInspecoes(selectedCompany?.id || '', {
      start_date: dataInicio,
      end_date: dataFim,
    }),
    enabled: !!selectedCompany?.id,
  });

  const ops = opsData?.data || [];
  const os = osData?.data || [];
  const lotes = lotesData?.data || [];
  const maquinas = maquinasData?.data || [];

  // Indicadores
  const { data: oee, isLoading: oeeLoading } = useOEE(
    maquinaSelecionada,
    dataInicio,
    dataFim
  );
  const { data: mtbf } = useMTBF(maquinaSelecionada, dataInicio, dataFim);
  const { data: mttr } = useMTTR(maquinaSelecionada, dataInicio, dataFim);

  // Calcular estatísticas
  const estatisticas = {
    totalOPs: ops.length,
    opsConcluidas: ops.filter((op) => op.status === 'concluida').length,
    opsEmProducao: ops.filter((op) => op.status === 'em_producao').length,
    totalLotes: lotes.length,
    lotesAprovados: lotes.filter((l) => l.status === 'aprovado').length,
    pesoTotalProduzido: lotes.reduce((acc, l) => acc + (l.peso_total_kg || 0), 0),
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <BarChart3 className="inline-block mr-3 h-8 w-8" />
            Relatórios e Indicadores
          </h1>
          <p className="text-gray-600">
            Análise de produção e indicadores de desempenho
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="text-sm font-medium mb-2 block">Máquina</label>
                <Select value={maquinaSelecionada} onValueChange={setMaquinaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as máquinas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as máquinas</SelectItem>
                    {maquinas.map((maq) => (
                      <SelectItem key={maq.id} value={maq.id}>
                        {maq.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    metalurgicaExportService.generateConsolidatedReport(
                      ops,
                      os,
                      lotes,
                      inspecoesData?.data || [],
                      { format: 'csv' }
                    );
                    toast.success('Exportação iniciada! Os arquivos serão baixados em sequência.');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ordens de Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estatisticas.totalOPs}</div>
              <p className="text-sm text-gray-600 mt-2">
                {estatisticas.opsConcluidas} concluídas • {estatisticas.opsEmProducao} em produção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Lotes Produzidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estatisticas.totalLotes}</div>
              <p className="text-sm text-gray-600 mt-2">
                {estatisticas.lotesAprovados} aprovados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Peso Total Produzido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {estatisticas.pesoTotalProduzido.toFixed(2)} kg
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Indicadores de Máquina */}
        {maquinaSelecionada && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">OEE</CardTitle>
              </CardHeader>
              <CardContent>
                {oeeLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : oee ? (
                  <>
                    <div className="text-3xl font-bold">
                      {(oee.oee * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <div>Disponibilidade: {(oee.disponibilidade * 100).toFixed(1)}%</div>
                      <div>Performance: {(oee.performance * 100).toFixed(1)}%</div>
                      <div>Qualidade: {(oee.qualidade * 100).toFixed(1)}%</div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Sem dados disponíveis</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">MTBF</CardTitle>
              </CardHeader>
              <CardContent>
                {mtbf ? (
                  <div className="text-3xl font-bold">{mtbf.toFixed(2)}h</div>
                ) : (
                  <p className="text-sm text-gray-500">Sem dados disponíveis</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">MTTR</CardTitle>
              </CardHeader>
              <CardContent>
                {mttr ? (
                  <div className="text-3xl font-bold">{mttr.toFixed(2)}h</div>
                ) : (
                  <p className="text-sm text-gray-500">Sem dados disponíveis</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RequireModule>
  );
};

export default RelatoriosMetalurgicaPage;

