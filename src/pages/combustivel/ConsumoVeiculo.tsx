// =====================================================
// CONSUMO POR VEÍCULO
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Calendar
} from 'lucide-react';
import { RequireModule } from '@/components/RequireAuth';
import { useVehicleConsumption, useRefuelRecords } from '@/hooks/combustivel/useCombustivel';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ConsumoVeiculo() {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [ano, setAno] = useState(currentDate.getFullYear());
  const [veiculoId, setVeiculoId] = useState<string>('all');

  const { data: vehicles } = useVehicles({ situacao: 'ativo' });
  const { data: consumption } = useVehicleConsumption({
    veiculo_id: veiculoId !== 'all' ? veiculoId : undefined,
    mes,
    ano
  });

  const { data: records } = useRefuelRecords({
    veiculo_id: veiculoId !== 'all' ? veiculoId : undefined,
    status: 'registrado'
  });

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consumo por Veículo</h1>
            <p className="text-gray-600">Análise detalhada de consumo por veículo</p>
          </div>
          <div className="flex gap-2">
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Veículos</SelectItem>
                {vehicles?.map((vehicle: any) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.placa} - {vehicle.modelo || 'N/A'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo do Consumo */}
        {consumption?.data && consumption.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {consumption.data.map((item) => {
              const veiculo = vehicles?.find((v: any) => v.id === item.veiculo_id);
              const desvioPercentual = item.consumo_esperado && item.consumo_medio
                ? ((item.consumo_medio - item.consumo_esperado) / item.consumo_esperado) * 100
                : 0;

              return (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {veiculo?.placa || 'N/A'}
                    </CardTitle>
                    <CardDescription>
                      {new Date(2000, item.mes - 1).toLocaleString('pt-BR', { month: 'long' })}/{item.ano}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Consumido</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {item.total_litros.toFixed(2)} L
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.total_valor)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">KM Rodados</p>
                      <p className="text-xl font-bold">
                        {item.km_rodados.toLocaleString('pt-BR')} km
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Consumo Médio</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">
                          {item.consumo_medio ? item.consumo_medio.toFixed(2) : 'N/A'} km/L
                        </p>
                        {item.consumo_esperado && (
                          <Badge variant={
                            desvioPercentual > 10 ? 'destructive' :
                            desvioPercentual > 5 ? 'default' : 'secondary'
                          }>
                            {desvioPercentual > 0 ? '+' : ''}{desvioPercentual.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      {item.consumo_esperado && (
                        <p className="text-xs text-gray-500">
                          Esperado: {item.consumo_esperado.toFixed(2)} km/L
                        </p>
                      )}
                    </div>
                    {desvioPercentual > 10 && (
                      <div className="p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-xs text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Consumo acima do esperado
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Histórico de Abastecimentos */}
        {records && records.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Abastecimentos</CardTitle>
              <CardDescription>
                Registros de abastecimento do período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {records.data.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium">
                            {format(new Date(record.data_abastecimento), "dd/MM/yyyy", { locale: ptBR })}
                            {record.hora_abastecimento && ` às ${record.hora_abastecimento}`}
                          </p>
                          {record.posto_nome && (
                            <Badge variant="outline">
                              {record.posto_nome}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Litros</p>
                            <p className="font-medium">{record.litros.toFixed(2)} L</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Valor</p>
                            <p className="font-bold text-green-600">
                              {formatCurrency(record.valor_total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Preço/Litro</p>
                            <p className="font-medium">
                              {record.preco_litro ? formatCurrency(record.preco_litro) : 'N/A'}
                            </p>
                          </div>
                          {record.consumo_km_l && (
                            <div>
                              <p className="text-gray-500">Consumo</p>
                              <p className="font-medium">{record.consumo_km_l.toFixed(2)} km/L</p>
                            </div>
                          )}
                        </div>
                        {record.km_rodado && (
                          <div className="mt-2 text-sm text-gray-500">
                            KM: {record.km_anterior?.toLocaleString('pt-BR')} → {record.km_atual.toLocaleString('pt-BR')} 
                            ({record.km_rodado.toLocaleString('pt-BR')} km rodados)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(!consumption?.data || consumption.data.length === 0) && (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              Nenhum consumo registrado para o período selecionado
            </CardContent>
          </Card>
        )}
      </div>
    </RequireModule>
  );
}

