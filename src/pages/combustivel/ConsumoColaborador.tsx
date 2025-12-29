// =====================================================
// CONSUMO POR COLABORADOR
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Car,
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { RequireModule } from '@/components/RequireAuth';
import { useDriverConsumption, useRefuelRecords } from '@/hooks/combustivel/useCombustivel';
import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ConsumoColaborador() {
  const { selectedCompany } = useCompany();
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [ano, setAno] = useState(currentDate.getFullYear());
  const [condutorId, setCondutorId] = useState<string>('all');

  // Hook para buscar profiles (condutores)
  const { data: profiles } = useQuery({
    queryKey: ['profiles', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return { data: [], totalCount: 0 };
      return EntityService.list({
        schema: 'public',
        table: 'profiles',
        companyId: selectedCompany.id,
        page: 1,
        pageSize: 1000
      });
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });

  const { data: consumption } = useDriverConsumption({
    condutor_id: condutorId !== 'all' ? condutorId : undefined,
    mes,
    ano
  });

  const { data: records } = useRefuelRecords({
    condutor_id: condutorId !== 'all' ? condutorId : undefined,
    status: 'registrado'
  });

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consumo por Colaborador</h1>
            <p className="text-gray-600">Análise detalhada de consumo por colaborador</p>
          </div>
          <div className="flex gap-2">
            <Select value={condutorId} onValueChange={setCondutorId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Colaboradores</SelectItem>
                {profiles?.data?.map((profile: any) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email || 'N/A'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {consumption.data.map((item) => {
              const condutor = profiles?.data?.find((p: any) => p.id === item.condutor_id);

              return (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {condutor?.full_name || condutor?.email || 'N/A'}
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
                      <p className="text-sm text-gray-500">Abastecimentos</p>
                      <p className="text-xl font-bold">
                        {item.quantidade_abastecimentos}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Veículos Utilizados</p>
                      <p className="text-sm font-medium">
                        {item.veiculos_utilizados.length} veículo(s)
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">Média por Abastecimento</p>
                      <p className="font-medium">
                        {formatCurrency(item.total_valor / item.quantidade_abastecimentos)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Histórico de Solicitações e Abastecimentos */}
        {records && records.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Solicitações e Abastecimentos</CardTitle>
              <CardDescription>
                Registros do período selecionado
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
                          {record.veiculo_placa && (
                            <Badge variant="outline">
                              <Car className="w-3 h-3 mr-1" />
                              {record.veiculo_placa}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
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
                        </div>
                        {record.observacoes && (
                          <div className="mt-2 text-sm text-gray-500">
                            {record.observacoes}
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

