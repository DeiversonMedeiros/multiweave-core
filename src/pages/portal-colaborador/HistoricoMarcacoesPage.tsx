import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3,
  Clock4,
  Coffee,
  ArrowUpDown
} from 'lucide-react';
import { RequireEntity } from '@/components/RequireAuth';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeRecordStatus = 'pendente' | 'aprovado' | 'rejeitado';

interface TimeRecord {
  id: string;
  employee_id: string;
  data_registro: string;
  entrada?: string;
  saida?: string;
  entrada_almoco?: string;
  saida_almoco?: string;
  entrada_extra1?: string;
  saida_extra1?: string;
  status: TimeRecordStatus;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export default function HistoricoMarcacoesPage() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'all' as string
  });

  // Buscar dados do funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar histórico de marcações usando EntityService
  const { data: timeRecords, isLoading, error } = useQuery({
    queryKey: ['rh', 'time-records', selectedCompany?.id, employee?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id || !employee?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'time_records',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id,
          ...(filters.status !== 'all' && { status: filters.status })
        },
        orderBy: 'data_registro',
        orderDirection: 'DESC'
      });

      if (result.error) {
        console.error('Erro ao buscar registros de ponto:', result.error);
        throw result.error;
      }

      let filteredData = result.data || [];
      
      // Aplicar filtros de data no lado do cliente
      if (filters.startDate) {
        filteredData = filteredData.filter(record => 
          record.data_registro >= filters.startDate
        );
      }
      
      if (filters.endDate) {
        filteredData = filteredData.filter(record => 
          record.data_registro <= filters.endDate
        );
      }

      return filteredData;
    },
    enabled: !!selectedCompany?.id && !!employee?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const getStatusIcon = (status: TimeRecordStatus) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: TimeRecordStatus) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: TimeRecordStatus) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  const calculateTotalHours = (record: TimeRecord) => {
    if (!record.entrada || !record.saida) return '--:--';
    
    const entrada = new Date(`2000-01-01T${record.entrada}`);
    const saida = new Date(`2000-01-01T${record.saida}`);
    
    // Subtrair tempo de almoço se existir
    let almocoTime = 0;
    if (record.entrada_almoco && record.saida_almoco) {
      const entradaAlmoco = new Date(`2000-01-01T${record.entrada_almoco}`);
      const saidaAlmoco = new Date(`2000-01-01T${record.saida_almoco}`);
      almocoTime = saidaAlmoco.getTime() - entradaAlmoco.getTime();
    }
    
    const totalMs = saida.getTime() - entrada.getTime() - almocoTime;
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'all'
    });
  };

  if (isLoading) {
    return (
      <RequireEntity entityName="time_records" action="read">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 animate-spin" />
              <span>Carregando histórico de marcações...</span>
            </div>
          </div>
        </div>
      </RequireEntity>
    );
  }

  if (error) {
    return (
      <RequireEntity entityName="time_records" action="read">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Erro ao carregar histórico de marcações</p>
              <p className="text-sm text-gray-500 mt-2">Tente novamente em alguns instantes</p>
            </div>
          </div>
        </div>
      </RequireEntity>
    );
  }

  return (
    <RequireEntity entityName="time_records" action="read">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Marcações</h1>
          <p className="text-gray-600">
            Visualize todas as suas marcações de ponto
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de marcações */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Marcações</CardTitle>
            <CardDescription>
              {timeRecords && timeRecords.length > 0 
                ? `${timeRecords.length} marcação(ões) encontrada(s) no período selecionado`
                : 'Nenhuma marcação encontrada no período selecionado'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeRecords && timeRecords.length > 0 ? (
              <div className="space-y-4">
                {timeRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {format(new Date(record.data_registro), 'dd/MM/yyyy', { locale: ptBR })}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {format(new Date(record.created_at), 'HH:mm', { locale: ptBR })} - 
                            Última atualização
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <Badge className={getStatusColor(record.status)}>
                          {getStatusLabel(record.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Horários */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock3 className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Início Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Fim Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock4 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada_extra1)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida_extra1)}
                        </div>
                      </div>
                    </div>

                    {/* Total de horas e observações */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Total de horas: </span>
                          <span className="font-medium text-gray-900">
                            {calculateTotalHours(record)}
                          </span>
                        </div>
                      </div>
                      
                      {record.observacoes && (
                        <div className="text-sm text-gray-600 max-w-md">
                          <span className="text-gray-500">Observações: </span>
                          <span>{record.observacoes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma marcação encontrada</p>
                <p className="text-sm text-gray-500 mt-2">
                  Ajuste os filtros ou registre suas primeiras marcações
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireEntity>
  );
}
