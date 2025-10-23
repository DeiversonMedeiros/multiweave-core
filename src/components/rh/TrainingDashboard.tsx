import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTrainingNotifications } from '@/hooks/rh/useTrainingNotifications';
import { 
  Calendar, 
  Users, 
  Clock, 
  Award, 
  TrendingUp, 
  Filter, 
  Search, 
  Plus,
  Bell,
  CheckCircle,
  AlertCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  RotateCcw
} from 'lucide-react';
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrainingDashboardProps {
  companyId: string;
  trainings: any[];
  trainingsLoading: boolean;
  trainingsError: string | null;
  onCreateTraining?: () => void;
  // fetchTrainings: () => void; // Removed - only useEffect manages this
}

interface TrainingStats {
  total: number;
  emAndamento: number;
  concluidos: number;
  cancelados: number;
  inscricoesAbertas: number;
  proximosVencimentos: number;
}

export const TrainingDashboard: React.FC<TrainingDashboardProps> = ({ 
  companyId, 
  trainings, 
  trainingsLoading, 
  trainingsError,
  onCreateTraining
  // fetchTrainings // Removed - only useEffect manages this
}) => {
  // Temporarily disable useTrainingNotifications to isolate the loop
  const notificationQueue: any[] = [];
  const notificationHistory: any[] = [];
  const fetchNotificationQueue = () => {};
  const fetchNotificationHistory = () => {};
  const processNotificationQueue = () => {};
  
  // const { 
  //   notificationQueue, 
  //   notificationHistory, 
  //   fetchNotificationQueue, 
  //   fetchNotificationHistory,
  //   processNotificationQueue 
  // } = useTrainingNotifications();


  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stats, setStats] = useState<TrainingStats>({
    total: 0,
    emAndamento: 0,
    concluidos: 0,
    cancelados: 0,
    inscricoesAbertas: 0,
    proximosVencimentos: 0
  });

  useEffect(() => {
    if (companyId) {
      // fetchTrainings(); // Removed - only useEffect in useTraining manages this
      fetchNotificationQueue();
      fetchNotificationHistory();
    }
  }, [companyId, fetchNotificationQueue, fetchNotificationHistory]);

  useEffect(() => {
    calculateStats();
  }, [trainings]);

  const calculateStats = () => {
    if (!trainings) return;

    const now = new Date();
    const nextWeek = addDays(now, 7);

    const stats = trainings.reduce((acc, training) => {
      acc.total++;
      
      switch (training.status) {
        case 'em_andamento':
          acc.emAndamento++;
          break;
        case 'concluido':
          acc.concluidos++;
          break;
        case 'cancelado':
          acc.cancelados++;
          break;
        case 'inscricoes_abertas':
          acc.inscricoesAbertas++;
          break;
      }

      // Check if training is starting soon
      if (isAfter(new Date(training.data_inicio), now) && isBefore(new Date(training.data_inicio), nextWeek)) {
        acc.proximosVencimentos++;
      }

      return acc;
    }, {
      total: 0,
      emAndamento: 0,
      concluidos: 0,
      cancelados: 0,
      inscricoesAbertas: 0,
      proximosVencimentos: 0
    });

    setStats(stats);
  };

  const filteredTrainings = trainings?.filter(training => {
    const matchesSearch = training.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         training.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || training.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || training.categoria === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejado':
        return 'bg-blue-100 text-blue-800';
      case 'inscricoes_abertas':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluido':
        return 'bg-gray-100 text-gray-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planejado':
        return <Clock className="h-4 w-4" />;
      case 'inscricoes_abertas':
        return <Users className="h-4 w-4" />;
      case 'em_andamento':
        return <PlayCircle className="h-4 w-4" />;
      case 'concluido':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyLevel = (training: any) => {
    const now = new Date();
    const startDate = new Date(training.data_inicio);
    const daysUntilStart = differenceInDays(startDate, now);

    if (daysUntilStart < 0) return 'overdue';
    if (daysUntilStart === 0) return 'today';
    if (daysUntilStart <= 3) return 'urgent';
    if (daysUntilStart <= 7) return 'soon';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return 'border-red-500 bg-red-50';
      case 'today':
        return 'border-orange-500 bg-orange-50';
      case 'urgent':
        return 'border-yellow-500 bg-yellow-50';
      case 'soon':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const handleProcessNotifications = async () => {
    try {
      await processNotificationQueue();
      alert('Fila de notificações processada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar notificações:', error);
    }
  };

  if (trainingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Treinamentos</h1>
          <p className="text-gray-600">Gerencie e monitore todos os treinamentos da empresa</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleProcessNotifications} variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Processar Notificações
          </Button>
          <Button onClick={onCreateTraining}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Treinamento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Treinamentos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.emAndamento} em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscrições Abertas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.inscricoesAbertas}</div>
            <p className="text-xs text-muted-foreground">
              Treinamentos com vagas disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.concluidos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Vencimentos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.proximosVencimentos}</div>
            <p className="text-xs text-muted-foreground">
              Iniciam nos próximos 7 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar treinamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="inscricoes_abertas">Inscrições Abertas</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="seguranca">Segurança</SelectItem>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="comportamental">Comportamental</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                size="sm"
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                size="sm"
              >
                Lista
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Alert */}
      {notificationQueue && notificationQueue.length > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Você tem {notificationQueue.length} notificações pendentes na fila. 
            <Button 
              variant="link" 
              onClick={handleProcessNotifications}
              className="p-0 h-auto ml-2"
            >
              Processar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Trainings Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredTrainings.map((training) => {
          const urgency = getUrgencyLevel(training);
          const urgencyColor = getUrgencyColor(urgency);
          
          return (
            <Card key={training.id} className={`${urgencyColor} transition-all hover:shadow-lg`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{training.nome}</CardTitle>
                    <CardDescription>{training.descricao}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(training.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(training.status)}
                      {training.status.replace('_', ' ')}
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Data de Início</p>
                    <p className="font-medium">
                      {format(new Date(training.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Carga Horária</p>
                    <p className="font-medium">{training.carga_horaria}h</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Modalidade</p>
                    <p className="font-medium capitalize">{training.modalidade}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Vagas</p>
                    <p className="font-medium">
                      {training.vagas_disponiveis || 0} / {training.vagas_totais || '∞'}
                    </p>
                  </div>
                </div>

                {training.vagas_totais && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ocupação</span>
                      <span>
                        {Math.round(((training.vagas_totais - (training.vagas_disponiveis || 0)) / training.vagas_totais) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={((training.vagas_totais - (training.vagas_disponiveis || 0)) / training.vagas_totais) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Ver Detalhes
                    </Button>
                    <Button size="sm" variant="outline">
                      <Bell className="h-4 w-4 mr-1" />
                      Notificações
                    </Button>
                  </div>
                  {urgency === 'urgent' && (
                    <Badge variant="destructive" className="animate-pulse">
                      Urgente
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTrainings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum treinamento encontrado
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar treinamentos.'
                : 'Comece criando seu primeiro treinamento.'}
            </p>
            <Button onClick={onCreateTraining}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Treinamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
