import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  Award, 
  Users, 
  TrendingUp,
  Clock,
  BarChart3
} from 'lucide-react';
import { useTrainingDashboard } from '@/hooks/rh/useOnlineTraining';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OnlineTrainingDashboardProps {
  companyId: string;
  trainingId?: string;
}

export const OnlineTrainingDashboard: React.FC<OnlineTrainingDashboardProps> = ({
  companyId,
  trainingId
}) => {
  const { stats, loading, error, refresh } = useTrainingDashboard(trainingId);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erro ao carregar estatísticas: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const {
    total_trainings,
    trainings_to_start,
    trainings_in_progress,
    trainings_completed,
    total_enrollments,
    total_certificates,
    avg_completion_rate,
    avg_reaction_score
  } = stats;

  // Calcular percentuais
  const toStartPercent = total_enrollments > 0 
    ? (trainings_to_start / total_enrollments) * 100 
    : 0;
  const inProgressPercent = total_enrollments > 0 
    ? (trainings_in_progress / total_enrollments) * 100 
    : 0;
  const completedPercent = total_enrollments > 0 
    ? (trainings_completed / total_enrollments) * 100 
    : 0;

  const statCards = [
    {
      title: 'Total de Treinamentos',
      value: total_trainings,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Treinamentos online cadastrados'
    },
    {
      title: 'A Iniciar',
      value: trainings_to_start,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Inscrições sem progresso',
      percent: toStartPercent
    },
    {
      title: 'Em Andamento',
      value: trainings_in_progress,
      icon: PlayCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Treinamentos em progresso',
      percent: inProgressPercent
    },
    {
      title: 'Finalizados',
      value: trainings_completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Treinamentos concluídos',
      percent: completedPercent
    },
    {
      title: 'Total de Inscrições',
      value: total_enrollments,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Inscrições realizadas'
    },
    {
      title: 'Certificados Emitidos',
      value: total_certificates,
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Certificados válidos'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                {stat.percent !== undefined && (
                  <div className="mt-3">
                    <Progress value={stat.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.percent.toFixed(1)}% do total
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Métricas de desempenho */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Taxa de Conclusão
            </CardTitle>
            <CardDescription>
              Percentual médio de conclusão dos treinamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Taxa Média</span>
                  <span className="text-2xl font-bold">{avg_completion_rate.toFixed(1)}%</span>
                </div>
                <Progress value={avg_completion_rate} className="h-3" />
              </div>
              <div className="text-sm text-muted-foreground">
                Baseado em {total_enrollments} inscrições
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Avaliação de Reação
            </CardTitle>
            <CardDescription>
              Média das avaliações dos participantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Nota Média</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{avg_reaction_score.toFixed(1)}</span>
                    <Badge variant="outline">/ 5.0</Badge>
                  </div>
                </div>
                <Progress value={(avg_reaction_score / 5) * 100} className="h-3" />
              </div>
              <div className="text-sm text-muted-foreground">
                Baseado nas avaliações de reação dos participantes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo visual */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Status</CardTitle>
          <CardDescription>
            Visão geral do status dos treinamentos por usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span>A Iniciar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{trainings_to_start}</span>
                  <span className="text-muted-foreground">({toStartPercent.toFixed(1)}%)</span>
                </div>
              </div>
              <Progress value={toStartPercent} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-blue-600" />
                  <span>Em Andamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{trainings_in_progress}</span>
                  <span className="text-muted-foreground">({inProgressPercent.toFixed(1)}%)</span>
                </div>
              </div>
              <Progress value={inProgressPercent} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Finalizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{trainings_completed}</span>
                  <span className="text-muted-foreground">({completedPercent.toFixed(1)}%)</span>
                </div>
              </div>
              <Progress value={completedPercent} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



