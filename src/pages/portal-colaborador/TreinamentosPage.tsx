import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Award,
  User,
  Briefcase,
  Globe,
  Calendar,
  Filter,
  ArrowRight
} from 'lucide-react';
import { OnlineTrainingService } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { RequireModule } from '@/components/RequireAuth';
import { cn } from '@/lib/utils';

interface TrainingCardData {
  training: any;
  assignment: any;
  progress?: {
    total_content: number;
    completed_content: number;
    progress_percent: number;
    total_time_minutes: number;
    time_watched_seconds: number;
    time_watched_minutes: number;
  };
  deadline?: string;
}

export default function TreinamentosPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'position' | 'public'>('all');

  // Buscar employee_id do usuário
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  // Buscar treinamentos disponíveis
  const { data: trainingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['available-trainings', employeeId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !employeeId) return null;
      return await OnlineTrainingService.getAvailableTrainingsForEmployee(
        selectedCompany.id,
        employeeId
      );
    },
    enabled: !!selectedCompany?.id && !!employeeId && !!employee
  });

  // Filtrar treinamentos baseado na busca e aba ativa
  const filteredTrainings = () => {
    if (!trainingsData) return { assigned: [], byPosition: [], public: [] };

    let trainings: TrainingCardData[] = [];

    if (activeTab === 'all') {
      trainings = [
        ...trainingsData.assigned,
        ...trainingsData.byPosition,
        ...trainingsData.public
      ];
    } else if (activeTab === 'assigned') {
      trainings = trainingsData.assigned;
    } else if (activeTab === 'position') {
      trainings = trainingsData.byPosition;
    } else if (activeTab === 'public') {
      trainings = trainingsData.public;
    }

    // Remover duplicatas (mesmo treinamento pode aparecer em múltiplas categorias)
    const uniqueTrainings = trainings.filter(
      (t, index, self) => index === self.findIndex((tr) => tr.training.id === t.training.id)
    );

    // Filtrar por termo de busca
    if (searchTerm) {
      return uniqueTrainings.filter(
        (t) =>
          t.training.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.training.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return uniqueTrainings;
  };

  const handleStartTraining = async (trainingId: string) => {
    if (!selectedCompany?.id || !employeeId) {
      toast({
        title: 'Erro',
        description: 'Não foi possível identificar o funcionário.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se já existe inscrição
    try {
      const enrollments = await OnlineTrainingService.getProgress(
        selectedCompany.id,
        trainingId,
        employeeId
      );

      // Se não tem progresso, criar inscrição
      if (enrollments.length === 0) {
        // Criar enrollment através do EntityService
        const { EntityService } = await import('@/services/generic/entityService');
        await EntityService.create({
          schema: 'rh',
          table: 'training_enrollments',
          companyId: selectedCompany.id,
          data: {
            company_id: selectedCompany.id,
            training_id: trainingId,
            employee_id: employeeId,
            status: 'inscrito',
            is_active: true
          }
        });
      }

      // Navegar para a página do treinamento
      navigate(`/portal-colaborador/treinamentos/${trainingId}`);
    } catch (err: any) {
      console.error('Erro ao iniciar treinamento:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível iniciar o treinamento.',
        variant: 'destructive'
      });
    }
  };

  const getTrainingStatus = (training: TrainingCardData) => {
    const progress = training.progress;
    if (!progress) return { status: 'not_started', label: 'Não Iniciado', color: 'gray' };
    
    if (progress.progress_percent >= 100) {
      return { status: 'completed', label: 'Concluído', color: 'green' };
    } else if (progress.progress_percent > 0) {
      return { status: 'in_progress', label: 'Em Andamento', color: 'blue' };
    }
    return { status: 'not_started', label: 'Não Iniciado', color: 'gray' };
  };

  const isDeadlineNear = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysDiff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0;
  };

  const isDeadlineOverdue = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    return deadlineDate < today;
  };

  if (isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do funcionário...</p>
        </div>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Funcionário não encontrado. Entre em contato com o RH.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const trainings = filteredTrainings();
  const assignedCount = trainingsData?.assigned.length || 0;
  const positionCount = trainingsData?.byPosition.length || 0;
  const publicCount = trainingsData?.public.length || 0;
  const totalCount = assignedCount + positionCount + publicCount;

  return (
    <RequireModule module="portal_colaborador" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Treinamentos Online
            </h1>
            <p className="text-muted-foreground mt-1">
              Acesse seus treinamentos atribuídos, por cargo e públicos
            </p>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">Treinamentos disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atribuídos</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedCount}</div>
              <p className="text-xs text-muted-foreground">Para você</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Cargo</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positionCount}</div>
              <p className="text-xs text-muted-foreground">Do seu cargo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Públicos</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publicCount}</div>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar treinamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs e Lista de Treinamentos */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Todos ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="assigned">
              <User className="h-4 w-4 mr-2" />
              Atribuídos ({assignedCount})
            </TabsTrigger>
            <TabsTrigger value="position">
              <Briefcase className="h-4 w-4 mr-2" />
              Por Cargo ({positionCount})
            </TabsTrigger>
            <TabsTrigger value="public">
              <Globe className="h-4 w-4 mr-2" />
              Públicos ({publicCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando treinamentos...</p>
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Erro ao carregar treinamentos. Tente novamente mais tarde.
                </AlertDescription>
              </Alert>
            ) : trainings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum treinamento encontrado</h3>
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? 'Tente ajustar sua busca.'
                        : 'Não há treinamentos disponíveis no momento.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainings.map((trainingData) => {
                  const { training, progress, deadline } = trainingData;
                  const status = getTrainingStatus(trainingData);
                  const deadlineNear = isDeadlineNear(deadline);
                  const deadlineOverdue = isDeadlineOverdue(deadline);

                  return (
                    <Card
                      key={training.id}
                      className={cn(
                        'hover:shadow-lg transition-shadow',
                        deadlineOverdue && 'border-red-200 bg-red-50/50'
                      )}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg line-clamp-2 mb-2">
                              {training.nome}
                            </CardTitle>
                            {training.descricao && (
                              <CardDescription className="line-clamp-2">
                                {training.descricao}
                              </CardDescription>
                            )}
                          </div>
                          <Badge
                            variant={
                              status.status === 'completed'
                                ? 'default'
                                : status.status === 'in_progress'
                                ? 'secondary'
                                : 'outline'
                            }
                            className={cn(
                              status.status === 'completed' && 'bg-green-500',
                              status.status === 'in_progress' && 'bg-blue-500'
                            )}
                          >
                            {status.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {status.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
                            {status.label}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Informações do Treinamento */}
                        <div className="space-y-2 text-sm">
                          {training.carga_horaria && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{training.carga_horaria}h de carga horária</span>
                            </div>
                          )}
                          {deadline && (
                            <div
                              className={cn(
                                'flex items-center gap-2',
                                deadlineOverdue
                                  ? 'text-red-600 font-medium'
                                  : deadlineNear
                                  ? 'text-orange-600 font-medium'
                                  : 'text-muted-foreground'
                              )}
                            >
                              <Calendar className="h-4 w-4" />
                              <span>
                                Prazo:{' '}
                                {deadlineOverdue
                                  ? `Vencido em ${new Date(deadline).toLocaleDateString('pt-BR')}`
                                  : deadlineNear
                                  ? `Vence em ${new Date(deadline).toLocaleDateString('pt-BR')}`
                                  : new Date(deadline).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progresso */}
                        {progress && progress.progress_percent > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progresso</span>
                              <span className="font-medium">
                                {Math.round(progress.progress_percent)}%
                              </span>
                            </div>
                            <Progress value={progress.progress_percent} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {progress.completed_content} de {progress.total_content} aulas
                              concluídas
                            </div>
                          </div>
                        )}

                        {/* Badge de Certificado */}
                        {status.status === 'completed' && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Award className="h-4 w-4" />
                            <span>Certificado disponível</span>
                          </div>
                        )}

                        {/* Botão de Ação */}
                        <Button
                          className="w-full"
                          variant={status.status === 'completed' ? 'outline' : 'default'}
                          onClick={() => handleStartTraining(training.id)}
                        >
                          {status.status === 'completed' ? (
                            <>
                              <Award className="h-4 w-4 mr-2" />
                              Ver Certificado
                            </>
                          ) : status.status === 'in_progress' ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Continuar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Iniciar Treinamento
                            </>
                          )}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>

                        {/* Alerta de Prazo */}
                        {deadlineOverdue && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Prazo de conclusão vencido. Conclua o quanto antes.
                            </AlertDescription>
                          </Alert>
                        )}
                        {deadlineNear && !deadlineOverdue && (
                          <Alert className="mt-2 border-orange-200 bg-orange-50">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-xs text-orange-800">
                              Prazo de conclusão próximo. Finalize em breve.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RequireModule>
  );
}
