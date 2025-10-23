import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus, 
  Search, 
  Filter, 
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Play,
  Pause,
  Stop
} from 'lucide-react';
import { useESocialEvents, useESocialBatches, useESocialStats, useProcessESocialEvents } from '@/hooks/rh/useESocialEvents';
import { useCompany } from '@/lib/company-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// PÁGINA DE INTEGRAÇÃO eSOCIAL
// =====================================================

export default function ESocialIntegrationPage() {
  const { selectedCompany } = useCompany();
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    eventType: 'all',
    period: 'all',
    employee: 'all'
  });

  // Estados para abas
  const [activeTab, setActiveTab] = useState('processing');

  // Hooks
  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useESocialEvents(filters);
  const { data: batchesData, isLoading: batchesLoading, refetch: refetchBatches } = useESocialBatches();
  const { data: stats } = useESocialStats();
  const processMutation = useProcessESocialEvents();

  const events = eventsData?.data || [];
  const batches = batchesData?.data || [];

  // =====================================================
  // FUNÇÕES DE FILTRO
  // =====================================================

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      eventType: 'all',
      period: 'all',
      employee: 'all'
    });
  };

  // =====================================================
  // FUNÇÕES DE PROCESSAMENTO
  // =====================================================

  const handleProcessEvents = async () => {
    try {
      const currentPeriod = format(new Date(), 'yyyy-MM');
      await processMutation.mutateAsync({ period: currentPeriod });
    } catch (error) {
      console.error('Erro ao processar eventos:', error);
    }
  };

  const handleSendBatch = async (batchId: string) => {
    try {
      // Simular envio de lote
      console.log('Enviando lote:', batchId);
    } catch (error) {
      console.error('Erro ao enviar lote:', error);
    }
  };

  const handleRetryEvent = async (eventId: string) => {
    try {
      // Simular retry de evento
      console.log('Reenviando evento:', eventId);
    } catch (error) {
      console.error('Erro ao reenviar evento:', error);
    }
  };

  // =====================================================
  // FUNÇÕES DE UTILIDADE
  // =====================================================

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'sending': 'default',
      'sent': 'default',
      'accepted': 'default',
      'rejected': 'destructive',
      'error': 'destructive'
    } as const;

    const labels = {
      'pending': 'Pendente',
      'sending': 'Enviando',
      'sent': 'Enviado',
      'accepted': 'Aceito',
      'rejected': 'Rejeitado',
      'error': 'Erro'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'sending':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'sent':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getEventTypeLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'S-1000': 'Informações do Empregador',
      'S-1005': 'Tabela de Estabelecimentos',
      'S-1010': 'Tabela de Rubricas',
      'S-1020': 'Tabela de Lotações',
      'S-1030': 'Tabela de Cargos',
      'S-1200': 'Remuneração RGPS',
      'S-1202': 'Remuneração RPPS',
      'S-1207': 'Benefícios Previdenciários',
      'S-1210': 'Pagamentos de Rendimentos',
      'S-1250': 'Aquisição de Produção Rural',
      'S-1260': 'Comercialização de Produção Rural',
      'S-1270': 'Contratação de Trabalhadores Avulsos',
      'S-1280': 'Contribuições Consolidadas',
      'S-1295': 'Totalização FGTS',
      'S-1298': 'Reabertura de Eventos',
      'S-1299': 'Fechamento de Eventos',
      'S-1300': 'Contribuição Sindical',
      'S-2190': 'Admissão Preliminar',
      'S-2200': 'Cadastramento Inicial',
      'S-2205': 'Alteração de Dados',
      'S-2206': 'Alteração de Contrato',
      'S-2210': 'Comunicação de Acidente',
      'S-2220': 'Monitoramento da Saúde',
      'S-2230': 'Afastamento Temporário',
      'S-2240': 'Condições Ambientais',
      'S-2241': 'Insalubridade/Periculosidade',
      'S-2250': 'Aviso Prévio',
      'S-2260': 'Convocação Tempo Parcial',
      'S-2298': 'Reintegração',
      'S-2299': 'Desligamento',
      'S-2300': 'Trabalhador Sem Vínculo - Início',
      'S-2306': 'Trabalhador Sem Vínculo - Término',
      'S-2399': 'Alteração Contratual',
      'S-2400': 'Benefícios Previdenciários RPPS',
      'S-3000': 'Exclusão de Eventos',
      'S-3500': 'Processos Judiciais',
      'S-5001': 'Contribuições Sociais',
      'S-5002': 'Contribuições PIS/PASEP',
      'S-5003': 'Contribuições FGTS',
      'S-5011': 'Contribuições PIS/PASEP',
      'S-5012': 'Contribuições FGTS',
      'S-5013': 'Contribuições FGTS'
    };

    return labels[tipo] || tipo;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integração eSocial</h1>
          <p className="text-muted-foreground">
            Processamento e envio de eventos para o eSocial
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessEvents}
            disabled={processMutation.isPending}
            className="flex items-center gap-2"
          >
            {processMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Processar eSocial
          </Button>
          <Button variant="outline" onClick={() => refetchEvents()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Eventos processados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando envio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">
                Processados com sucesso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected + stats.error}</div>
              <p className="text-xs text-muted-foreground">
                Com problemas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tipo, código, funcionário..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="sending">Enviando</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="accepted">Aceito</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Evento</label>
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="S-1000">S-1000 - Informações do Empregador</SelectItem>
                  <SelectItem value="S-1200">S-1200 - Remuneração RGPS</SelectItem>
                  <SelectItem value="S-2200">S-2200 - Cadastramento Inicial</SelectItem>
                  <SelectItem value="S-2299">S-2299 - Desligamento</SelectItem>
                  <SelectItem value="S-5001">S-5001 - Contribuições Sociais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="2024-12">Dezembro 2024</SelectItem>
                  <SelectItem value="2024-11">Novembro 2024</SelectItem>
                  <SelectItem value="2024-10">Outubro 2024</SelectItem>
                  <SelectItem value="2024-09">Setembro 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário</label>
              <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  <SelectItem value="f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb">Deiverson Medeiros</SelectItem>
                  <SelectItem value="8e06f37d-c730-47b7-b0cd-d9c6c455ee32">João Silva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Processamento
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Eventos eSocial
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Lotes de Envio
          </TabsTrigger>
        </TabsList>

        {/* Aba de Processamento */}
        <TabsContent value="processing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  Processamento Automático
                </CardTitle>
                <CardDescription>
                  Configure e execute o processamento automático de eventos eSocial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período de Processamento</label>
                  <Select defaultValue="2024-12">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-12">Dezembro 2024</SelectItem>
                      <SelectItem value="2024-11">Novembro 2024</SelectItem>
                      <SelectItem value="2024-10">Outubro 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipos de Evento</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">S-1000 - Informações do Empregador</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">S-1200 - Remuneração RGPS</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">S-2200 - Cadastramento Inicial</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">S-2299 - Desligamento</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleProcessEvents} disabled={processMutation.isPending} className="flex-1">
                    {processMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Processar
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Status do Processamento
                </CardTitle>
                <CardDescription>
                  Acompanhe o progresso do processamento atual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Eventos Processados</span>
                    <span>0 / 0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Lotes Enviados</span>
                    <span>0 / 0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Última execução: Nunca
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Pause className="mr-2 h-4 w-4" />
                    Pausar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Stop className="mr-2 h-4 w-4" />
                    Parar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba de Eventos */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos eSocial</CardTitle>
              <CardDescription>
                {events.length} evento(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Carregando eventos...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum evento encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Evento</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{event.tipo_evento}</div>
                            <div className="text-sm text-muted-foreground">
                              {getEventTypeLabel(event.tipo_evento)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{event.numero_recibo || '-'}</TableCell>
                        <TableCell>
                          {event.employee_id ? 'Funcionário ID: ' + event.employee_id : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(event.status)}
                            {getStatusBadge(event.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.numero_recibo || '-'}
                        </TableCell>
                        <TableCell>
                          {event.data_envio 
                            ? format(new Date(event.data_envio), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {event.status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleRetryEvent(event.id)}>
                                <Upload className="h-4 w-4" />
                              </Button>
                            )}
                            {event.status === 'error' && (
                              <Button variant="outline" size="sm" onClick={() => handleRetryEvent(event.id)}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            {event.xml_response && (
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Lotes */}
        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lotes de Envio</CardTitle>
              <CardDescription>
                {batches.length} lote(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Carregando lotes...</p>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum lote encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número do Lote</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Total de Eventos</TableHead>
                      <TableHead>Enviados</TableHead>
                      <TableHead>Aceitos</TableHead>
                      <TableHead>Rejeitados</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batch_number}</TableCell>
                        <TableCell>{batch.period}</TableCell>
                        <TableCell>{batch.total_events}</TableCell>
                        <TableCell>{batch.sent_events}</TableCell>
                        <TableCell>{batch.accepted_events}</TableCell>
                        <TableCell>{batch.rejected_events}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(batch.status)}
                            {getStatusBadge(batch.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {batch.sent_at 
                            ? format(new Date(batch.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {batch.status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleSendBatch(batch.id)}>
                                <Upload className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
